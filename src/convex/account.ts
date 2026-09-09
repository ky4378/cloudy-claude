import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Account helpers for the sign-up / log-in pages.
 *
 * An email counts as having an account if either:
 * - it belongs to a verified user (OTP-era accounts — the auth library only
 *   counts an email as an account once verified with a code), or
 * - it has a password credential row in authAccounts (password accounts are
 *   created at sign-up without a separate verification step).
 */

export const emailAccountExists = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
      .first();
    if (user !== null) return true;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", normalized),
      )
      .first();
    return account !== null;
  },
});
