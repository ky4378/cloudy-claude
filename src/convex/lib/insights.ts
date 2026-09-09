/**
 * Cloudy — AI insight generators.
 *
 * Marketing strategy, trend analysis, recommendations, Reel ideas, Reel
 * scripts, captions and hashtags. Each generator tries the AI provider first
 * (see ./ai) and falls back to the deterministic engine so every feature
 * works even without an API key. Only import from "use node" modules.
 */

import type { Infer } from "convex/values";
import type {
  recommendationsValidator,
  strategyValidator,
  trendReportValidator,
} from "../schema";
import {
  BUSINESS_TYPES,
  CAPTION_STYLE_GUIDE,
  typeKB,
  type BusinessProfile,
  type DayPlan,
  type VideoScript,
} from "./strategy";
import { FOCUS_LABEL, strategyFocus } from "./focus";
import { buildVoiceProfile, voicePromptBlock } from "./voice";
import {
  AI_CONFIGURED,
  asNumber,
  asString,
  asStringArray,
  businessContext,
  businessTypeLabel,
  chatJson,
  STRATEGIST_SYSTEM,
} from "./ai";
import { normalizeHashtagGroups, normalizeVideoScript } from "./planGen";

export type MarketingStrategy = Infer<typeof strategyValidator>;
export type TrendReport = Infer<typeof trendReportValidator>;
export type Recommendations = Infer<typeof recommendationsValidator>;

export interface ReelIdea {
  title: string;
  hook: string;
  concept: string;
  format: string;
  whyItWorks: string;
}

const voiceBlock = (p: BusinessProfile) => voicePromptBlock(buildVoiceProfile(p));

const cityWord = (location: string) => location.split(",")[0]?.trim() || "your area";

// ---------------------------------------------------------------------------
// 1. Marketing strategy
// ---------------------------------------------------------------------------

export function fallbackStrategy(p: BusinessProfile, depth: "basic" | "advanced" | "full" = "basic"): MarketingStrategy {
  const focus = strategyFocus(p);
  const kb = typeKB(p.businessType);
  const label = businessTypeLabel(p.businessType).toLowerCase();
  const city = cityWord(p.location);
  const goal = p.mainGoal ?? p.goals[0] ?? "Build trust";
  const tone = (p.tone ?? p.brandPersonality[0] ?? "friendly").toLowerCase();

  const focusCopy: Record<string, { summary: string; theme: string; cadence: string }> = {
    awareness: {
      summary: `${p.businessName} is early in its Instagram journey, so this month is about showing up consistently and teaching ${p.targetCustomers || "local customers"} why a ${label} in ${city} is worth following. Educational and behind-the-scenes posts build trust fast; the goal "${goal}" is served by making every post easy to save and share.`,
      theme: "Meet the people and the craft behind the counter",
      cadence: "5 posts a week — 2 Reels, 2 Photo posts, 1 Carousel — plus daily Stories.",
    },
    community: {
      summary: `${p.businessName} already has an audience; the opportunity is to turn followers into regulars. This month leans on community content — questions, polls, customer moments and local collaborations in ${city} — while keeping ${goal.toLowerCase()} as the north star.`,
      theme: "Your regulars, your neighbourhood, your story",
      cadence: "5–6 posts a week with interactive Stories every day.",
    },
    conversion: {
      summary: `${p.businessName} has an engaged following, so the month is built to convert attention into ${goal.toLowerCase()}: clear offers, social proof and direct calls to action, balanced with the ${tone} content that earned the audience in the first place.`,
      theme: "Make it effortless to say yes",
      cadence: "Daily posting — Reels on peak evenings, offers mid-week, proof on weekends.",
    },
  };
  const copy = focusCopy[focus];

  const pillars = [
    { name: "Signature & spotlight", description: `Your ${p.products[0] ?? "best-sellers"} shown beautifully — the reason people visit.`, share: 30 },
    { name: "Behind the scenes", description: `The people and process behind ${p.businessName} — the trust builder.`, share: 25 },
    { name: "Educate & help", description: `Tips ${p.targetCustomers || "your customers"} actually use — the reason to follow.`, share: 25 },
    { name: "Community & proof", description: `Customer moments, reviews and ${city} collaborations — the reason to come back.`, share: 20 },
  ];

  const opportunities = [
    {
      title: p.differentiator ? "Own what makes you different" : "Own a signature moment",
      why: p.differentiator
        ? `"${p.differentiator}" is a story competitors can't copy — most local ${label}s never say it out loud.`
        : `Most ${label}s in ${city} post the same product shots. A recurring signature format is memorable.`,
      contentIdea: p.differentiator
        ? `A Reel: "The one thing we do differently at ${p.businessName}" — show it, don't tell it.`
        : `A weekly "${kb.emoji} ${kb.shots[0]?.theme ?? "Signature spotlight"}" Reel with the same hook every time.`,
    },
    {
      title: `Be the ${label} of ${city}`,
      why: `Local hashtags and landmarks are under-used by small businesses — they are the cheapest reach available.`,
      contentIdea: `A Carousel: "5 things to do in ${city} (and where to ${kb.tips[0]?.toLowerCase().includes("coffee") ? "get coffee" : "stop by"} after)".`,
    },
    {
      title: "Turn customers into content",
      why: `Real customer moments outperform polished ads for local businesses — they are proof, not promotion.`,
      contentIdea: `A Story series asking regulars one question, reposted weekly as a Reel.`,
    },
  ];
  if (depth !== "basic" && p.challenges) {
    opportunities.push({
      title: "Solve your biggest challenge in public",
      why: `You said: "${p.challenges}". Naming the challenge in your content builds trust and invites help from your audience.`,
      contentIdea: `A candid Reel about it, ending with a question box in Stories.`,
    });
  }

  return {
    generatedAt: Date.now(),
    source: "engine",
    summary: copy.summary,
    positioning: `${p.businessName}: the ${tone} ${label} in ${city} for ${p.targetCustomers || "locals who care about quality"}${p.differentiator ? ` — ${p.differentiator}` : ""}.`,
    focus: FOCUS_LABEL[focus],
    monthlyTheme: copy.theme,
    pillars,
    opportunities,
    postingCadence: copy.cadence,
    bestTimes: ["7:00 PM weekdays", "12:00 PM lunch", "10:00 AM weekends"],
  };
}

