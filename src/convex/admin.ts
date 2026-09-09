/**
 * Cloudy AI — admin-only helpers.
 *
 * The owner designates themselves (and anyone else) as an admin by listing
 * their account emails in the `ADMIN_EMAILS` Convex environment variable
 * (comma-separated). Only matching accounts can read the feedback inbox; the
 * check runs server-side on the email in the caller's auth token, so it can't
 * be faked from the client.
 */

"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { FeedbackReportData } from "./adminInternal";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type FeedbackReportResult =
  | {
      authorized: false;
      reason: "not_configured" | "not_signed_in" | "not_admin";
    }
  | (FeedbackReportData & { authorized: true });

/**
 * Full feedback report for admins: every submission joined with its business
 * and owner, plus a quick summary (count, average rating, distribution).
 *
 * Returns `{ authorized: false, reason: "not_configured" }` when no admin
 * emails are configured, `{ authorized: false, reason: "not_admin" }` for
 * signed-in users who aren't admins, and the report when authorized.
 */
/**
 * Delete a user by email and all their data. Admin-only.
 */
export const deleteUserByEmail = action({
  args: { email: v.string() },
  handler: async (
    ctx,
    { email },
  ): Promise<{ deleted: boolean; reason?: string; email?: string }> => {
    if (ADMIN_EMAILS.length === 0) {
      return { deleted: false, reason: "ADMIN_EMAILS not configured" };
    }

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { deleted: false, reason: "Not signed in" };
    }

    const user = await ctx.runQuery(api.users.currentUser);
    const callerEmail = (user?.email ?? "").trim().toLowerCase();
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
      return { deleted: false, reason: "Not admin" };
    }

    const result: { deleted: boolean; reason?: string; email?: string } =
      await ctx.runMutation(internal.adminInternal.deleteUserByEmail, {
        email,
      });
    return result;
  },
});

export const getFeedbackReport = action({
  args: {},
  handler: async (ctx): Promise<FeedbackReportResult> => {
    if (ADMIN_EMAILS.length === 0) {
      return { authorized: false, reason: "not_configured" };
    }

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { authorized: false, reason: "not_signed_in" };
    }

    const user = await ctx.runQuery(api.users.currentUser);
    const callerEmail = (user?.email ?? "").trim().toLowerCase();
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
      return { authorized: false, reason: "not_admin" };
    }

    // Mark the account as admin so the sidebar can show the inbox link.
    await ctx.runMutation(internal.adminInternal.promoteToAdmin, { userId });

    const report = await ctx.runQuery(
      internal.adminInternal.getFeedbackReportData,
    );
    return { authorized: true, ...report };
  },
});
