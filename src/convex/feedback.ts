import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Feedback cadence:
// 1. First check-in: 48 hours after the business is created.
// 2. Second check-in: 2 weeks after the first submission.
// 3. Every subsequent check-in: once a month after the last submission.
const FIRST_ASK_DELAY_MS = 48 * 60 * 60 * 1000;          // 48 hours
const SECOND_ASK_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;  // 2 weeks after first submission
const MONTHLY_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;      // 30 days (monthly)

/**
 * Whether the current user's business is due for a feedback check-in.
 * Due = it's been at least a day since signup with no submission yet, or the
 * last submission is more than a month old.
 */
export const feedbackStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return null;
    const submissions = await ctx.db
      .query("feedback")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .order("desc")
      .collect();
    const last = submissions[0] ?? null;
    let due = false;
    if (last === null) {
      // No feedback submitted yet → first ask after 48 hours.
      due = Date.now() - business.createdAt >= FIRST_ASK_DELAY_MS;
    } else if (submissions.length === 1) {
      // After the first submission → second ask after 2 weeks.
      due = Date.now() - last.createdAt >= SECOND_ASK_INTERVAL_MS;
    } else {
      // After the second+ submission → monthly.
      due = Date.now() - last.createdAt >= MONTHLY_INTERVAL_MS;
    }
    return {
      due,
      lastSubmittedAt: last?.createdAt ?? null,
      count: submissions.length,
      createdAt: business.createdAt,
    };
  },
});

/**
 * The user's past feedback submissions (newest first), plus the business
 * signup date so the feedback page can explain the cadence.
 */
export const getMyFeedback = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return null;
    const submissions = await ctx.db
      .query("feedback")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .order("desc")
      .collect();
    return {
      businessName: business.businessName,
      createdAt: business.createdAt,
      submissions: submissions.map((s) => ({
        rating: s.rating,
        whatWorks: s.whatWorks ?? null,
        improve: s.improve ?? null,
        createdAt: s.createdAt,
      })),
    };
  },
});

export const submitFeedback = mutation({
  args: {
    rating: v.number(),
    whatWorks: v.optional(v.string()),
    improve: v.optional(v.string()),
  },
  handler: async (ctx, { rating, whatWorks, improve }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be a whole number between 1 and 5");
    }
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) throw new Error("No business found");
    await ctx.db.insert("feedback", {
      userId,
      businessId: business._id,
      rating,
      whatWorks: whatWorks?.trim() || undefined,
      improve: improve?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});