export async function generateStrategyAI(
  p: BusinessProfile,
  depth: "basic" | "advanced" | "full",
): Promise<MarketingStrategy> {
  const fallback = fallbackStrategy(p, depth);
  if (!AI_CONFIGURED) return fallback;

  const depthNote =
    depth === "basic"
      ? "Keep it tight: 3 pillars, 3 opportunities."
      : depth === "advanced"
        ? "Go deeper: 4 pillars, 4 opportunities, and make the positioning sharp."
        : "Full strategy: 4 pillars, 5 opportunities, sharp positioning and a monthly theme that ties every post together.";

  const raw = await chatJson<Record<string, unknown>>(
    `${STRATEGIST_SYSTEM}\n\n${voiceBlock(p)}`,
    `Create the recommended Instagram marketing strategy for the next 30 days.

BUSINESS CONTEXT:
${businessContext(p)}

${depthNote}

Return JSON:
{
  "summary": "2-3 sentences: the recommended strategy for this month, in plain words the owner will understand",
  "positioning": "One sentence: how this business should position itself",
  "focus": "Build awareness | Build community | Drive conversions",
  "monthlyTheme": "A short theme for the month (under 10 words)",
  "pillars": [{ "name": "…", "description": "…", "share": 30 }],
  "opportunities": [{ "title": "…", "why": "…", "contentIdea": "…" }],
  "postingCadence": "e.g. 5 posts a week — 2 Reels, 2 Photos, 1 Carousel — plus daily Stories",
  "bestTimes": ["7:00 PM weekdays", "…"]
}
Pillar shares must sum to 100.`,
    { maxTokens: 1600, temperature: 0.7 },
  );
  if (!raw) return fallback;

  const pillars = Array.isArray(raw.pillars)
    ? raw.pillars
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          return {
            name: asString(o.name),
            description: asString(o.description),
            share: asNumber(o.share, 25),
          };
        })
        .filter((x) => x.name && x.description)
        .slice(0, 5)
    : [];
  const opportunities = Array.isArray(raw.opportunities)
    ? raw.opportunities
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          return {
            title: asString(o.title),
            why: asString(o.why),
            contentIdea: asString(o.contentIdea),
          };
        })
        .filter((x) => x.title && x.why)
        .slice(0, 6)
    : [];
  if (pillars.length < 2 || opportunities.length < 2) return fallback;

  return {
    generatedAt: Date.now(),
    source: "ai",
    summary: asString(raw.summary, fallback.summary),
    positioning: asString(raw.positioning, fallback.positioning),
    focus: asString(raw.focus, fallback.focus),
    monthlyTheme: asString(raw.monthlyTheme, fallback.monthlyTheme),
    pillars,
    opportunities,
    postingCadence: asString(raw.postingCadence, fallback.postingCadence),
    bestTimes: asStringArray(raw.bestTimes, 4).length
      ? asStringArray(raw.bestTimes, 4)
      : fallback.bestTimes,
  };
}

