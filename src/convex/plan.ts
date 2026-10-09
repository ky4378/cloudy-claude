/**
 * Cloudy — plan pipeline actions.
 *
 * Runs in the Node runtime ("use node") so it can reach the AI provider.
 * Pipeline for a business: brand research → marketing strategy → 30-day
 * content plan → (background) trends, recommendations, competitors.
 *
 * Granular AI endpoints (captions, hashtags, Reel ideas/scripts, trends,
 * competitors, recommendations) live in ./ai.ts.
 */

"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { formatDate, todayString, type BusinessProfile } from "./lib/strategy";
import { researchProfiles } from "./lib/research";
import {
  buildCalendarFallback,
  buildDayFallback,
  generateCalendarWithAI,
  generateRangeWithAI,
} from "./lib/planGen";
import { generateStrategyAI, strategyNote } from "./lib/insights";
import { getLimitsFor } from "./lib/planLimits";
import { fetchLiveTrends, formatTrendsPrompt } from "./lib/trends";

// ---------------------------------------------------------------------------
// Profile helpers
// ---------------------------------------------------------------------------

const optStr = (x: unknown): string | undefined =>
  typeof x === "string" && x.trim() ? x.trim() : undefined;
const strArr = (x: unknown): string[] =>
  Array.isArray(x) ? x.map(String).map((s) => s.trim()).filter(Boolean) : [];

/**
 * Build a clean BusinessProfile from a business doc / form payload.
 * Picks fields explicitly so secrets (igToken) and internal metadata
 * (createdAt, salts…) are never spread into AI prompts.
 */
export const toProfile = (
  args: Partial<BusinessProfile> & Record<string, unknown>,
): BusinessProfile => {
  const tone = optStr(args.tone);
  const personality = strArr(args.brandPersonality);
  const mainGoal = optStr(args.mainGoal);
  const goals = strArr(args.goals);
  return {
    businessName: String(args.businessName ?? ""),
    businessType: String(args.businessType ?? "other"),
    location: String(args.location ?? ""),
    instagram: optStr(args.instagram),
    website: optStr(args.website),
    products: strArr(args.products),
    targetCustomers: String(args.targetCustomers ?? ""),
    goals: mainGoal && !goals.includes(mainGoal) ? [mainGoal, ...goals] : goals,
    brandPersonality: tone && !personality.includes(tone) ? [tone, ...personality] : personality,
    accentColor: optStr(args.accentColor),
    igFollowers: optStr(args.igFollowers),
    postingFrequency: optStr(args.postingFrequency),
    engagement: optStr(args.engagement),
    brandResearch: optStr(args.brandResearch),
    mainGoal,
    differentiator: optStr(args.differentiator),
    tone,
    contentLikes: optStr(args.contentLikes),
    contentDislikes: optStr(args.contentDislikes),
    challenges: optStr(args.challenges),
    competitors: strArr(args.competitors),
  };
};

/** The questionnaire payload accepted by saveBusiness / updateProfile. */
export const profileArgs = {
  businessName: v.string(),
  businessType: v.string(),
  location: v.string(),
  website: v.optional(v.string()),
  instagram: v.optional(v.string()),
  targetCustomers: v.string(),
  mainGoal: v.optional(v.string()),
  goals: v.array(v.string()),
  igFollowers: v.optional(v.string()),
  postingFrequency: v.optional(v.string()),
  engagement: v.optional(v.string()),
  products: v.array(v.string()),
  differentiator: v.optional(v.string()),
  tone: v.optional(v.string()),
  brandPersonality: v.array(v.string()),
  contentLikes: v.optional(v.string()),
  contentDislikes: v.optional(v.string()),
  competitors: v.optional(v.array(v.string())),
  challenges: v.optional(v.string()),
  accentColor: v.optional(v.string()),
};

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

const planDepth = async (ctx: ActionCtx, userId: Id<"users">) => {
  const sub = await ctx.runQuery(internal.billing.getSubscriptionByUser, { userId });
  return getLimitsFor(sub?.plan);
};

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

/**
 * Fetch and cache live trends for a business type.
 * Only called when user regenerates the plan (not automatically).
 */
async function fetchAndCacheLiveTrends(
  ctx: ActionCtx,
  businessType: string,
): Promise<string> {
  try {
    const cached = await ctx.runQuery(internal.businesses.getCachedTrends, {
      businessType,
    });

    if (cached) {
      return formatTrendsPrompt(cached);
    }

    const liveTrends = await fetchLiveTrends(businessType);
    await ctx.runMutation(internal.businesses.cacheLiveTrends, {
      businessType,
      audios: liveTrends.audios,
      reels: liveTrends.reels,
      hashtags: liveTrends.hashtags,
      themes: liveTrends.themes,
      topics: liveTrends.topics,
    });

    return formatTrendsPrompt(liveTrends);
  } catch {
    return "";
  }
}

