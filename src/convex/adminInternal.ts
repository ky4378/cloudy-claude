import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Internal helpers for the admin feedback report. The public-facing
 * `admin.getFeedbackReport` action does the auth/env-var check first and only
 * ever calls these for verified admins.
 */

export type FeedbackSubmission = {
  id: Id<"feedback">;
  rating: number;
  whatWorks: string | null;
  improve: string | null;
  createdAt: number;
  businessName: string;
  location: string | null;
  email: string | null;
};

export type FeedbackReportData = {
  submissions: FeedbackSubmission[];
  summary: {
    count: number;
    averageRating: number | null;
    distribution: Record<number, number>;
    positivePct: number | null;
  };
};

export const promoteToAdmin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { role: "admin" });
  },
});

/**
 * Delete a user and all their related data by email.
 * Used by the admin action `admin.deleteUserByEmail`.
 */
export const deleteUserByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const targetEmail = email.trim().toLowerCase();

    // Find user by email index
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", targetEmail))
      .collect();

    if (users.length === 0) {
      return { deleted: false, reason: "User not found" };
    }

    const user = users[0];
    const userId = user._id;

    // Find all businesses owned by this user
    const businesses = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const businessIds = businesses.map((b) => b._id);

    // Delete posts, coachThreads, feedback, subscriptions, businessMedia for each business
    for (const bid of businessIds) {
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_business", (q) => q.eq("businessId", bid))
        .collect();
      for (const p of posts) await ctx.db.delete(p._id);

      const threads = await ctx.db
        .query("coachThreads")
        .withIndex("by_business", (q) => q.eq("businessId", bid))
        .collect();
      for (const t of threads) await ctx.db.delete(t._id);

      const media = await ctx.db
        .query("businessMedia")
        .withIndex("by_business", (q) => q.eq("businessId", bid))
        .collect();
      for (const m of media) await ctx.db.delete(m._id);

      await ctx.db.delete(bid);
    }

    // Delete feedback for this user
    const feedbackRows = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const f of feedbackRows) await ctx.db.delete(f._id);

    // Delete subscription for this user
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);

    // Delete Convex Auth accounts and sessions for this user.
    // These tables are managed by @convex-dev/auth (authAccounts, authSessions).
    try {
      const allAccounts = await (ctx.db as any)
        .query("authAccounts")
        .collect();
      for (const a of allAccounts) {
        if (a.userId === userId || a.userId?._id === userId) {
          await ctx.db.delete(a._id);
        }
      }
    } catch (_) {
      // table may not exist — ignore
    }

    try {
      const allSessions = await (ctx.db as any)
        .query("authSessions")
        .collect();
      for (const s of allSessions) {
        if (s.userId === userId || s.userId?._id === userId) {
          await ctx.db.delete(s._id);
        }
      }
    } catch (_) {
      // table may not exist — ignore
    }

    // Delete the user record itself
    await ctx.db.delete(userId);

    return { deleted: true, email: targetEmail };
  },
});

export const getFeedbackReportData = internalQuery({
  args: {},
  handler: async (ctx): Promise<FeedbackReportData> => {
    const [feedbackRows, businesses, users] = await Promise.all([
      ctx.db.query("feedback").order("desc").collect(),
      ctx.db.query("businesses").collect(),
      ctx.db.query("users").collect(),
    ]);

    const businessById = new Map(businesses.map((b) => [b._id, b]));
    const userById = new Map(users.map((u) => [u._id, u]));

    const submissions: FeedbackSubmission[] = feedbackRows.map((f) => {
      const business = businessById.get(f.businessId);
      const owner = userById.get(f.userId);
      return {
        id: f._id,
        rating: f.rating,
        whatWorks: f.whatWorks ?? null,
        improve: f.improve ?? null,
        createdAt: f.createdAt,
        businessName: business?.businessName ?? "Unknown business",
        location: business?.location ?? null,
        email: owner?.email ?? null,
      };
    });

    const ratings = submissions.map((s) => s.rating);
    const count = ratings.length;
    const averageRating =
      count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : null;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      number,
      number
    >;
    for (const r of ratings) distribution[r] = (distribution[r] ?? 0) + 1;
    const positivePct =
      count > 0
        ? Math.round((ratings.filter((r) => r >= 4).length / count) * 100)
        : null;

    return {
      submissions,
      summary: { count, averageRating, distribution, positivePct },
    };
  },
});
