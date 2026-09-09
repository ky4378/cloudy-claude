import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  CREDIT_COSTS,
  FEATURE_LABEL,
  getLimitsFor,
  PLAN_META,
  toPlanId,
  USAGE_FEATURES,
  type PlanId,
  type UsageFeature,
} from "./lib/planLimits";

/**
 * Billing — subscription state + AI usage metering for the signed-in user.
 *
 * Paid rows mirror Stripe (the webhook in stripe.ts pushes state here).
 * Trial rows have no Stripe ids: they are created automatically when
 * CLOUDY_FREE_TRIAL=true is set on the deployment, or when Stripe isn't
 * configured at all, so the product works end-to-end in development and the
 * first plan can be free in production if you choose.
 *
 * This file is deliberately NOT "use node" so queries can live here.
 */

/** Cancellations are honored up to 2 days before the next charge. */
export const CANCEL_CUTOFF_MS = 2 * 24 * 60 * 60 * 1000;

/** Whether users without a paid subscription get a free Starter trial.
 * DISABLED: All users must pay to generate plans. No free trials.
 */
export const freeTrialEnabled = (): boolean => false;

export const featureValidator = v.union(
  v.literal("plans"),
  v.literal("strategy"),
  v.literal("regenerations"),
  v.literal("captions"),
  v.literal("hashtags"),
  v.literal("reelIdeas"),
  v.literal("reelScripts"),
  v.literal("trendAnalysis"),
  v.literal("recommendations"),
  v.literal("coachMessages"),
);

type Subscription = Doc<"subscriptions">;
type Usage = NonNullable<Subscription["usage"]>;

const emptyUsage = (periodStart: number): Usage => ({
  periodStart,
  credits: 0,
  plans: 0,
  strategy: 0,
  regenerations: 0,
  captions: 0,
  hashtags: 0,
  reelIdeas: 0,
  reelScripts: 0,
  trendAnalysis: 0,
  recommendations: 0,
  coachMessages: 0,
});

/** Current-period usage, auto-reset when the billing period rolled over. */
const currentUsage = (sub: Subscription): Usage => {
  const periodStart = sub.currentPeriodStart ?? sub.createdAt;
  const raw = sub.usage as Partial<Usage> | undefined;
  if (!raw || (raw.periodStart ?? 0) < periodStart) return emptyUsage(periodStart);
  // Older rows may lack newer counters — normalise every key to a number.
  const base = emptyUsage(raw.periodStart ?? periodStart);
  for (const key of USAGE_FEATURES) base[key] = Number(raw[key] ?? 0);
  base.credits = Number(raw.credits ?? 0);
  return base;
};

const isLive = (sub: Subscription | null): sub is Subscription =>
  sub !== null && (sub.status === "active" || sub.status === "trialing");

const subscriptionFor = (ctx: QueryCtx | MutationCtx, userId: Id<"users">) =>
  ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const sub = await subscriptionFor(ctx, userId);
    if (!sub) return null;

    const now = Date.now();
    let renewsOn = sub.currentPeriodEnd ?? null;
    if (renewsOn === null) {
      const base = sub.currentPeriodStart ?? sub.createdAt ?? now;
      const est = new Date(base);
      est.setMonth(est.getMonth() + 1);
      renewsOn = est.getTime();
    }
    const withinCutoff = now >= renewsOn - CANCEL_CUTOFF_MS;

    return {
      subscription: {
        plan: sub.plan,
        planName: PLAN_META[toPlanId(sub.plan)].name,
        status: sub.status,
        isTrial: !sub.stripeSubscriptionId,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        currentPeriodStart: sub.currentPeriodStart ?? null,
        currentPeriodEnd: sub.currentPeriodEnd ?? null,
        stripeCustomerId: sub.stripeCustomerId ?? null,
      },
      cutoff: {
        withinCutoff,
        renewsOn,
        cancelAvailableOn: renewsOn,
      },
    };
  },
});

/**
 * The AI-credit meter and per-feature usage for this billing period.
 * Returns null when the user has no subscription yet (the UI then shows the
 * free-trial / choose-a-plan state).
 */
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const sub = await subscriptionFor(ctx, userId);
    if (!sub) {
      return {
        hasSubscription: false as const,
        freeTrialAvailable: freeTrialEnabled(),
        plan: "starter" as PlanId,
        planName: "Starter",
        status: "none",
        isTrial: true,
        limits: getLimitsFor("starter"),
        costs: CREDIT_COSTS,
        credits: { used: 0, limit: getLimitsFor("starter").credits, remaining: getLimitsFor("starter").credits },
        plans: { used: 0, limit: getLimitsFor("starter").plans, remaining: getLimitsFor("starter").plans },
        usage: emptyUsage(Date.now()),
      };
    }
    const plan = toPlanId(sub.plan);
    const limits = getLimitsFor(plan);
    const usage = currentUsage(sub);
    return {
      hasSubscription: true as const,
      freeTrialAvailable: freeTrialEnabled(),
      plan,
      planName: PLAN_META[plan].name,
      status: sub.status,
      isTrial: !sub.stripeSubscriptionId,
      periodStart: usage.periodStart,
      periodEnd: sub.currentPeriodEnd ?? null,
      limits,
      costs: CREDIT_COSTS,
      credits: {
        used: usage.credits,
        limit: limits.credits,
        remaining: Math.max(0, limits.credits - usage.credits),
      },
      plans: {
        used: usage.plans,
        limit: limits.plans,
        remaining: Math.max(0, limits.plans - usage.plans),
      },
      usage,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal helpers — used by Stripe (stripe.ts) and the AI actions
// ---------------------------------------------------------------------------

export const getSubscriptionByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => subscriptionFor(ctx, userId),
});