/**
 * Strategy + 30-day plan for a business. Costs one "plan". Marks planStatus
 * so the dashboard can show a live generating / error state, and schedules
 * the trend, recommendation and competitor analyses in the background.
 */
async function runPlanPipeline(
  ctx: ActionCtx,
  userId: Id<"users">,
  business: Doc<"businesses">,
): Promise<void> {
  console.log("[Plan Pipeline] Starting for business:", business.businessName);
  // Skip feature check - allow plan generation even without active subscription
  // (subscription sync from Stripe webhook is async)

  const businessId = business._id;
  await ctx.runMutation(internal.businesses.setPlanStatus, {
    businessId,
    status: "generating",
  });

  try {
    const anchor = formatDate(new Date());
    const salt = (business.strategySalt ?? 0) + 1;
    const limits = await planDepth(ctx, userId);
    const profile = toProfile(business);

    // 1 & 2. Run brand research and strategy generation in parallel.
    console.log("[Plan Pipeline] Starting research and strategy...");
    const [research, strategy] = await Promise.all([
      researchProfiles(
        { instagram: business.instagram },
        { igToken: business.igToken, igAccountId: business.igConnectedAccountId },
      ),
      generateStrategyAI(profile, limits.marketingStrategy),
    ]);
    console.log("[Plan Pipeline] Research and strategy complete");

    // 3. Build content plan with AI (smart, personalized to products) while saving research/strategy.
    const excludedIdeas = await ctx.runQuery(internal.businesses.getExcludedContentIdeas, {
      businessId,
    });

    if (research) {
      profile.brandResearch = research;
    }

    const opts = { startDate: anchor, salt, strategyNote: strategyNote(strategy), excludedIdeas };

    // Try AI-powered generation first (uses products to understand real business).
    // Falls back to deterministic if AI is unavailable.
    let plans = await generateCalendarWithAI(profile, opts);
    if (!plans) {
      // Fallback to deterministic engine if AI fails
      plans = buildCalendarFallback(profile, opts);
    }

    // 4. Save everything to database in parallel (research, strategy, posts, plan metadata, usage).
    await Promise.all([
      research ? ctx.runMutation(internal.businesses.patchBrandResearch, {
        businessId,
        brandResearch: research,
      }) : Promise.resolve(),
      ctx.runMutation(internal.businesses.patchStrategy, { businessId, strategy }),
      ctx.runMutation(internal.businesses.replacePosts, { businessId, plans }),
      ctx.runMutation(internal.businesses.finishPlan, {
        businessId,
        salt,
        planStartDate: anchor,
      }),
      ctx.runMutation(internal.billing.incrementUsage, {
        userId,
        feature: "plans",
        businessId,
      }),
    ]);

    // 4. Sync subscription and run insights in background (both included — no extra credits).
    ctx.scheduler.runAfter(0, internal.ai.postPlanAnalysis, { businessId });
    ctx.scheduler.runAfter(0, internal.stripe.internalSyncSubscription, { userId });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Plan Generation Error]", errorMsg, error);
    await ctx.runMutation(internal.businesses.setPlanStatus, {
      businessId,
      status: "error",
      error: errorMsg,
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Save (or update) the user's business profile from the questionnaire and,
 * unless `generatePlan` is false, generate the strategy + 30-day plan.
 * Answers are always saved so a user can resume later.
 */
export const saveBusiness = action({
  args: { ...profileArgs, generatePlan: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<Id<"businesses">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const { generatePlan, ...rest } = args;
    const existing = await ctx.runQuery(internal.businesses.getBusinessByUser, { userId });
    const businessId = await ctx.runMutation(internal.businesses.upsertBusiness, {
      userId,
      profile: toProfile(rest),
      anchor: existing?.planStartDate ?? formatDate(new Date()),
      salt: existing?.strategySalt ?? 0,
    });
    await ctx.runMutation(internal.billing.ensureSubscription, { userId, businessId });

    if (generatePlan === false) return businessId;

    const business = await ctx.runQuery(internal.businesses.getBusinessById, { id: businessId });
    if (!business) throw new Error("Couldn't save your business profile.");
    await runPlanPipeline(ctx, userId, business);
    return businessId;
  },
});

/** Run the full pipeline for an existing business (onboarding / "new month"). */
export const generateStrategy = action({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }): Promise<void> => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await runPlanPipeline(ctx, userId, business);
  },
});

/**
 * Start a fresh 30-day plan. Included with every subscription (no quota), but
 * only once the current month's last day has been reached — inside the month,
 * users regenerate individual days instead.
 */
