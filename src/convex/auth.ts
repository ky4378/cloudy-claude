// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

// "Good password" rules for sign-up and password reset. Mirrors the live
// strength meter on the sign-up page: at least 8 characters, containing at
// least one letter and one number.
function validatePasswordRequirements(password: string) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(
      "Password must include at least one letter and one number.",
    );
  }
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    emailOtp,
    // Email + password accounts. Passwords are Scrypt-hashed by the library
    // and stored in authAccounts — the app never sees or stores plaintext.
    // Flows: signUp (create account + password), signIn (verify password),
    // reset / reset-verification (forgot-password code + new password).
    Password({
      // Forgot-password codes are sent through the same email OTP pipeline.
      reset: emailOtp,
      // Require email verification on sign-up: the user receives a 6-digit
      // code and must verify it before the questionnaire / dashboard.
      verify: emailOtp,
      validatePasswordRequirements,
      profile: (params) => {
        const email =
          typeof params.email === "string"
            ? params.email.trim().toLowerCase()
            : "";
        const name =
          typeof params.name === "string" ? params.name.trim() : "";
        return {
          email,
          ...(name !== "" ? { name } : {}),
        };
      },
    }),
    Anonymous,
  ],
  callbacks: {
    // Heals orphaned auth rows: an authAccounts row can outlive its users
    // document (e.g. a test user deleted from the Convex dashboard). Without
    // this, signing up with that email fails with "Could not update user
    // document … Update on nonexistent document ID". Mirrors the library's
    // default createOrUpdateUser, except a missing user document is recreated
    // (and the account row relinked) instead of throwing.
    createOrUpdateUser: async (ctx, args) => {
      const {
        provider,
        profile: {
          emailVerified: profileEmailVerified,
          phoneVerified: profilePhoneVerified,
          ...profile
        },
      } = args;
      const emailVerified =
        profileEmailVerified ??
        ((provider.type === "oauth" || provider.type === "oidc") &&
          provider.allowDangerousEmailAccountLinking !== false);
      const phoneVerified = profilePhoneVerified ?? false;

      let userId = args.existingUserId;
      if (userId !== null) {
        const existing = await ctx.db.get(userId);
        if (existing === null) {
          // Orphaned account — drop the stale ID so we create a fresh user.
          // createOrUpdateAccount then relinks the account row to the new ID.
          userId = null;
        }
      }

      // Default linking behavior: a fresh account for an email that already
      // belongs to a verified user links to that user instead of duplicating.
      if (userId === null && typeof profile.email === "string") {
        const shouldLinkViaEmail =
          args.shouldLink === true || emailVerified || provider.type === "email";
        if (shouldLinkViaEmail) {
          const matches = await ctx.db
            .query("users")
            .filter((q) =>
              q.and(
                q.eq(q.field("email"), profile.email as string),
                q.neq(q.field("emailVerificationTime"), undefined),
              ),
            )
            .take(2);
          if (matches.length === 1) userId = matches[0]._id;
        }
      }

      const userData = {
        ...(emailVerified ? { emailVerificationTime: Date.now() } : null),
        ...(phoneVerified ? { phoneVerificationTime: Date.now() } : null),
        ...profile,
      };

      if (userId === null) {
        return ctx.db.insert("users", userData);
      }
      await ctx.db.patch(userId, userData);
      return userId;
    },
  },
});