export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

/** True when the user has an active or trialing subscription. */
export const hasActiveSubscription = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => isLive(await subscriptionFor(ctx, userId)),
});

const clean = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).filter(([, val]) => val !== undefined && val !== null),
  );

/**
 * Upsert a subscription row keyed by Stripe customer id (from webhooks).
 * Falls back to the user's existing (trial) row so a trial upgrading to a
 * paid plan never ends up with two rows.
 */
export const upsertSubscriptionByCustomer = internalMutation({
  args: { customerId: v.string(), data: v.any() },
  handler: async (ctx, { customerId, data }) => {
    const payload = clean(data as Record<string, unknown>);
    let existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("stripeCustomerId", customerId))
      .first();
    if (!existing && typeof payload.userId === "string") {
      existing = await subscriptionFor(ctx, payload.userId as Id<"users">);
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        stripeCustomerId: customerId,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    // Payload is sanitized by clean(); schemaValidation is off for this table.
    return ctx.db.insert("subscriptions", {
      ...payload,
      stripeCustomerId: customerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as never);
  },
});

export const patchSubscription = internalMutation({
  args: { id: v.id("subscriptions"), data: v.any() },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...clean(data), updatedAt: Date.now() });
  },
});

/**
 * Make sure the user has a subscription row. Creates a free Starter trial
 * when trials are enabled and nothing exists yet. Returns the row or null.
 */
const ensureSubscriptionRow = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  businessId?: Id<"businesses">,
): Promise<Subscription | null> => {
  const existing = await subscriptionFor(ctx, userId);
  if (existing) return existing;
  if (!freeTrialEnabled()) return null;
  const now = Date.now();
  const id = await ctx.db.insert("subscriptions", {
    userId,
    businessId,
    plan: "starter",
    status: "trialing",
    cancelAtPeriodEnd: false,
    currentPeriodStart: now,
    currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
    usage: emptyUsage(now),
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
};

export const ensureSubscription = internalMutation({
  args: { userId: v.id("users"), businessId: v.optional(v.id("businesses")) },
  handler: async (ctx, { userId, businessId }) =>
    ensureSubscriptionRow(ctx, userId, businessId),
});

// ---------------------------------------------------------------------------
// Usage enforcement
// ---------------------------------------------------------------------------

/**
 * Check whether the user may run an AI action. `units` scales the credit
 * cost (e.g. 7 for a week of regenerations). Returns { ok } or
 * { ok: false, reason, code }.
 */
export const canUseFeature = internalQuery({
  args: {
    userId: v.id("users"),
    feature: featureValidator,
    units: v.optional(v.number()),
  },
  handler: async (ctx, { userId, feature, units }) => {
    const sub = await subscriptionFor(ctx, userId);
    const n = Math.max(1, units ?? 1);
    if (!sub) {
      if (freeTrialEnabled()) return { ok: true as const };
      return {
        ok: false as const,
        code: "no_subscription" as const,
        reason: "Choose a plan to start generating with Cloudy AI.",
      };
    }
    if (!isLive(sub)) {
      return {
        ok: false as const,
        code: "inactive" as const,
        reason: "Your subscription isn't active. Update billing to keep using Cloudy AI.",
      };
    }
    const limits = getLimitsFor(sub.plan);
    const usage = currentUsage(sub);
    if (feature === "plans" && usage.plans >= limits.plans) {
      return {
        ok: false as const,
        code: "limit" as const,
        reason: `You've used ${usage.plans}/${limits.plans} 30-day plans this month. Upgrade your plan to generate more.`,
      };
    }
    const cost = CREDIT_COSTS[feature as UsageFeature] * n;
    if (usage.credits + cost > limits.credits) {
      return {
        ok: false as const,
        code: "credits" as const,
        reason: `${FEATURE_LABEL[feature as UsageFeature]} needs ${cost} AI credits and you have ${Math.max(
          0,
          limits.credits - usage.credits,
        )} left this month. Upgrade for more credits.`,
      };
    }
    return { ok: true as const };
  },
});

/**
 * Record a successful AI action: deducts credits and increments the feature
 * counter. Creates the free trial row on first use when trials are enabled.
 * Call this AFTER the AI work succeeded.
 */
export const incrementUsage = internalMutation({
  args: {
    userId: v.id("users"),
    feature: featureValidator,
    units: v.optional(v.number()),
    businessId: v.optional(v.id("businesses")),
  },
  handler: async (ctx, { userId, feature, units, businessId }) => {
    const sub = await ensureSubscriptionRow(ctx, userId, businessId);
    if (!sub) return;
    const n = Math.max(1, units ?? 1);
    const usage = currentUsage(sub);
    const key = feature as UsageFeature;
    await ctx.db.patch(sub._id, {
      usage: {
        ...usage,
        credits: usage.credits + CREDIT_COSTS[key] * n,
        [key]: usage[key] + (key === "regenerations" ? n : 1),
      },
      updatedAt: Date.now(),
    });
  },
});
