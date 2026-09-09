/**
 * Cloudy — granular AI endpoints.
 *
 * Every integration point the product exposes, each one an authenticated,
 * usage-metered Convex action:
 *
 *   1. generateMarketingStrategy  — recommended strategy for the month
 *   2. (30-day content plan)      — see plan.ts: saveBusiness / generateStrategy / regenerateCalendar
 *   3. generateCaptions           — alternative captions for a post
 *   4. generateHashtags           — fresh hashtag set for a post (applied)
 *   5. generateReelIdeas          — filmable Reel concepts
 *   6. generateReelScript         — full script for a post or an idea
 *   7. analyzeTrends              — industry / local trend report
 *   8. generateRecommendations    — prioritized next steps
 *
 * All of them use the owner's questionnaire answers as context (see
 * lib/ai.ts → businessContext) and fall back to the deterministic engine
 * when the AI provider is unavailable.
 */

"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { todayString, type DayPlan } from "./lib/strategy";
import {
  generateCaptionsAI,
  generateHashtagsAI,
  generateRecommendationsAI,
  generateReelIdeasAI,
  generateReelScriptAI,
  generateStrategyAI,
  generateTrendsAI,
  type PlanProgress,
} from "./lib/insights";
import { getLimitsFor } from "./lib/planLimits";
import { toProfile } from "./plan";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const requireBusiness = async (
  ctx: ActionCtx,
  businessId: Id<"businesses">,
): Promise<{ userId: Id<"users">; business: Doc<"businesses"> }> => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const business = await ctx.runQuery(internal.businesses.getBusinessById, { id: businessId });
  if (!business || business.userId !== userId) throw new Error("Business not found");
  return { userId, business };
};

const requirePost = async (
  ctx: ActionCtx,
  postId: Id<"posts">,
): Promise<{ userId: Id<"users">; business: Doc<"businesses">; post: Doc<"posts"> }> => {
  const post = await ctx.runQuery(internal.businesses.getPostById, { id: postId });
  if (!post) throw new Error("Post not found");
  const { userId, business } = await requireBusiness(ctx, post.businessId);
  return { userId, business, post };
};

const guard = async (
  ctx: ActionCtx,
  userId: Id<"users">,
  feature:
    | "strategy"
    | "captions"
    | "hashtags"
    | "reelIdeas"
    | "reelScripts"
    | "trendAnalysis"
    | "recommendations",
) => {
  const check = await ctx.runQuery(internal.billing.canUseFeature, { userId, feature });
  if (!check.ok) throw new Error(check.reason);
};

const charge = (
  ctx: ActionCtx,
  userId: Id<"users">,
  businessId: Id<"businesses">,
  feature:
    | "strategy"
    | "captions"
    | "hashtags"
    | "reelIdeas"
    | "reelScripts"
    | "trendAnalysis"
    | "recommendations",
) => ctx.runMutation(internal.billing.incrementUsage, { userId, feature, businessId });

const limitsFor = async (ctx: ActionCtx, userId: Id<"users">) => {
  const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, { userId });
  return getLimitsFor(sub?.plan);
};

