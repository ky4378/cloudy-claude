/**
 * Cloudy AI — Stripe billing.
 *
 * Monthly subscriptions with automatic renewal. Cloudy charges the customer
 * every month until they cancel — and cancellations are honored only when
 * requested at least 2 days before the next renewal date (see
 * CANCEL_CUTOFF_MS in ./billing). If they cancel inside the 2-day window,
 * the next month's charge still applies and the subscription ends after it.
 *
 * Keys (managed in the Freebuff Keys tab, never shipped to the browser):
 *   STRIPE_SECRET_KEY       — sk_live_… / sk_test_…
 *   STRIPE_WEBHOOK_SECRET   — whsec_… from the webhook endpoint
 *
 * Webhook URL: <your convex deployment URL>/http/stripe-webhook
 * Events handled: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 */

"use node";

import Stripe from "stripe";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { CANCEL_CUTOFF_MS } from "./billing";
import { SUPPORTED_CURRENCIES, usdToMinor } from "./lib/fx";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ---------------------------------------------------------------------------
// Plan catalog
// ---------------------------------------------------------------------------

export const PLANS = {
  starter: { name: "Starter", amount: 1900 },
  growth: { name: "Growth", amount: 2800 },
  pro: { name: "Pro", amount: 5500 },
} as const;

export type PlanId = keyof typeof PLANS;

const priceOverride = (plan: PlanId): string | undefined =>
  plan === "starter"
    ? process.env.STRIPE_PRICE_STARTER
    : plan === "growth"
      ? process.env.STRIPE_PRICE_GROWTH
      : process.env.STRIPE_PRICE_PRO;

const getStripe = (): Stripe => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe isn't configured yet — add STRIPE_SECRET_KEY in the Keys tab.",
    );
  }
  return new Stripe(STRIPE_SECRET_KEY);
};

/**
 * Resolve a plan to a single multi-currency Stripe price. Prefers the
 * STRIPE_PRICE_* env overrides; otherwise finds (or lazily creates) a
 * "Cloudy <Plan>" product with a monthly price anchored in USD (the plan's
 * list price) that carries a `currency_options` map with the converted
 * amount for every currency Stripe supports.
 *
 * When the customer opens Checkout, Stripe detects their region and
 * automatically presents — and charges — the price in their local currency,
 * so the order summary the customer sees (e.g. "Total (SGD) SG$…") is
 * exactly what they pay. Renewals keep the same currency and amount.
 */
async function localizedPriceId(stripe: Stripe, plan: PlanId): Promise<string> {
  const meta = PLANS[plan];
  const override = priceOverride(plan);
  if (override) return override;

  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((p) => p.name === `Cloudy ${meta.name} v2`);
  if (!product) {
    product = await stripe.products.create({
      name: `Cloudy ${meta.name} v2`,
      metadata: { plan },
    });
  }

  // Reuse the existing localized monthly price while the USD anchor hasn't
  // drifted; otherwise create a fresh one so local amounts stay accurate.
  const prices = await stripe.prices.list({
    product: product.id,
    limit: 100,
    active: true,
  });
  const existing = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.currency === "usd" &&
      p.metadata?.localized === "1",
  );
  if (existing) {
    const current = existing.unit_amount ?? meta.amount;
    const drift = Math.abs(current - meta.amount) / meta.amount;
    if (drift < 0.05) return existing.id;
  }

  // Convert the USD price into every Stripe-supported currency at today's
  // rate (the fx module caches the whole rate table for 12h). Currencies
  // without a rate simply fall back to the USD anchor in Checkout.
  const currencyOptions: Record<string, { unit_amount: number }> = {};
  const converted = await Promise.all(
    [...SUPPORTED_CURRENCIES]
      .filter((c) => c !== "USD")
      .map(async (c) => {
        const minor = await usdToMinor(meta.amount / 100, c);
        return [c, minor] as const;
      }),
  );
  for (const [c, minor] of converted) {
    if (minor !== null && minor >= 1) {
      currencyOptions[c.toLowerCase()] = { unit_amount: minor };
    }
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: meta.amount,
    currency: "usd",
    recurring: { interval: "month" },
    currency_options: currencyOptions,
    metadata: { plan, localized: "1" },
  });
  return price.id;
}

const planFromAmount = (amount: number | null | undefined): string =>
  amount === 2800 ? "growth" : amount === 5500 ? "pro" : "starter";

// ---------------------------------------------------------------------------
// Checkout + portal
// ---------------------------------------------------------------------------

