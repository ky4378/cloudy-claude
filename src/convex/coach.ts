/**
 * Cloudy AI — the AI coach / prompt station.
 *
 * A chat with the business owner: they ask in plain language ("I want to
 * announce my new shop but I don't know what caption to write"), and the
 * coach answers with a short human reply plus ready-to-paste content —
 * caption, long caption, photo brief, story ideas and hashtags — so the
 * owner can copy and post immediately.
 *
 * Runs on the default Convex runtime: OpenAI is called with plain fetch
 * (available everywhere in Convex), and when no key is configured the
 * coach falls back to a template answer so the feature always works.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  CAPTION_STYLE_GUIDE,
  todayString,
  type BusinessProfile,
} from "./lib/strategy";
import { buildVoiceProfile, voicePromptBlock } from "./lib/voice";
import { getLimitsFor } from "./lib/planLimits";

// ---------------------------------------------------------------------------
// Types + OpenAI client (plain fetch — no extra dependency)
// ---------------------------------------------------------------------------

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface CoachResponse {
  reply: string;
  caption?: string;
  captionLong?: string;
  photoInstructions?: string;
  storyIdeas?: string[];
  hashtags?: string[];
  suggestions?: string[];
}

type ChatItem = { role: "system" | "user" | "assistant"; content: string };
type ThreadMessage = Doc<"coachThreads">["messages"][number];

async function chat(
  messages: ChatItem[],
  maxTokens: number,
): Promise<string | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Extract the human reply from a stored assistant message (JSON or plain). */
function replyText(content: string): string {
  try {
    const d = JSON.parse(content) as Partial<CoachResponse>;
    if (typeof d.reply === "string" && d.reply.trim()) return d.reply;
  } catch {
    /* plain text */
  }
  return content;
}

/**
 * Estimate how many AI credits a user message will consume.
 * Simple questions (1-2), medium requests (3-5), complex multi-part
 * content requests (6-10).
 */
function estimateCredits(message: string): number {
  const m = message.toLowerCase();
  const len = m.length;

  // --- High-complexity signals (6-10 credits) ---
  const complexKeywords = [
    "reel script", "shot list", "full plan", "monthly", "30-day",
    "full strategy", "campaign", "product launch", "grand opening",
    "rebrand", "content calendar", "multiple posts", "series of",
    "photoshoot", "brand guide", "brand voice",
  ];
  const complexHits = complexKeywords.filter((k) => m.includes(k)).length;
  if (complexHits >= 2 || (complexHits >= 1 && len > 200)) return 10;
  if (complexHits >= 1) return 8;

  // Multi-part requests: "write X and Y" or "write X, Y, and Z"
  const andCount = (m.match(/\band\b/g) || []).length;
  if (andCount >= 2) return 9;

  // --- Medium-complexity signals (3-6 credits) ---
  const mediumKeywords = [
    "caption", "post idea", "story idea", "story ideas",
    "hashtag", "hashtags", "reel", "photo brief",
    "photo instructions", "what should i post", "announcement",
    "promote", "launch", "write a", "draft a", "create a",
    "give me", "generate", "ideas for",
  ];
  const mediumHits = mediumKeywords.filter((k) => m.includes(k)).length;
  if (mediumHits >= 2 || (mediumHits >= 1 && len > 150)) return 6;
  if (mediumHits >= 1 && len > 80) return 5;
  if (mediumHits >= 1) return 4;

  // Longer messages with no specific content keyword = moderate effort
  if (len > 200) return 4;
  if (len > 100) return 3;

  // --- Simple questions (1-3 credits) ---
  const simpleKeywords = [
    "why", "how do i", "how can i", "should i", "what is",
    "when", "where", "tips", "advice",
  ];
  if (simpleKeywords.some((k) => m.startsWith(k) || m.includes(k))) {
    return len > 80 ? 3 : 2;
  }

  // Default: short simple messages
  return len > 60 ? 2 : 1;
}

