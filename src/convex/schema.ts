import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// AI output shapes stored on the business document
// ---------------------------------------------------------------------------

export const strategyValidator = v.object({
  generatedAt: v.number(),
  source: v.union(v.literal("ai"), v.literal("engine")),
  summary: v.string(), // 2-3 sentence recommended strategy
  positioning: v.string(), // how the brand should position itself
  focus: v.string(), // awareness | community | conversion (human label)
  monthlyTheme: v.string(),
  pillars: v.array(
    v.object({
      name: v.string(),
      description: v.string(),
      share: v.number(), // % of the month's posts
    }),
  ),
  opportunities: v.array(
    v.object({
      title: v.string(),
      why: v.string(),
      contentIdea: v.string(),
    }),
  ),
  postingCadence: v.string(),
  bestTimes: v.array(v.string()),
});

export const trendReportValidator = v.object({
  generatedAt: v.number(),
  source: v.union(v.literal("ai"), v.literal("engine")),
  trends: v.array(
    v.object({
      title: v.string(),
      description: v.string(),
      howToUse: v.string(),
      format: v.string(), // Reel | Carousel | Photo | Story
      momentum: v.union(
        v.literal("rising"),
        v.literal("steady"),
        v.literal("peaking"),
      ),
    }),
  ),
});

export const recommendationsValidator = v.object({
  generatedAt: v.number(),
  source: v.union(v.literal("ai"), v.literal("engine")),
  items: v.array(
    v.object({
      title: v.string(),
      detail: v.string(),
      priority: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
      ),
      category: v.string(), // content | growth | engagement | conversion | consistency
    }),
  ),
});