export const regenerateCalendar = action({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }): Promise<void> => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    const posts = await ctx.runQuery(internal.businesses.getPostsByBusiness, { businessId });
    const lastDate = posts.reduce((max, p) => (p.date > max ? p.date : max), "");
    if (lastDate && todayString() < lastDate) {
      const pretty = new Date(`${lastDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      throw new Error(
        `Your current month runs until ${pretty}. Until then, tick the days you want rewritten and regenerate those — a fresh month is included once this one ends.`,
      );
    }
    await runPlanPipeline(ctx, userId, business);
  },
});

/** Re-roll a single day's post. Costs one regeneration. */
export const regeneratePost = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const post = await ctx.runQuery(internal.businesses.getPostById, { id: postId });
    if (!post) throw new Error("Post not found");
    const { business } = await requireBusiness(ctx, post.businessId);

    const featCheck = await ctx.runQuery(internal.billing.canUseFeature, {
      userId,
      feature: "regenerations",
    });
    if (!featCheck.ok) throw new Error(featCheck.reason);

    const anchor = business.planStartDate ?? formatDate(new Date());
    const salt = Math.floor(Date.now() / 60000) + post.dayIndex;
    const profile = toProfile(business);
    const excludedIdeas = await ctx.runQuery(internal.businesses.getExcludedContentIdeas, {
      businessId: business._id,
    });
    const liveTrendsPrompt = await fetchAndCacheLiveTrends(ctx, business.businessType);
    const opts = {
      startDate: anchor,
      salt,
      strategyNote: business.strategy ? strategyNote(business.strategy) : undefined,
      excludedIdeas,
      liveTrendsPrompt,
    };

    const aiPlans = await generateRangeWithAI(profile, post.dayIndex, 1, opts);
    const plan = aiPlans?.[0] ?? buildDayFallback(profile, post.dayIndex, opts);

    await ctx.runMutation(internal.businesses.patchPost, { postId, plan });
    await ctx.runMutation(internal.billing.incrementUsage, {
      userId,
      feature: "regenerations",
      businessId: business._id,
    });
  },
});

/**
 * Regenerate an arbitrary set of days. Each day draws one unit from the
 * tier's monthly regenerate-days quota. Consecutive days are grouped so one
 * AI call covers each contiguous run.
 */
async function regenerateDayIndexes(
  ctx: ActionCtx,
  userId: Id<"users">,
  business: Doc<"businesses">,
  dayIndexes: number[],
): Promise<void> {
  const days = [...new Set(dayIndexes.filter((d) => Number.isInteger(d) && d >= 0 && d < 30))].sort(
    (a, b) => a - b,
  );
  if (days.length === 0) throw new Error("Pick at least one day to regenerate.");

  const featCheck = await ctx.runQuery(internal.billing.canUseFeature, {
    userId,
    feature: "regenerations",
    units: days.length,
  });
  if (!featCheck.ok) throw new Error(featCheck.reason);

  const businessId = business._id;
  const anchor = business.planStartDate ?? formatDate(new Date());
  const profile = toProfile(business);
  const excludedIdeas = await ctx.runQuery(internal.businesses.getExcludedContentIdeas, {
    businessId,
  });
  const liveTrendsPrompt = await fetchAndCacheLiveTrends(ctx, business.businessType);
  const note = business.strategy ? strategyNote(business.strategy) : undefined;

  const runs: { from: number; count: number }[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && last.from + last.count === d) last.count += 1;
    else runs.push({ from: d, count: 1 });
  }

  const plans = (
    await Promise.all(
      runs.map(async ({ from, count }) => {
        const opts = {
          startDate: anchor,
          salt: Math.floor(Date.now() / 60000) + from,
          strategyNote: note,
          excludedIdeas,
          liveTrendsPrompt,
        };
        const ai = await generateRangeWithAI(profile, from, count, opts);
        return ai ?? Array.from({ length: count }, (_, i) => buildDayFallback(profile, from + i, opts));
      }),
    )
  ).flat();

  const posts = await ctx.runQuery(internal.businesses.getPostsByBusiness, { businessId });
  for (const plan of plans) {
    const existing = posts.find((p) => p.dayIndex === plan.dayIndex);
    if (existing) {
      await ctx.runMutation(internal.businesses.patchPost, { postId: existing._id, plan });
    }
  }
  await ctx.runMutation(internal.billing.incrementUsage, {
    userId,
    feature: "regenerations",
    units: days.length,
    businessId,
  });
}

/** Regenerate the days the user ticked on the plan page. */
export const regenerateSelectedDays = action({
  args: { businessId: v.id("businesses"), dayIndexes: v.array(v.number()) },
  handler: async (ctx, { businessId, dayIndexes }): Promise<void> => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    await regenerateDayIndexes(ctx, userId, business, dayIndexes);
  },
});

/** Regenerate a run of consecutive days. */
export const regenerateDays = action({
  args: {
    businessId: v.id("businesses"),
    fromDayIndex: v.number(),
    count: v.number(),
  },
  handler: async (ctx, { businessId, fromDayIndex, count }): Promise<void> => {
    const { userId, business } = await requireBusiness(ctx, businessId);
    const n = Math.max(1, Math.min(count, 30 - fromDayIndex));
    await regenerateDayIndexes(
      ctx,
      userId,
      business,
      Array.from({ length: n }, (_, i) => fromDayIndex + i),
    );
  },
});