function parseCoachResponse(raw: string): CoachResponse | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data !== "object" || data === null) return null;
    const reply =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "";
    if (!reply) return null;
    const str = (x: unknown): string | undefined =>
      typeof x === "string" && x.trim() ? x.trim() : undefined;
    const arr = (x: unknown): string[] | undefined =>
      Array.isArray(x)
        ? x.filter(
            (i): i is string => typeof i === "string" && i.trim().length > 0,
          )
        : undefined;
    return {
      reply,
      caption: str(data.caption),
      captionLong: str(data.captionLong),
      photoInstructions: str(data.photoInstructions),
      storyIdeas: arr(data.storyIdeas),
      hashtags: arr(data.hashtags),
      suggestions: arr(data.suggestions),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

/** Explicit-field profile so the token and internal fields never leak. */
const buildProfile = (b: Doc<"businesses">): BusinessProfile => ({
  businessName: b.businessName,
  businessType: b.businessType,
  location: b.location,
  instagram: b.instagram,
  website: b.website,
  products: b.products,
  targetCustomers: b.targetCustomers,
  goals: b.goals,
  brandPersonality: b.brandPersonality,
  accentColor: b.accentColor ?? undefined,
  brandResearch: b.brandResearch ?? undefined,
});

const planNote = (posts: Doc<"posts">[]): string => {
  if (posts.length === 0) return "No calendar generated yet.";
  const today = todayString();
  const upcoming = posts
    .filter((p) => p.date >= today)
    .slice(0, 5)
    .map((p) => `${p.date} — ${p.platform} ${p.contentType}: ${p.title}`)
    .join("\n");
  return upcoming.length
    ? `Next scheduled posts:\n${upcoming}\n(${posts.length} posts in the 30-day plan)`
    : `A 30-day plan exists (${posts.length} posts).`;
};

const buildSystemPrompt = (
  profile: BusinessProfile,
  plan: string,
): string => `You are the AI marketing coach inside Cloudy, the strategy partner for a small local business. You talk to the owner like a smart friend who happens to know marketing — warm, direct, specific, zero corporate speak, never robotic.

The business you coach (from their onboarding questionnaire and research of their live social profiles):
${JSON.stringify(profile, null, 2)}

Their current content plan (so you don't repeat what's already scheduled):
${plan}

CAPTION STYLE GUIDE — read it before writing any caption:
${CAPTION_STYLE_GUIDE}

${voicePromptBlock(buildVoiceProfile(profile))}

How to answer:
- "reply" (always): your answer to the owner, 1-3 short paragraphs, plain human language, with a clear next step. No "Great question!", no clichés, no list spam.
- If they asked for content (a caption, an announcement, a post, a reel, a story, a promotion): ALSO put the finished, ready-to-paste pieces in the optional fields:
  "caption": the main caption,
  "captionLong": a longer version (only when it adds something),
  "photoInstructions": exactly what photo or video to take — subject, angle, lighting, background, props, one editing tip,
  "storyIdeas": 2-4 Instagram story ideas (polls, question boxes, BTS, countdowns),
  "hashtags": 8-12 hashtags mixing local, industry, trending and branded.
- "suggestions" (always): 3 short follow-up prompts the owner might type next.
- Use their real details — actual products, the neighbourhood, real voice from the research. If their own captions (from the brand research) use a specific style — emoji-heavy, minimal, bilingual, playful — match that style over this guide's default.
- Return ONLY valid JSON with this shape: {"reply": "...", "caption": "..." (optional), "captionLong": "..." (optional), "photoInstructions": "..." (optional), "storyIdeas": ["..."] (optional), "hashtags": ["..."] (optional), "suggestions": ["...", "...", "..."]}`;

// ---------------------------------------------------------------------------
// Fallback (no OpenAI key, or the API call failed)
// ---------------------------------------------------------------------------

function fallbackCoach(profile: BusinessProfile, message: string): CoachResponse {
  const m = message.toLowerCase();
  const name = profile.businessName;
  const loc = profile.location || "your area";
  const product = profile.products[0] ?? "your signature product";
  const p1 = product.charAt(0).toUpperCase() + product.slice(1);
  const brand = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const local = loc.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (/(caption|announce|introduce|new shop|new location|opening|launch|announcement|promotion|promote)/.test(m)) {
    return {
      reply: `Here's a ready-to-post caption for announcing something new at ${name} — written in the warm, human style real local brands use.`,
      caption: `we've got something new at ${name} 🎉\n\n${p1} is finally here — ${loc}, come see it yourself this week. we can't wait to show you.\n\nsee you soon! 💛`,
      captionLong: `we've been keeping a little secret at ${name}... 🎉\n\nfor weeks, ${p1} has been waiting in the wings. today it's finally ready, and honestly? it was worth the wait.\n\ncome by ${loc} this week — we'd love to hear what you think.\n\nsee you soon! 💛`,
      photoInstructions: `Take a photo of ${product} near your window or entrance in soft natural light — get the ${name} logo or storefront in the background, and keep the edit bright and warm.`,
      hashtags: [
        `#${brand}`,
        `#${local}`,
        "#shoplocal",
        "#smallbusiness",
        "#newpost",
        "#supportlocal",
        "#localbusiness",
        "#newopen",
      ],
      suggestions: [
        "Write a reel script for the same announcement",
        "Draft an Instagram story countdown for opening day",
        "What hashtags work best in my area?",
      ],
    };
  }
  if (/(tomorrow|post|today|schedule|calendar)/.test(m)) {
    return {
      reply: `For tomorrow at ${name}, I'd post a simple, honest photo of ${product} with a caption that tells the story behind it — that's the style performing best for local brands right now.`,
      caption: `this is ${product} at ${name} — the one people keep asking about. made fresh in ${loc}, every single day. come try it 🧡`,
      suggestions: [
        "Write a reel script for my next post",
        "Give me 5 caption ideas for this week",
        "How do I get more views on Reels?",
      ],
    };
  }
  if (/(views|dropping|engagement|followers|algorithm|grow|reach)/.test(m)) {
    return {
      reply: `The fastest fix for ${name}: post the same day and time every week, keep captions short and human (they should read like texts, not ads), reply to every comment within the first hour, and end each caption with a question to start a conversation. Consistency beats perfection — one month of steady posting moves the number more than one viral attempt.`,
      suggestions: [
        "What should I post tomorrow?",
        "Write a caption that gets comments",
        "Give me a 7-day posting plan",
      ],
    };
  }
  return {
    reply: `Happy to help with ${name}! Tell me exactly what you need and I'll give you something ready to use — a caption, a reel script, story ideas, or a plan for the week. For example: "Write me a caption to introduce my new location" or "What should I post tomorrow?".`,
    suggestions: [
      "Write a caption for my new location",
      "What should I post tomorrow?",
      "Why are my views dropping?",
    ],
  };
}

async function coachReply(
  business: Doc<"businesses">,
  posts: Doc<"posts">[],
  message: string,
  history: ThreadMessage[],
): Promise<CoachResponse> {
  const profile = buildProfile(business);
  if (!OPENAI_KEY) return fallbackCoach(profile, message);

  const historyItems: ChatItem[] = history.slice(-10).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.role === "assistant" ? replyText(m.content) : m.content,
  }));

  const content = await chat(
    [
      { role: "system", content: buildSystemPrompt(profile, planNote(posts)) },
      ...historyItems,
      { role: "user", content: message },
    ],
    1400,
  );
  if (!content) return fallbackCoach(profile, message);
  return parseCoachResponse(content) ?? fallbackCoach(profile, message);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The owner's coach thread (reactively updates as messages are added). */