/** Start a Stripe Checkout session for a subscription. Returns the redirect URL. */
export const createCheckout = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("pro")),
    origin: v.string(),
    /** Where to send the customer after checkout (default: /billing). */
    redirectTo: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { plan, origin, redirectTo },
  ): Promise<{ url: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    // The business may not exist yet: the questionnaire answers are only
    // saved to the database AFTER payment is confirmed, so non-payers leave
    // no data behind. Checkout works with just a signed-in user — the session
    // is keyed to the user id, and the business gets created on return.
    const business = await ctx.runQuery(
      internal.businesses.getBusinessByUser,
      { userId },
    );
    const businessId = business?._id;

    // The price is multi-currency: Stripe detects the customer's region and
    // presents + charges the plan in their local currency automatically.
    const stripe = getStripe();
    const price = await localizedPriceId(stripe, plan);

    // Reuse the Stripe customer if this user already has one.
    const existing = await ctx.runQuery(internal.billing.getSubscriptionByUser, {
      userId,
    });
    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const email = await ctx.runQuery(internal.billing.getUserEmail, { userId });
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: {
          userId,
          ...(businessId ? { businessId } : {}),
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      // Top-level session metadata is echoed back on the returned session, so
      // verifyCheckout can confirm the session belongs to the caller even
      // before a business exists.
      metadata: { userId },
      subscription_data: {
        metadata: {
          userId,
          plan,
          ...(businessId ? { businessId } : {}),
        },
      },
      client_reference_id: businessId ?? userId,
      // {CHECKOUT_SESSION_ID} is replaced by Stripe with the real session id,
      // which the onboarding page uses to verify the payment server-side on
      // return (see verifyCheckout) so generation never waits on the webhook.
      success_url: `${origin}${redirectTo ?? "/dashboard/billing"}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${redirectTo ?? "/dashboard/billing"}?checkout=cancelled`,
      allow_promotion_codes: true,
    });
    return { url: session.url ?? "" };
  },
});

/**
 * Called when Stripe redirects the customer back after payment (the success
 * URL carries the session id). Verifies the charge server-side and syncs the
 * subscription into Convex immediately — so "payment succeeded → plan
 * generates" doesn't depend on the webhook arriving. The webhook still
 * handles renewals, cancellations and updates.
 */
export const verifyCheckout = action({
  args: { sessionId: v.string() },
  handler: async (
    ctx,
    { sessionId },
  ): Promise<{ ok: boolean; paid: boolean; plan?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      console.error("verifyCheckout: no auth user");
      return { ok: false, paid: false };
    }
    if (!STRIPE_SECRET_KEY) {
      console.error("verifyCheckout: no stripe secret key");
      return { ok: false, paid: false };
    }
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        console.error("verifyCheckout: session not found", sessionId);
        return { ok: false, paid: false };
      }
      if (session.mode !== "subscription" || !session.subscription) {
        console.warn("verifyCheckout: not a subscription session");
        return { ok: true, paid: false };
      }
      // Ownership check: new sessions are keyed to the caller's user id in
      // top-level metadata. Legacy sessions (created before that change) are
      // keyed to a business id instead — verify that business belongs to the
      // caller.
      const sessionUserId = session.metadata?.userId;
      if (sessionUserId) {
        if (sessionUserId !== userId) {
          console.error("verifyCheckout: session user mismatch", sessionUserId, userId);
          return { ok: false, paid: false };
        }
      } else {
        const businessId = session.client_reference_id as
          | Id<"businesses">
          | undefined;
        if (businessId) {
          const business = await ctx.runQuery(
            internal.businesses.getBusinessById,
            { id: businessId },
          );
          if (!business || business.userId !== userId) {
            console.error("verifyCheckout: business ownership check failed");
            return { ok: false, paid: false };
          }
        }
      }
      const paid = session.payment_status === "paid";
      if (paid) {
        try {
          const sub = (await stripe.subscriptions.retrieve(
            session.subscription as string,
          )) as unknown as SubscriptionSnapshot;
          await syncSubscription(ctx, sub);
          console.log("verifyCheckout: subscription synced successfully");
        } catch (syncErr) {
          console.error("verifyCheckout: sync failed", syncErr instanceof Error ? syncErr.message : syncErr);
          return { ok: false, paid: false };
        }
      }
      return { ok: true, paid };
    } catch (err) {
      console.error("verifyCheckout: error", err instanceof Error ? err.message : err);
      return { ok: false, paid: false };
    }
  },
});