/** Compact one-paragraph version handed to the plan generator. */
export const strategyNote = (s: MarketingStrategy): string =>
  `${s.summary}\nPositioning: ${s.positioning}\nTheme: ${s.monthlyTheme}\nPillars: ${s.pillars
    .map((p) => `${p.name} (${p.share}%)`)
    .join(", ")}\nOpportunities: ${s.opportunities.map((o) => o.title).join("; ")}`;

// ---------------------------------------------------------------------------
// 2. Trend analysis
// ---------------------------------------------------------------------------

export function fallbackTrends(p: BusinessProfile): TrendReport {
  const kb = typeKB(p.businessType);
  const label = businessTypeLabel(p.businessType).toLowerCase();
  const city = cityWord(p.location);
  return {
    generatedAt: Date.now(),
    source: "engine",
    trends: [
      {
        title: "\"Day in the life\" Reels",
        description: `Short, honest behind-the-scenes Reels keep outperforming polished ads for local ${label}s.`,
        howToUse: `Film 6–8 clips of a normal shift at ${p.businessName}, cut to a calm trending track, hook: "A regular ${kb.shots[0]?.theme.toLowerCase() ?? "day"} at ${p.businessName}".`,
        format: "Reel",
        momentum: "steady",
      },
      {
        title: "Photo-dump carousels",
        description: "Casual multi-photo carousels feel personal and get high saves and shares.",
        howToUse: `Ten unedited-looking photos from the week, captioned like a text to a friend.`,
        format: "Carousel",
        momentum: "rising",
      },
      {
        title: `Local "best of ${city}" content`,
        description: "Location-led content rides local hashtags and gets shared by neighbours.",
        howToUse: `A Carousel of your favourite spots in ${city} — including yourself last, humbly.`,
        format: "Carousel",
        momentum: "steady",
      },
      {
        title: "Text-on-screen hooks",
        description: "Reels that open with a bold on-screen line in the first second retain viewers longest.",
        howToUse: `Start every Reel with the hook as large text over the first clip — e.g. "${kb.tips[0] ?? "Here's what nobody tells you"}".`,
        format: "Reel",
        momentum: "peaking",
      },
    ],
  };
}

export async function generateTrendsAI(
  p: BusinessProfile,
  depth: "basic" | "advanced" | "full",
): Promise<TrendReport> {
  const fallback = fallbackTrends(p);
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ trends?: unknown[] }>(
    STRATEGIST_SYSTEM,
    `Identify the Instagram content trends and opportunities that are relevant RIGHT NOW for this specific business and its industry.

BUSINESS CONTEXT:
${businessContext(p)}

${depth === "basic" ? "Return 3 trends." : "Return 5 trends, including at least one industry-specific and one location-specific trend."}
For each trend explain exactly how THIS business should use it.

Return JSON:
{ "trends": [ { "title": "…", "description": "…", "howToUse": "…", "format": "Reel | Carousel | Photo | Story", "momentum": "rising | steady | peaking" } ] }`,
    { maxTokens: 1400, temperature: 0.7 },
  );
  const trends = Array.isArray(raw?.trends)
    ? raw!.trends
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          const m = asString(o.momentum, "steady");
          return {
            title: asString(o.title),
            description: asString(o.description),
            howToUse: asString(o.howToUse),
            format: asString(o.format, "Reel"),
            momentum: (m === "rising" || m === "peaking" ? m : "steady") as
              | "rising"
              | "steady"
              | "peaking",
          };
        })
        .filter((t) => t.title && t.howToUse)
        .slice(0, 6)
    : [];
  if (trends.length < 2) return fallback;
  return { generatedAt: Date.now(), source: "ai", trends };
}

// ---------------------------------------------------------------------------
// 3. Recommendations
// ---------------------------------------------------------------------------