export const getThread = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return null;
    const thread = await ctx.db
      .query("coachThreads")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .first();
    return thread?.messages ?? [];
  },
});

/** Start a fresh conversation. */
export const clearThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return;
    const thread = await ctx.db
      .query("coachThreads")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .first();
    if (thread) await ctx.db.delete(thread._id);
  },
});

/**
 * Ask the coach anything. The action appends the user's message and the
 * coach's answer to the thread, then returns the answer so the client can
 * render it immediately.
 */
export const askCoach = action({
  args: { message: v.string() },
  handler: async (ctx, { message }): Promise<CoachResponse> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const clean = message.trim();
    if (!clean) throw new Error("Message is empty");

    const featCheck = await ctx.runQuery(internal.billing.canUseFeature, {
      userId,
      feature: "coachMessages",
    });
    if (!featCheck.ok) throw new Error(featCheck.reason);

    const business = await ctx.runQuery(
      internal.businesses.getBusinessByUser,
      { userId },
    );
    if (!business) throw new Error("No business profile yet");

    const posts = await ctx.runQuery(
      internal.businesses.getPostsByBusiness,
      { businessId: business._id },
    );
    const thread = await ctx.runQuery(internal.coach.getThreadByBusiness, {
      businessId: business._id,
    });
    const history = thread?.messages ?? [];

    await ctx.runMutation(internal.coach.appendMessages, {
      businessId: business._id,
      messages: [{ role: "user", content: clean, createdAt: Date.now() }],
    });

    const result = await coachReply(business, posts, clean, history);
    await ctx.runMutation(internal.coach.appendMessages, {
      businessId: business._id,
      messages: [
        { role: "assistant", content: JSON.stringify(result), createdAt: Date.now() },
      ],
    });
    await ctx.runMutation(internal.billing.incrementUsage, {
      userId,
      feature: "coachMessages",
    });
    return result;
  },
});

/**
 * Returns the user's coach message usage so the frontend can display
 * remaining messages in the coaching UI.
 */
export const getCoachUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!sub) return { plan: "none" as const, used: 0, total: 0, remaining: 0 };
    // Coach messages draw from the shared AI-credit pool (1 credit each).
    const limits = getLimitsFor(sub.plan);
    const periodStart = sub.currentPeriodStart ?? sub.createdAt;
    const usage = sub.usage as { periodStart?: number; credits?: number; coachMessages?: number } | undefined;
    const live = usage && (usage.periodStart ?? 0) >= periodStart;
    const used = live ? (usage?.coachMessages ?? 0) : 0;
    const creditsUsed = live ? (usage?.credits ?? 0) : 0;
    return {
      plan: sub.plan,
      used,
      total: limits.credits,
      remaining: Math.max(0, limits.credits - creditsUsed),
    };
  },
});

// ---------------------------------------------------------------------------
// Internal helpers — used by the askCoach action above
// ---------------------------------------------------------------------------

export const getThreadByBusiness = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) =>
    ctx.db
      .query("coachThreads")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first(),
});

export const appendMessages = internalMutation({
  args: {
    businessId: v.id("businesses"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { businessId, messages }) => {
    const existing = await ctx.db
      .query("coachThreads")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: [...existing.messages, ...messages].slice(-80),
      });
    } else {
      await ctx.db.insert("coachThreads", { businessId, messages });
    }
  },
});