/** Stripe Billing Portal — update card, view invoices, etc. */
export const createPortalSession = action({
  args: { origin: v.string() },
  handler: async (ctx, { origin }): Promise<{ url: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, {
      userId,
    });
    if (!sub?.stripeCustomerId) throw new Error("No subscription found");

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/billing`,
    });
    return { url: session.url };
  },
});

/**
 * Cancel the subscription. Honored only when requested at least 2 days before
 * the next charge — otherwise the next month's charge still applies.
 */
export const requestCancellation = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { ok: true; already: boolean; endsOn: number | null }
    | { ok: false; reason: "tooLate"; renewsOn: number; cancelAvailableOn: number }
  > => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, {
      userId,
    });
    if (!sub?.stripeSubscriptionId) throw new Error("No active subscription");

    let renewsOn = sub.currentPeriodEnd ?? null;
    if (renewsOn === null) {
      // Same estimate as billing.getSubscription — one month after the
      // period start (or creation) when Stripe period data is missing.
      const base = sub.currentPeriodStart ?? sub.createdAt ?? Date.now();
      const est = new Date(base);
      est.setMonth(est.getMonth() + 1);
      renewsOn = est.getTime();
    }
    const now = Date.now();

    // Inside the 2-day window: too late for next month's charge.
    if (now >= renewsOn - CANCEL_CUTOFF_MS) {
      return {
        ok: false,
        reason: "tooLate",
        renewsOn,
        cancelAvailableOn: renewsOn,
      };
    }
    if (sub.cancelAtPeriodEnd) {
      return { ok: true, already: true, endsOn: renewsOn };
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await ctx.runMutation(internal.billing.patchSubscription, {
      id: sub._id,
      data: { cancelAtPeriodEnd: true, updatedAt: Date.now() },
    });
    return { ok: true, already: false, endsOn: renewsOn };
  },
});

/** Un-cancel a subscription that is set to end at the period boundary. */
export const resumeSubscription = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, {
      userId,
    });
    if (!sub?.stripeSubscriptionId) throw new Error("No subscription found");
    if (!sub.cancelAtPeriodEnd) return { ok: true, already: true };

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await ctx.runMutation(internal.billing.patchSubscription, {
      id: sub._id,
      data: { cancelAtPeriodEnd: false, updatedAt: Date.now() },
    });
    return { ok: true, already: false };
  },
});

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

type ActionHandler = Extract<
  Parameters<typeof action>[0],
  { handler: unknown }
>["handler"];
type ActionCtx = Parameters<ActionHandler>[0];

/**
 * The slice of a Stripe subscription we mirror into Convex. Typed
 * structurally (snake_case, as the API sends it) so the webhook doesn't
 * depend on the exact version of the SDK's Subscription type.
 */
interface SubscriptionSnapshot {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start?: number;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { unit_amount?: number | null } }[] };
}

async function syncSubscription(
  ctx: ActionCtx,
  sub: SubscriptionSnapshot,
): Promise<void> {
  const customerId = sub.customer as string;
  const userId = sub.metadata?.userId as Id<"users"> | undefined;
  const businessId = sub.metadata?.businessId as Id<"businesses"> | undefined;
  const plan =
    sub.metadata?.plan ??
    planFromAmount(sub.items?.data?.[0]?.price?.unit_amount);
  await ctx.runMutation(internal.billing.upsertSubscriptionByCustomer, {
    customerId,
    data: {
      userId,
      businessId,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: sub.current_period_start
        ? sub.current_period_start * 1000
        : undefined,
      currentPeriodEnd: sub.current_period_end
        ? sub.current_period_end * 1000
        : undefined,
      updatedAt: Date.now(),
    },
  });
}

/**
 * Called by the /stripe-webhook http route (see ./stripeWebhook.ts, which
 * lives in the V8 runtime). Signature verification + Stripe SDK calls need
 * Node.js, so the actual processing happens in this action.
 */
export const processWebhook = action({
  args: { body: v.string(), signature: v.string() },
  handler: async (
    ctx: ActionCtx,
    { body, signature },
  ): Promise<{ ok: boolean; message?: string }> => {
    if (!STRIPE_WEBHOOK_SECRET) {
      return {
        ok: false,
        message:
          "Webhook secret not configured — add STRIPE_WEBHOOK_SECRET in the Keys tab.",
      };
    }
    const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

    let event: Stripe.Event;
    try {
      // constructEvent only needs the webhook secret, not the API key.
      event = new Stripe("sk_placeholder").webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return {
        ok: false,
        message: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.mode !== "subscription" || !session.subscription) break;
          if (stripe) {
            const sub = (await stripe.subscriptions.retrieve(
              session.subscription as string,
            )) as unknown as SubscriptionSnapshot;
            await syncSubscription(ctx, sub);
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          await syncSubscription(
            ctx,
            event.data.object as unknown as SubscriptionSnapshot,
          );
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as unknown as SubscriptionSnapshot;
          await ctx.runMutation(internal.billing.upsertSubscriptionByCustomer, {
            customerId: sub.customer,
            data: { status: "canceled", cancelAtPeriodEnd: false },
          });
          break;
        }
      }
    } catch (err) {
      return {
        ok: false,
        message: `Webhook handling failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }

    return { ok: true };
  },
});