export interface PlanProgress {
  total: number;
  done: number;
  skipped: number;
  daysElapsed: number;
  typeMix: Record<string, number>;
}

export function fallbackRecommendations(p: BusinessProfile, progress?: PlanProgress): Recommendations {
  const items: Recommendations["items"] = [];
  const label = businessTypeLabel(p.businessType).toLowerCase();
  if (progress && progress.daysElapsed > 3 && progress.done / Math.max(1, progress.daysElapsed) < 0.5) {
    items.push({
      title: "Protect your posting streak",
      detail: `You've posted ${progress.done} of the ${progress.daysElapsed} days so far. Batch-film two Reels this weekend so the next week is covered before it starts.`,
      priority: "high",
      category: "consistency",
    });
  }
  if (p.postingFrequency === "rarely" || p.postingFrequency === "1to2x") {
    items.push({
      title: "Start with Stories every day",
      detail: "Stories are the lowest-effort way to stay visible. One behind-the-scenes Story a day keeps you top of mind between posts.",
      priority: "high",
      category: "consistency",
    });
  }
  if (p.engagement === "low") {
    items.push({
      title: "Ask one question per post",
      detail: `End captions with a question ${p.targetCustomers || "your customers"} can answer in five words. Reply to every comment within an hour — Instagram rewards fast conversations.`,
      priority: "high",
      category: "engagement",
    });
  }
  items.push({
    title: "Pin your best three posts",
    detail: `New visitors decide in seconds. Pin a signature ${p.products[0] ?? "product"} post, a behind-the-scenes Reel and a customer moment to the top of your grid.`,
    priority: "medium",
    category: "growth",
  });
  items.push({
    title: `Use ${cityWord(p.location)} location tags on everything`,
    detail: `Location tags and local hashtags are how nearby ${p.targetCustomers || "customers"} discover a ${label} — add them to every post and Story.`,
    priority: "medium",
    category: "growth",
  });
  if (p.mainGoal?.toLowerCase().includes("booking") || p.mainGoal?.toLowerCase().includes("sales")) {
    items.push({
      title: "Make the next step obvious",
      detail: `Your main goal is "${p.mainGoal}". Put the booking/order link in your bio, mention it in every third caption and add a "Book" button to your profile.`,
      priority: "high",
      category: "conversion",
    });
  }
  items.push({
    title: "Review what worked every Sunday",
    detail: "Mark posts as Posted in Cloudy, then check which format got the most saves and shares. Your next month should double down on it.",
    priority: "low",
    category: "content",
  });
  return { generatedAt: Date.now(), source: "engine", items: items.slice(0, 6) };
}

export async function generateRecommendationsAI(
  p: BusinessProfile,
  progress?: PlanProgress,
): Promise<Recommendations> {
  const fallback = fallbackRecommendations(p, progress);
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ items?: unknown[] }>(
    STRATEGIST_SYSTEM,
    `Give this business owner 5 personalized, prioritized marketing recommendations for the coming weeks.

BUSINESS CONTEXT:
${businessContext(p)}
${
  progress
    ? `\nPLAN PROGRESS: ${progress.done} posted, ${progress.skipped} skipped out of ${progress.total} planned; ${progress.daysElapsed} days into the plan. Content mix so far: ${Object.entries(progress.typeMix)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}.`
    : ""
}

Each recommendation must be specific to this business (its goal, challenges, audience, tone and where its account is today) and immediately actionable.

Return JSON:
{ "items": [ { "title": "…", "detail": "2-3 sentences", "priority": "high | medium | low", "category": "content | growth | engagement | conversion | consistency" } ] }`,
    { maxTokens: 1400, temperature: 0.7 },
  );
  const items = Array.isArray(raw?.items)
    ? raw!.items
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          const pr = asString(o.priority, "medium");
          return {
            title: asString(o.title),
            detail: asString(o.detail),
            priority: (pr === "high" || pr === "low" ? pr : "medium") as "high" | "medium" | "low",
            category: asString(o.category, "content"),
          };
        })
        .filter((i) => i.title && i.detail)
        .slice(0, 6)
    : [];
  if (items.length < 2) return fallback;
  return { generatedAt: Date.now(), source: "ai", items };
}

// ---------------------------------------------------------------------------
// 4. Reel ideas
// ---------------------------------------------------------------------------