export const videoScriptValidator = v.object({
  hook: v.string(),
  scenes: v.array(v.string()),
  ending: v.string(),
  music: v.string(),
  length: v.string(),
  textOverlays: v.array(v.string()),
  cameraMovement: v.string(),
  broll: v.array(v.string()),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // One business per user — everything the questionnaire collects plus the
    // AI outputs generated from it.
    businesses: defineTable({
      userId: v.id("users"),
      // ── Questionnaire ────────────────────────────────────────────────
      businessName: v.string(),
      businessType: v.string(), // key into BUSINESS_TYPES (cafe | restaurant | salon | …)
      location: v.string(), // city / area
      website: v.optional(v.string()),
      instagram: v.optional(v.string()),
      targetCustomers: v.string(), // target audience
      mainGoal: v.optional(v.string()), // the single most important goal
      goals: v.array(v.string()), // all selected goals (mainGoal first)
      igFollowers: v.optional(v.string()), // under500 | 500to2k | 2kto10k | 10kplus
      postingFrequency: v.optional(v.string()), // daily | 3to4x | 1to2x | rarely
      engagement: v.optional(v.string()), // high | some | low
      products: v.array(v.string()), // products / services offered
      differentiator: v.optional(v.string()), // what makes the business different
      tone: v.optional(v.string()), // Professional | Luxury | Funny | Educational | Friendly | Bold
      brandPersonality: v.array(v.string()), // extra personality tags (tone first)
      contentLikes: v.optional(v.string()),
      contentDislikes: v.optional(v.string()),
      competitors: v.optional(v.array(v.string())),
      challenges: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      // ── AI outputs ───────────────────────────────────────────────────
      planStatus: v.optional(v.string()), // idle | generating | ready | error
      planError: v.optional(v.string()),
      planGeneratedAt: v.optional(v.number()),
      strategy: v.optional(strategyValidator),
      trendReport: v.optional(trendReportValidator),
      recommendations: v.optional(recommendationsValidator),
      brandResearch: v.optional(v.string()), // brand brief gathered from live social profiles
      // Meta Instagram Graph API connection (free, official). Token is only
      // ever read server-side — never returned to the client.
      igToken: v.optional(v.string()),
      igTokenExpiresAt: v.optional(v.number()),
      igConnectedUsername: v.optional(v.string()),
      igConnectedAccountId: v.optional(v.string()),
      strategySalt: v.optional(v.number()), // seed offset used to regenerate the plan
      planStartDate: v.optional(v.string()), // YYYY-MM-DD anchor of the 30-day plan
      createdAt: v.number(),
    }).index("by_userId", ["userId"]),

    // One row per day of the 30-day plan.
    posts: defineTable({
      businessId: v.id("businesses"),
      dayIndex: v.number(), // 0..29 within the 30-day plan
      date: v.string(), // YYYY-MM-DD
      time: v.optional(v.string()), // suggested posting time, e.g. "7:00 PM"
      platform: v.union(v.literal("Instagram")),
      contentType: v.union(
        v.literal("Reel"),
        v.literal("Carousel"),
        v.literal("Photo Post"),
        v.literal("Story Post"),
        v.literal("Video Post"),
      ),
      goal: v.string(), // objective of the post
      title: v.string(), // the post idea
      subject: v.string(),
      hook: v.optional(v.string()),
      photoInstructions: v.string(), // what to film / take
      videoScript: v.optional(videoScriptValidator),
      captionShort: v.string(),
      captionLong: v.string(),
      cta: v.string(),
      hashtagGroups: v.object({
        local: v.array(v.string()),
        industry: v.array(v.string()),
        trending: v.array(v.string()),
        branded: v.array(v.string()),
      }),
      storyIdeas: v.array(v.string()),
      status: v.string(), // planned | done | skipped   (UI: Ready / Posted / Skipped)
      createdAt: v.number(),
    })
      .index("by_business", ["businessId"])
      .index("by_business_date", ["businessId", "date"]),

    // Brand media library — logo + photos uploaded by the owner, stored in
    // Supabase Storage and referenced here by public URL.
    businessMedia: defineTable({
      businessId: v.id("businesses"),
      kind: v.union(v.literal("logo"), v.literal("photo")),
      fileName: v.string(),
      mimeType: v.string(),
      url: v.string(),
      createdAt: v.number(),
    }).index("by_business", ["businessId"]),

    // AI coach / prompt station — a persisted chat between the owner and the
    // AI marketing coach. Assistant messages store the JSON response string.
    coachThreads: defineTable({
      businessId: v.id("businesses"),
      messages: v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
          createdAt: v.number(),
        }),
      ),
    }).index("by_business", ["businessId"]),

    // Product feedback check-ins.
    feedback: defineTable({
      userId: v.id("users"),
      businessId: v.id("businesses"),
      rating: v.number(), // 1..5
      whatWorks: v.optional(v.string()),
      improve: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_business", ["businessId"])
      .index("by_user", ["userId"]),

    // Subscriptions — one row per user. Stripe is the source of truth for
    // paid rows; the webhook mirrors state here. Trial rows (no Stripe ids)
    // are created when CLOUDY_FREE_TRIAL is enabled or Stripe isn't set up.
    subscriptions: defineTable({
      userId: v.id("users"),
      businessId: v.optional(v.id("businesses")),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      plan: v.string(), // starter | growth | pro
      status: v.string(), // active | trialing | past_due | incomplete | canceled | unpaid
      cancelAtPeriodEnd: v.boolean(),
      currentPeriodStart: v.optional(v.number()),
      currentPeriodEnd: v.optional(v.number()),
      // Per-period usage — reset automatically when the billing period rolls
      // over. `credits` is the AI-credit meter shown in the app; the other
      // counters back the per-feature limits in lib/planLimits.ts.
      usage: v.optional(
        v.object({
          periodStart: v.number(),
          credits: v.number(),
          plans: v.number(),
          strategy: v.number(),
          regenerations: v.number(),
          captions: v.number(),
          hashtags: v.number(),
          reelIdeas: v.number(),
          reelScripts: v.number(),
          trendAnalysis: v.number(),
          recommendations: v.number(),
          coachMessages: v.number(),
        }),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_customer", ["stripeCustomerId"]),

    // Cached live trends from Instagram/TikTok + third-party APIs (refreshed daily).
    // Used to inject real-time trending content into plan generation.
    trendCache: defineTable({
      businessType: v.string(), // cafe | restaurant | salon | etc
      audios: v.array(v.string()), // trending audio/music titles
      reels: v.array(v.string()), // trending reel scripts/ideas
      hashtags: v.array(v.string()), // trending hashtags
      themes: v.array(v.string()), // trending content themes
      topics: v.array(v.string()), // trending topics/niches
      fetchedAt: v.number(), // timestamp of when trends were fetched
      expiresAt: v.number(), // cache expiry timestamp (24h from fetchedAt)
    }).index("by_type_expiry", ["businessType", "expiresAt"]),

    // Launch waitlist — public queries only ever expose the count.
    waitlist: defineTable({
      email: v.string(), // stored lowercased + trimmed
      businessType: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_email", ["email"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
