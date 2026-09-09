import { query } from "./_generated/server";

/**
 * Whether the Stripe env vars are set. Lives outside the Node-runtime
 * stripe.ts (queries can't be defined in "use node" modules). Used by the
 * onboarding payment step so it can show a dev-mode "payments not connected
 * yet" bypass instead of a broken paywall when keys are missing. Only exposes
 * a boolean — never the secret itself.
 */
export const status = query({
  args: {},
  handler: () => ({ configured: Boolean(process.env.STRIPE_SECRET_KEY) }),
});