export function fallbackReelIdeas(p: BusinessProfile, count: number, seed = 0): ReelIdea[] {
  const kb = typeKB(p.businessType);
  const shots = kb.shots;
  const ideas: ReelIdea[] = shots.map((s, i) => ({
    title: s.theme,
    hook: [
      `What customers don't see before we open…`,
      `POV: your first visit to ${p.businessName}`,
      `Stop scrolling — ${s.subject} just got better.`,
      `The ${s.theme.toLowerCase()} nobody talks about`,
      `3 seconds of ${s.subject}. You're welcome.`,
    ][(i + seed) % 5],
    concept: `A 20-second Reel built around ${s.subject}: ${s.angle} ${s.setting}, ${s.lighting}. Cut on the beat, end on your CTA card.`,
    format: "Reel",
    whyItWorks: `${s.theme} content is the highest-saved format for ${businessTypeLabel(p.businessType).toLowerCase()}s — specific, visual and easy to film in one take.`,
  }));
  const start = seed % Math.max(1, ideas.length);
  return [...ideas.slice(start), ...ideas.slice(0, start)].slice(0, count);
}

export async function generateReelIdeasAI(
  p: BusinessProfile,
  count: number,
  seed = 0,
): Promise<ReelIdea[]> {
  const fallback = fallbackReelIdeas(p, count, seed);
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ ideas?: unknown[] }>(
    `${STRATEGIST_SYSTEM}\n\n${voiceBlock(p)}`,
    `Give ${count} practical Instagram Reel ideas this business can film on a phone this week.

BUSINESS CONTEXT:
${businessContext(p)}

Each idea needs a scroll-stopping hook (under 12 words), a concept the owner can film in under 30 minutes, and why it works for this audience.

Return JSON:
{ "ideas": [ { "title": "…", "hook": "…", "concept": "…", "format": "Reel", "whyItWorks": "…" } ] }`,
    { maxTokens: 1400, temperature: 0.9 },
  );
  const ideas = Array.isArray(raw?.ideas)
    ? raw!.ideas
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          return {
            title: asString(o.title),
            hook: asString(o.hook),
            concept: asString(o.concept),
            format: asString(o.format, "Reel"),
            whyItWorks: asString(o.whyItWorks),
          };
        })
        .filter((i) => i.title && i.hook && i.concept)
        .slice(0, count)
    : [];
  return ideas.length >= Math.min(2, count) ? ideas : fallback;
}

// ---------------------------------------------------------------------------
// 5. Reel scripts
// ---------------------------------------------------------------------------

export function fallbackReelScript(p: BusinessProfile, idea: string, hook?: string): VideoScript {
  const kb = typeKB(p.businessType);
  return {
    hook: hook ?? `Stop scrolling — ${idea.toLowerCase()} at ${p.businessName}.`,
    scenes: [
      `Scene 1 — The hook (0–3s): open on the most striking shot of ${idea.toLowerCase()}, hook text large on screen.`,
      `Scene 2 — The substance (3–15s): show ${idea.toLowerCase()} from two angles while text lists the top 3 reasons ${p.targetCustomers || "customers"} care.`,
      `Scene 3 — The proof (15–22s): a real customer or team moment — unscripted, warm, ${(p.tone ?? "friendly").toLowerCase()}.`,
    ],
    ending: `End on a slow push-in and a card: "${p.businessName} — ${p.mainGoal?.toLowerCase().includes("booking") ? "book your spot, link in bio" : "come say hi"}".`,
    music: "Calm trending instrumental — search 'cozy' or 'warm acoustic' in the audio library",
    length: "20–30 seconds",
    textOverlays: [
      `Hook: "${hook ?? idea}"`,
      `Middle: "${kb.tips[0] ?? "Details matter"}"`,
      `CTA: "${p.mainGoal ?? "Save this for your next visit"}"`,
    ],
    cameraMovement: "Handheld tracking shot, then a slow push-in for the ending",
    broll: [
      `Close-ups of ${p.products[0] ?? "your signature product"}`,
      "Hands at work",
      `The entrance / signage in ${cityWord(p.location)}`,
      "A customer reaction",
    ],
  };
}

