import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DayPlan } from "./lib/strategy";
import {
  recommendationsValidator,
  strategyValidator,
  trendReportValidator,
} from "./schema";

const insertPosts = async (
  ctx: MutationCtx,
  businessId: Id<"businesses">,
  plans: DayPlan[],
) => {
  // Insert posts sequentially to avoid Convex transaction issues with large batches.
  // Parallel insertion was causing action timeouts. Sequential is reliable.
  for (const plan of plans) {
    await ctx.db.insert("posts", {
      businessId,
      dayIndex: plan.dayIndex,
      date: plan.date,
      platform: plan.platform,
      contentType: plan.contentType,
      goal: plan.goal,
      time: plan.time || undefined,
      title: plan.title,
      subject: plan.subject,
      hook: plan.hook,
      photoInstructions: plan.photoInstructions,
      videoScript: plan.videoScript,
      captionShort: plan.captionShort,
      captionLong: plan.captionLong,
      cta: plan.cta,
      hashtagGroups: plan.hashtagGroups,
      storyIdeas: plan.storyIdeas,
      status: "planned",
      createdAt: Date.now(),
    });
  }
};

export const myBusiness = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return null;
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .collect();
    posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    // Cloudy is Instagram-only now. Old plans (created before Facebook/TikTok
    // were removed) may still have legacy platform values — normalize them so
    // the UI never renders a platform we don't support.
    const normalizedPosts = posts.map((post) =>
      post.platform === "Instagram"
        ? post
        : { ...post, platform: "Instagram" as const },
    );
    // Never ship the Instagram access token to the client — it is only used
    // server-side for official Graph API research.
    const { igToken: _igToken, ...safeBusiness } = business;
    return { business: safeBusiness, posts: normalizedPosts };
  },
});

export const updatePostStatus = mutation({
  args: {
    postId: v.id("posts"),
    status: v.union(v.literal("planned"), v.literal("done"), v.literal("skipped")),
  },
  handler: async (ctx, { postId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const business = await ctx.db.get(post.businessId);
    if (!business || business.userId !== userId) throw new Error("Business not found");
    await ctx.db.patch(postId, { status });
  },
});

// ---------------------------------------------------------------------------
// Internal helpers — used by the plan actions in src/convex/plan.ts
// ---------------------------------------------------------------------------

export const getBusinessByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first(),
});

export const getBusinessById = internalQuery({
  args: { id: v.id("businesses") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getPostById = internalQuery({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getPostsByBusiness = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return posts;
  },
});

/** Get content ideas to exclude from generation (used by same business type, non-trending). */
export const getExcludedContentIdeas = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const business = await ctx.db.get(businessId);
    if (!business) return [];

    const otherBusinesses = await ctx.db
      .query("businesses")
      .collect();

    const sameTypeBusinesses = otherBusinesses.filter(
      (b) => b.businessType === business.businessType && b._id !== businessId
    );

    if (sameTypeBusinesses.length === 0) return [];

    const allPosts = await ctx.db
      .query("posts")
      .collect();

    const trendingTitles = new Set(
      business.trendReport?.trends.map((t) => t.title.toLowerCase()) ?? []
    );

    const excluded: string[] = [];
    for (const otherBusiness of sameTypeBusinesses) {
      const theirPosts = allPosts.filter((p) => p.businessId === otherBusiness._id);
      for (const post of theirPosts) {
        const isT = trendingTitles.has(post.title.toLowerCase());
        if (!isT) {
          excluded.push(post.title);
          excluded.push(post.subject);
        }
      }
    }

    return [...new Set(excluded)];
  },
});

export const upsertBusiness = internalMutation({
  args: {
    userId: v.id("users"),
    profile: v.any(),
    anchor: v.string(),
    salt: v.number(),
  },
  handler: async (ctx, { userId, profile, anchor, salt }) => {
    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...profile,
        strategySalt: salt,
        planStartDate: anchor,
      });
      return existing._id;
    }
    return ctx.db.insert("businesses", {
      userId,
      ...profile,
      strategySalt: salt,
      planStartDate: anchor,
      createdAt: Date.now(),
    });
  },
});

export const replacePosts = internalMutation({
  args: { businessId: v.id("businesses"), plans: v.array(v.any()) },
  handler: async (ctx, { businessId, plans }) => {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    await Promise.all(existing.map((p) => ctx.db.delete(p._id)));
    await insertPosts(ctx, businessId, plans as DayPlan[]);
  },
});

export const patchBrandResearch = internalMutation({
  args: { businessId: v.id("businesses"), brandResearch: v.optional(v.string()) },
  handler: async (ctx, { businessId, brandResearch }) => {
    await ctx.db.patch(businessId, { brandResearch });
  },
});

export const saveIgConnection = internalMutation({
  args: {
    businessId: v.id("businesses"),
    igToken: v.string(),
    igTokenExpiresAt: v.optional(v.number()),
    igConnectedUsername: v.optional(v.string()),
    igConnectedAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.businessId, {
      igToken: args.igToken,
      igTokenExpiresAt: args.igTokenExpiresAt,
      igConnectedUsername: args.igConnectedUsername,
      igConnectedAccountId: args.igConnectedAccountId,
    });
  },
});

export const bumpSalt = internalMutation({
  args: { businessId: v.id("businesses"), salt: v.number() },
  handler: async (ctx, { businessId, salt }) => {
    await ctx.db.patch(businessId, { strategySalt: salt });
  },
});

