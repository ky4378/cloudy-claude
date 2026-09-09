import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Stripe webhook entry point. Lives in the V8 runtime (http actions can't be
 * defined in "use node" modules) and hands the raw payload + signature to the
 * Node action `stripe:processWebhook`, which verifies the signature with the
 * Stripe SDK and mirrors the subscription state into Convex.
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }
  const body = await request.text();

  // `internal.stripe` is a Node-runtime module; this environment's generated
  // API types refresh on the next background codegen pass, so cast here.
  // Runtime resolution is unaffected — this only silences the stale types.
  const processWebhook = (internal as any).stripe.processWebhook;
  const res = await ctx.runAction(processWebhook, {
    body,
    signature,
  });

  if (!res.ok) {
    return new Response(res.message ?? "Webhook processing failed", {
      status: 500,
    });
  }
  return new Response("ok", { status: 200 });
});