export async function generateReelScriptAI(
  p: BusinessProfile,
  idea: string,
  opts: { hook?: string; depth: "basic" | "advanced" | "full" },
): Promise<VideoScript> {
  const fallback = fallbackReelScript(p, idea, opts.hook);
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ videoScript?: unknown }>(
    `${STRATEGIST_SYSTEM}\n\n${voiceBlock(p)}`,
    `Write a complete, filmable Instagram Reel script.

BUSINESS CONTEXT:
${businessContext(p)}

REEL IDEA: ${idea}
${opts.hook ? `HOOK TO USE: ${opts.hook}` : ""}
${opts.depth === "basic" ? "Keep it simple: 3 scenes the owner can film alone on a phone." : "Make it detailed: 3–4 scenes with exact shot descriptions, timing and on-screen text."}

Return JSON:
{ "videoScript": { "hook": "…", "scenes": ["Scene 1 — …", "Scene 2 — …", "Scene 3 — …"], "ending": "…", "music": "…", "length": "…", "textOverlays": ["…", "…", "…"], "cameraMovement": "…", "broll": ["…", "…", "…", "…"] } }`,
    { maxTokens: 1200, temperature: 0.8 },
  );
  const script = normalizeVideoScript(raw?.videoScript, idea);
  return script ?? fallback;
}

// ---------------------------------------------------------------------------
// 6. Captions
// ---------------------------------------------------------------------------

export function fallbackCaptions(p: BusinessProfile, post: Pick<DayPlan, "title" | "subject" | "cta" | "captionLong" | "captionShort">, count: number): string[] {
  const base = [post.captionLong, post.captionShort];
  const extra = [
    `${post.subject.charAt(0).toUpperCase() + post.subject.slice(1)} — a small thing we're proud of at ${p.businessName}.\n\n${post.cta}`,
    `if you know, you know. ${post.subject.toLowerCase()} is back today at ${p.businessName}.\n\n${post.cta.toLowerCase()}`,
    `we could talk about ${post.subject.toLowerCase()} all day. instead — come see for yourself.\n\n${post.cta}`,
  ];
  return [...base, ...extra].filter(Boolean).slice(0, count);
}

export async function generateCaptionsAI(
  p: BusinessProfile,
  post: DayPlan | (Pick<DayPlan, "title" | "subject" | "cta" | "captionLong" | "captionShort" | "goal" | "contentType"> & { hook?: string }),
  count: number,
): Promise<string[]> {
  const fallback = fallbackCaptions(p, post, count);
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ captions?: unknown }>(
    `${STRATEGIST_SYSTEM}\n\n${voiceBlock(p)}\n\nCAPTION STYLE GUIDE:\n${CAPTION_STYLE_GUIDE}`,
    `Write ${count} alternative Instagram captions for this post. Each under 120 words, human and specific, ending with the call to action. Vary the angle (story, tip, question, offer).

BUSINESS CONTEXT:
${businessContext(p)}

POST: ${post.title}
Subject: ${post.subject}
Format: ${post.contentType}
Goal: ${post.goal}
${post.hook ? `Hook: ${post.hook}` : ""}
CTA: ${post.cta}

Return JSON: { "captions": ["…", "…"] }`,
    { maxTokens: 1200, temperature: 0.9 },
  );
  const captions = asStringArray(raw?.captions, count);
  return captions.length ? captions : fallback;
}

// ---------------------------------------------------------------------------
// 7. Hashtags
// ---------------------------------------------------------------------------

export async function generateHashtagsAI(
  p: BusinessProfile,
  post: Pick<DayPlan, "title" | "subject" | "contentType" | "hashtagGroups">,
): Promise<DayPlan["hashtagGroups"]> {
  const fallback = post.hashtagGroups;
  if (!AI_CONFIGURED) return fallback;
  const raw = await chatJson<{ hashtagGroups?: unknown }>(
    STRATEGIST_SYSTEM,
    `Generate a fresh, relevant hashtag set for this Instagram post. Mix reach sizes: a few big industry tags, several mid-size niche tags, local tags for the area, and branded tags.

BUSINESS CONTEXT:
${businessContext(p)}

POST: ${post.title} — ${post.subject} (${post.contentType})

Return JSON:
{ "hashtagGroups": { "local": ["#…"], "industry": ["#…"], "trending": ["#…"], "branded": ["#…"] } }
Local: 5-6 tags including the city/area. Industry: 5-6. Trending: 3. Branded: 2-3 including the business name. Every tag starts with #, no spaces.`,
    { maxTokens: 600, temperature: 0.7 },
  );
  const groups = normalizeHashtagGroups(raw?.hashtagGroups);
  return groups ?? fallback;
}

// Re-export so callers only need one import.
export { BUSINESS_TYPES };