const progressFor = (business: Doc<"businesses">, posts: Doc<"posts">[]): PlanProgress => {
  const today = todayString();
  const start = business.planStartDate ?? today;
  const daysElapsed = Math.max(
    0,
    Math.min(
      30,
      Math.floor(
        (new Date(`${today}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) /
          86400000,
      ) + 1,
    ),
  );
  const typeMix: Record<string, number> = {};
  for (const p of posts) typeMix[p.contentType] = (typeMix[p.contentType] ?? 0) + 1;
  return {
    total: posts.length,
    done: posts.filter((p) => p.status === "done").length,
    skipped: posts.filter((p) => p.status === "skipped").length,
    daysElapsed,
    typeMix,
  };
};

const postToPlan = (post: Doc<"posts">): DayPlan => ({
  dayIndex: post.dayIndex,
  date: post.date,
  time: post.time ?? "",
  platform: post.platform,
  contentType: post.contentType,
  goal: post.goal,
  title: post.title,
  subject: post.subject,
  hook: post.hook,
  photoInstructions: post.photoInstructions,
  videoScript: post.videoScript,
  captionShort: post.captionShort,
  captionLong: post.captionLong,
  cta: post.cta,
  hashtagGroups: post.hashtagGroups,
  storyIdeas: post.storyIdeas,
});

// ---------------------------------------------------------------------------
// 1. Marketing strategy
// ---------------------------------------------------------------------------

export const generateMarketingStrategy = action({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await guard(ctx, userId, "strategy");
    const limits = await limitsFor(ctx, userId);
    const strategy = await generateStrategyAI(toProfile(business), limits.marketingStrategy);
    await ctx.runMutation(internal.businesses.patchStrategy, { businessId, strategy });
    await charge(ctx, userId, businessId, "strategy");
    return strategy;
  },
});

// ---------------------------------------------------------------------------
// 3. Captions
// ---------------------------------------------------------------------------

export const generateCaptions = action({
  args: { postId: v.id("posts"), count: v.optional(v.number()) },
  handler: async (ctx, { postId, count }) => {
    const { userId, business, post } = await requirePost(ctx, postId);
    await guard(ctx, userId, "captions");
    const captions = await generateCaptionsAI(
      toProfile(business),
      postToPlan(post),
      Math.min(5, Math.max(1, count ?? 3)),
    );
    await charge(ctx, userId, business._id, "captions");
    return { captions };
  },
});

// ---------------------------------------------------------------------------
// 4. Hashtags
// ---------------------------------------------------------------------------

export const generateHashtags = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const { userId, business, post } = await requirePost(ctx, postId);
    await guard(ctx, userId, "hashtags");
    const hashtagGroups = await generateHashtagsAI(toProfile(business), postToPlan(post));
    await ctx.runMutation(internal.businesses.patchPostFields, {
      postId,
      patch: { hashtagGroups },
    });
    await charge(ctx, userId, business._id, "hashtags");
    return { hashtagGroups };
  },
});

// ---------------------------------------------------------------------------
// 5. Reel ideas
// ---------------------------------------------------------------------------

export const generateReelIdeas = action({
  args: { businessId: v.id("businesses"), count: v.optional(v.number()) },
  handler: async (ctx, { businessId, count }) => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await guard(ctx, userId, "reelIdeas");
    const ideas = await generateReelIdeasAI(
      toProfile(business),
      Math.min(8, Math.max(1, count ?? 5)),
      Math.floor(Date.now() / 60000),
    );
    await charge(ctx, userId, businessId, "reelIdeas");
    return { ideas };
  },
});

// ---------------------------------------------------------------------------
// 6. Reel scripts
// ---------------------------------------------------------------------------

/**
 * Write a Reel script. Pass a postId to script that post (the script is
 * saved onto it), or a businessId + idea to script a free-standing idea.
 */
export const generateReelScript = action({
  args: {
    postId: v.optional(v.id("posts")),
    businessId: v.optional(v.id("businesses")),
    idea: v.optional(v.string()),
    hook: v.optional(v.string()),
  },
  handler: async (ctx, { postId, businessId, idea, hook }) => {
    if (postId) {
      const { userId, business, post } = await requirePost(ctx, postId);
      await guard(ctx, userId, "reelScripts");
      const limits = await limitsFor(ctx, userId);
      const videoScript = await generateReelScriptAI(
        toProfile(business),
        `${post.title} — ${post.subject}`,
        { hook: hook ?? post.hook, depth: limits.reelScripts },
      );
      await ctx.runMutation(internal.businesses.patchPostFields, {
        postId,
        patch: { videoScript, hook: videoScript.hook },
      });
      await charge(ctx, userId, business._id, "reelScripts");
      return { videoScript };
    }
    if (!businessId || !idea) throw new Error("Provide a postId, or a businessId and an idea.");
    const { userId, business } = await requireBusiness(ctx, businessId);
    await guard(ctx, userId, "reelScripts");
    const limits = await limitsFor(ctx, userId);
    const videoScript = await generateReelScriptAI(toProfile(business), idea, {
      hook,
      depth: limits.reelScripts,
    });
    await charge(ctx, userId, businessId, "reelScripts");
    return { videoScript };
  },
});

// ---------------------------------------------------------------------------
// 7. Trends
// ---------------------------------------------------------------------------

export const analyzeTrends = action({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await guard(ctx, userId, "trendAnalysis");
    const limits = await limitsFor(ctx, userId);
    const trendReport = await generateTrendsAI(toProfile(business), limits.trendInsights);
    await ctx.runMutation(internal.businesses.patchTrendReport, { businessId, trendReport });
    await charge(ctx, userId, businessId, "trendAnalysis");
    return trendReport;
  },
});

// ---------------------------------------------------------------------------
// 8. Recommendations
// ---------------------------------------------------------------------------

export const generateRecommendations = action({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await guard(ctx, userId, "recommendations");
    const posts = await ctx.runQuery(internal.businesses.getPostsByBusiness, { businessId });
    const recommendations = await generateRecommendationsAI(
      toProfile(business),
      progressFor(business, posts),
    );
    await ctx.runMutation(internal.businesses.patchRecommendations, {
      businessId,
      recommendations,
    });
    await charge(ctx, userId, businessId, "recommendations");
    return recommendations;
  },
});

// ---------------------------------------------------------------------------
// Background analysis after a plan is generated (no credits — included)
// ---------------------------------------------------------------------------

export const postPlanAnalysis = internalAction({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const business = await ctx.runQuery(internal.businesses.getBusinessById, { id: businessId });
    if (!business) return;
    const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, {
      userId: business.userId,
    });
    const limits = getLimitsFor(sub?.plan);
    const profile = toProfile(business);
    const posts = await ctx.runQuery(internal.businesses.getPostsByBusiness, { businessId });

    const [trendReport, recommendations] = await Promise.all([
      generateTrendsAI(profile, limits.trendInsights),
      generateRecommendationsAI(profile, progressFor(business, posts)),
    ]);
    await ctx.runMutation(internal.businesses.patchTrendReport, { businessId, trendReport });
    await ctx.runMutation(internal.businesses.patchRecommendations, {
      businessId,
      recommendations,
    });
  },
});