export const patchPost = internalMutation({
  args: { postId: v.id("posts"), plan: v.any() },
  handler: async (ctx, { postId, plan }) => {
    const p = plan as DayPlan;
    await ctx.db.patch(postId, {
      platform: p.platform,
      contentType: p.contentType,
      goal: p.goal,
      time: p.time || undefined,
      title: p.title,
      subject: p.subject,
      hook: p.hook,
      photoInstructions: p.photoInstructions,
      videoScript: p.videoScript,
      captionShort: p.captionShort,
      captionLong: p.captionLong,
      cta: p.cta,
      hashtagGroups: p.hashtagGroups,
      storyIdeas: p.storyIdeas,
      status: "planned",
    });
  },
});


// ---------------------------------------------------------------------------
// Profile editing (Settings page) + plan status + AI output patches
// ---------------------------------------------------------------------------

const profilePatchArgs = {
  businessName: v.optional(v.string()),
  businessType: v.optional(v.string()),
  location: v.optional(v.string()),
  website: v.optional(v.string()),
  instagram: v.optional(v.string()),
  targetCustomers: v.optional(v.string()),
  mainGoal: v.optional(v.string()),
  goals: v.optional(v.array(v.string())),
  igFollowers: v.optional(v.string()),
  postingFrequency: v.optional(v.string()),
  engagement: v.optional(v.string()),
  products: v.optional(v.array(v.string())),
  differentiator: v.optional(v.string()),
  tone: v.optional(v.string()),
  brandPersonality: v.optional(v.array(v.string())),
  contentLikes: v.optional(v.string()),
  contentDislikes: v.optional(v.string()),
  competitors: v.optional(v.array(v.string())),
  challenges: v.optional(v.string()),
  accentColor: v.optional(v.string()),
};

/** Update questionnaire answers without regenerating anything. */
export const updateProfile = mutation({
  args: profilePatchArgs,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) throw new Error("Business not found");
    const patch = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(business._id, patch);
    return business._id;
  },
});

/** Replace a post's caption with one the owner picked from AI suggestions. */
export const applyCaption = mutation({
  args: { postId: v.id("posts"), caption: v.string() },
  handler: async (ctx, { postId, caption }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const business = await ctx.db.get(post.businessId);
    if (!business || business.userId !== userId) throw new Error("Business not found");
    const trimmed = caption.trim();
    if (!trimmed) throw new Error("Caption can't be empty.");
    await ctx.db.patch(postId, {
      captionLong: trimmed,
      captionShort: trimmed.length > 220 ? `${trimmed.slice(0, 217).trimEnd()}…` : trimmed,
    });
  },
});

export const setPlanStatus = internalMutation({
  args: {
    businessId: v.id("businesses"),
    status: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { businessId, status, error }) => {
    await ctx.db.patch(businessId, {
      planStatus: status,
      planError: status === "error" ? error ?? "Plan generation failed." : undefined,
    });
  },
});

/** Mark a plan as ready and record its anchor date + seed. */
export const finishPlan = internalMutation({
  args: {
    businessId: v.id("businesses"),
    salt: v.number(),
    planStartDate: v.string(),
  },
  handler: async (ctx, { businessId, salt, planStartDate }) => {
    await ctx.db.patch(businessId, {
      planStatus: "ready",
      planError: undefined,
      planGeneratedAt: Date.now(),
      strategySalt: salt,
      planStartDate,
    });
  },
});

export const patchStrategy = internalMutation({
  args: { businessId: v.id("businesses"), strategy: strategyValidator },
  handler: async (ctx, { businessId, strategy }) => {
    await ctx.db.patch(businessId, { strategy });
  },
});

export const patchTrendReport = internalMutation({
  args: { businessId: v.id("businesses"), trendReport: trendReportValidator },
  handler: async (ctx, { businessId, trendReport }) => {
    await ctx.db.patch(businessId, { trendReport });
  },
});

export const patchRecommendations = internalMutation({
  args: { businessId: v.id("businesses"), recommendations: recommendationsValidator },
  handler: async (ctx, { businessId, recommendations }) => {
    await ctx.db.patch(businessId, { recommendations });
  },
});

/** Patch arbitrary generated fields on a post (hashtags, script, hook…). */
export const patchPostFields = internalMutation({
  args: { postId: v.id("posts"), patch: v.any() },
  handler: async (ctx, { postId, patch }) => {
    await ctx.db.patch(postId, patch as Partial<Doc<"posts">>);
  },
});

// ---------------------------------------------------------------------------
// Live trend cache management
// ---------------------------------------------------------------------------

/** Get cached live trends for a business type (if not expired). */
export const getCachedTrends = internalQuery({
  args: { businessType: v.string() },
  handler: async (ctx, { businessType }) => {
    const cache = await ctx.db
      .query("trendCache")
      .withIndex("by_type_expiry", (q) => q.eq("businessType", businessType))
      .first();

    if (!cache || cache.expiresAt < Date.now()) {
      return null;
    }

    return {
      audios: cache.audios,
      reels: cache.reels,
      hashtags: cache.hashtags,
      themes: cache.themes,
      topics: cache.topics,
    };
  },
});

/** Cache live trends for a business type (expires after 24 hours). */
export const cacheLiveTrends = internalMutation({
  args: {
    businessType: v.string(),
    audios: v.array(v.string()),
    reels: v.array(v.string()),
    hashtags: v.array(v.string()),
    themes: v.array(v.string()),
    topics: v.array(v.string()),
  },
  handler: async (ctx, { businessType, audios, reels, hashtags, themes, topics }) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const existing = await ctx.db
      .query("trendCache")
      .withIndex("by_type_expiry", (q) => q.eq("businessType", businessType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        audios,
        reels,
        hashtags,
        themes,
        topics,
        fetchedAt: now,
        expiresAt,
      });
    } else {
      await ctx.db.insert("trendCache", {
        businessType,
        audios,
        reels,
        hashtags,
        themes,
        topics,
        fetchedAt: now,
        expiresAt,
      });
    }
  },
});
