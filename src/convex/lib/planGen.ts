/**
 * Cloudy — 30-day plan generation (AI + deterministic fallback).
 *
 * Pure node helpers shared by the plan actions in ../plan.ts and the
 * granular AI endpoints in ../ai.ts. Only import from "use node" modules.
 */

import {
  buildCalendarPersonalized,
  buildDayPlanPersonalized,
  CAPTION_STYLE_GUIDE,
  formatDate,
  type BusinessProfile,
  type ContentType,
  type DayPlan,
  type Platform,
} from "./strategy";
import { buildVoiceProfile, voicePromptBlock } from "./voice";
import { AI_CONFIGURED, businessContext, chat, parseJson } from "./ai";

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export const PLAN_SYSTEM_PROMPT = `You are the AI marketing strategist behind Cloudy, a product that gives local businesses a complete, ready-to-execute 30-day Instagram content plan.

You write like a seasoned agency strategist who knows exactly what performs on Instagram for small local businesses. Every recommendation must be concrete and actionable: the owner should be able to pick up their phone, follow the photo instructions shot-for-shot, and paste the captions and hashtags without editing.

CRITICAL: Understand the REAL business from what they sell (their products/services), NOT just their industry category. A juice bar marked as "café" sells juice, not coffee. An acai shop sells acai bowls, not lattes. Generate content specific to what they ACTUALLY offer.

Rules you must follow:
- Return ONLY valid JSON. No markdown, no code fences, no commentary.
- Every day gets exactly one Instagram post. Vary the content types — never repeat the same format back-to-back.
- Assign each post one goal from the business's goals list; the main goal should appear most often.
- "hook" is the first line the viewer sees: the spoken/on-screen hook for a Reel or the opening line of the caption. Under 14 words, curiosity-driven, specific to this business.
- "photoInstructions" must be shot-by-shot: exact subject, camera angle, lighting, background, props, and one editing suggestion — tailored to this specific business, its actual products and its location.
- Reel and Video Post days MUST include a complete "videoScript": hook (first 3 seconds), three scenes, ending, music suggestion, length, three text overlays, camera movement, and four B-roll ideas.
- "time" is the suggested posting time in 12-hour format (e.g. "7:00 PM") chosen for the audience and format.
- "hashtagGroups.local" must include the city/area and a local angle; "hashtagGroups.branded" must include the business name.
- Captions follow the BRAND VOICE PROFILE block. "captionShort" under 60 words, "captionLong" under 130 words, and every post ends with a clear, specific call to action in "cta".
- Honour the owner's content preferences: lean into the content they like, never produce the content they said they do not want.
- "storyIdeas" are interactive: polls, quizzes, countdowns, question boxes, behind-the-scenes, this-or-that, etc.
- Titles are short, human post ideas — 8 words max.
- Be specific to the location: name real neighbourhoods, landmarks or local habits where they fit naturally.
- Personalize to where this account actually is today (followers, posting frequency, engagement): small or inconsistent accounts get consistency + educational, trust-building content; mid-sized regular posters get community content; established engaged accounts get conversion content.
- When brand research from live profiles is provided, mirror the brand's real voice and use their actual product names and themes.
- MOST IMPORTANT: Every single post idea must feature or reference what they actually sell. If they sell acai bowls with berries and granola, create content about those. If they sell juice, create juice-specific content. Never default to generic industry templates. Be creative and specific to THIS business and what they offer.`

CAPTION STYLE GUIDE — read it before writing any caption:
${CAPTION_STYLE_GUIDE}`;

// ---------------------------------------------------------------------------
// Validation + normalization of model output
// ---------------------------------------------------------------------------

const VALID_PLATFORMS = new Set<Platform>(["Instagram"]);
const VALID_TYPES = new Set<ContentType>([
  "Reel",
  "Carousel",
  "Photo Post",
  "Story Post",
  "Video Post",
]);

export const TIME_SLOTS: Record<ContentType, string[]> = {
  Reel: ["7:00 PM", "6:30 PM", "8:00 PM", "12:00 PM"],
  Carousel: ["12:00 PM", "4:00 PM", "2:00 PM", "6:00 PM"],
  "Photo Post": ["11:00 AM", "3:00 PM", "1:00 PM", "5:00 PM"],
  "Story Post": ["9:00 AM", "10:00 AM", "8:00 AM", "4:30 PM"],
  "Video Post": ["6:30 PM", "7:30 PM", "12:00 PM", "8:00 PM"],
};

const TYPE_ROTATION: ContentType[] = ["Reel", "Carousel", "Photo Post", "Story Post"];

export const addDays = (start: string, offset: number): string => {
  const d = new Date(`${start}T00:00:00`);
  d.setDate(d.getDate() + offset);
  return formatDate(d);
};

const str = (x: unknown, fallback: string): string =>
  typeof x === "string" && x.trim() ? x.trim() : fallback;

const arr = (x: unknown): string[] =>
  Array.isArray(x)
    ? x.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    : [];

export function normalizeVideoScript(raw: unknown, title: string): DayPlan["videoScript"] | null {
  if (!raw || typeof raw !== "object") return null;
  const vs = raw as Record<string, unknown>;
  const scenes = arr(vs.scenes);
  if (scenes.length < 2) return null;
  const textOverlays = arr(vs.textOverlays);
  const broll = arr(vs.broll);
  return {
    hook: str(vs.hook, title),
    scenes,
    ending: str(vs.ending, "End with your CTA on screen."),
    music: str(vs.music, "Trending upbeat track"),
    length: str(vs.length, "30–45 seconds"),
    textOverlays: textOverlays.length ? textOverlays : ["Your hook text"],
    cameraMovement: str(vs.cameraMovement, "Slow push-in"),
    broll: broll.length ? broll : ["Close-up detail shots"],
  };
}

export function normalizeHashtagGroups(raw: unknown): DayPlan["hashtagGroups"] | null {
  const hg = (raw ?? {}) as Record<string, unknown>;
  const groups = {
    local: arr(hg.local).slice(0, 8),
    industry: arr(hg.industry).slice(0, 6),
    trending: arr(hg.trending).slice(0, 5),
    branded: arr(hg.branded).slice(0, 4),
  };
  if (groups.local.length === 0 && groups.industry.length === 0) return null;
  return groups;
}

export function normalizeDay(
  raw: unknown,
  dayIndex: number,
  date: string,
  fallbackTime: string,
): DayPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const platform: Platform = VALID_PLATFORMS.has(r.platform as Platform)
    ? (r.platform as Platform)
    : "Instagram";
  const contentType: ContentType = VALID_TYPES.has(r.contentType as ContentType)
    ? (r.contentType as ContentType)
    : "Photo Post";
  const time = /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(String(r.time ?? ""))
    ? String(r.time).toUpperCase().replace(/\s?(AM|PM)$/i, " $1")
    : fallbackTime;
  const title = str(r.title, `Day ${dayIndex + 1} highlight`);
  const subject = str(r.subject, title);

  const hashtagGroups = normalizeHashtagGroups(r.hashtagGroups);
  if (!hashtagGroups) return null;

  let videoScript: DayPlan["videoScript"] = undefined;
  if (contentType === "Reel" || contentType === "Video Post") {
    const vs = normalizeVideoScript(r.videoScript, title);
    if (!vs) return null;
    videoScript = vs;
  }

  const storyIdeas = arr(r.storyIdeas).slice(0, 4);

  return {
    dayIndex,
    date,
    time,
    platform,
    contentType,
    goal: str(r.goal, "Build trust"),
    title,
    subject,
    hook: str(r.hook, videoScript?.hook ?? title),
    photoInstructions: str(
      r.photoInstructions,
      "Take a clear photo of your product in good natural light.",
    ),
    videoScript,
    captionShort: str(r.captionShort, title),
    captionLong: str(r.captionLong, title),
    cta: str(r.cta, "Tap the link in bio to learn more."),
    hashtagGroups,
    storyIdeas: storyIdeas.length ? storyIdeas : ["Poll: your favourite pick?"],
  };
}

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

function buildBatchPrompt(
  profile: BusinessProfile,
  fromDay: number,
  count: number,
  startDate: string,
  strategyNote?: string,
  excludedIdeas?: string[],
  liveTrendsPrompt?: string,
): string {
  const days = Array.from({ length: count }, (_, i) => {
    const dayIndex = fromDay + i;
    const date = addDays(startDate, dayIndex);
    const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `Day ${dayIndex + 1} — ${label} (${date})`;
  }).join("\n");

  const excludedSection = excludedIdeas && excludedIdeas.length > 0
    ? `\nIDEAS TO AVOID (used by other ${profile.businessType}s, not trending):\n${excludedIdeas.slice(0, 20).join("\n")}\nDO NOT repeat these ideas unless they're a trending topic.\n`
    : "";

  return `Generate part of the 30-day Instagram plan for this business.

BUSINESS CONTEXT (from the owner's questionnaire):
${businessContext(profile)}
${strategyNote ? `\nMARKETING STRATEGY FOR THIS MONTH:\n${strategyNote}\n` : ""}${excludedSection}${liveTrendsPrompt || ""}This is part of a 30-day plan starting ${startDate}. Generate the following days:
${days}

Return JSON with this exact shape:
{
  "days": [
    {
      "dayIndex": 0,
      "platform": "Instagram",
      "contentType": "Reel",
      "goal": "Increase sales",
      "title": "Short post idea (8 words max)",
      "subject": "What the post is about",
      "hook": "The first line the viewer sees",
      "photoInstructions": "Shot-by-shot brief: subject, angle, lighting, background, props, editing tip",
      "videoScript": null,
      "captionShort": "A short caption, under 60 words",
      "captionLong": "The full caption, under 130 words",
      "cta": "Specific call to action",
      "time": "7:00 PM",
      "hashtagGroups": {
        "local": ["#city", "#localangle", "#neighbourhood", "#smallbusiness", "#street", "#district"],
        "industry": ["#industrytag1", "#industrytag2", "#industrytag3", "#industrytag4"],
        "trending": ["#trend1", "#trend2", "#trend3"],
        "branded": ["#brandname", "#brandhashtag"]
      },
      "storyIdeas": ["Poll idea", "Quiz idea", "BTS idea"]
    }
  ]
}

- "dayIndex" must be the exact day index from the list above (0-based).
- Reel / Video Post days: replace "videoScript": null with a full object: {"hook": "...", "scenes": ["Scene 1", "Scene 2", "Scene 3"], "ending": "...", "music": "...", "length": "...", "textOverlays": ["...", "...", "..."], "cameraMovement": "...", "broll": ["...", "...", "...", "..."]}.
- Produce exactly ${count} days, one per day listed above, in order.
- Follow the system rules about hooks, local hashtags, branded hashtags, captions, CTAs, story ideas and realism.
- Captions must follow the CAPTION STYLE GUIDE — human, warm, story-driven, with real specific details. Never generic or AI-sounding.`;
}

export interface GenOptions {
  startDate: string;
  salt: number;
  /** Compact summary of the marketing strategy so the days serve it. */
  strategyNote?: string;
  /** Content ideas to exclude from generation (non-trending ideas from same business type). */
  excludedIdeas?: string[];
  /** Live trends from Instagram/TikTok to naturally weave into the plan. */
  liveTrendsPrompt?: string;
}

/**
 * Ask the model for a run of days. Returns one entry per requested day —
 * `null` where the model's output for that day failed validation — so callers
 * can fill gaps with the deterministic engine instead of discarding the batch.
 * Returns null only when the whole request failed.
 */
export async function generateDays(
  profile: BusinessProfile,
  fromDay: number,
  count: number,
  opts: GenOptions,
): Promise<(DayPlan | null)[] | null> {
  const content = await chat(
    [
      {
        role: "system",
        content: `${PLAN_SYSTEM_PROMPT}\n\n${voicePromptBlock(buildVoiceProfile(profile))}`,
      },
      {
        role: "user",
        content: buildBatchPrompt(profile, fromDay, count, opts.startDate, opts.strategyNote, opts.excludedIdeas, opts.liveTrendsPrompt),
      },
    ],
    { maxTokens: 4800, temperature: 0.8, timeoutMs: 180_000 },
  );
  if (!content) return null;

  const parsed = parseJson<unknown>(content);
  const days = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { days?: unknown })?.days)
      ? (parsed as { days: unknown[] }).days
      : null;
  if (!days || days.length === 0) {
    console.error("planGen: model returned no days", content.slice(0, 200));
    return null;
  }

  const out: (DayPlan | null)[] = [];
  for (let i = 0; i < count; i++) {
    const dayIndex = fromDay + i;
    const date = addDays(opts.startDate, dayIndex);
    const type = TYPE_ROTATION[dayIndex % TYPE_ROTATION.length];
    const fallbackTime = TIME_SLOTS[type][0];
    const byIndex = days.find(
      (d) => d && typeof d === "object" && (d as { dayIndex?: unknown }).dayIndex === dayIndex,
    );
    const day = normalizeDay(byIndex ?? days[i], dayIndex, date, fallbackTime);
    if (!day) console.error(`planGen: day ${dayIndex} failed validation`);
    out.push(day);
  }
  return out;
}

/** Fill validation gaps with engine-built days so a plan is always complete. */
const fillGaps = (
  profile: BusinessProfile,
  fromDay: number,
  days: (DayPlan | null)[],
  opts: GenOptions,
): DayPlan[] =>
  days.map((d, i) => d ?? buildDayFallback(profile, fromDay + i, opts));

/**
 * Full 30-day calendar via AI, in 3 parallel batches of 10 days each.
 * Batches or days the model gets wrong fall back to the engine individually.
 * Null only when AI is unavailable or every batch failed.
 * Reduced parallelism to avoid overwhelming the API.
 */
export async function generateCalendarWithAI(
  profile: BusinessProfile,
  opts: GenOptions,
): Promise<DayPlan[] | null> {
  if (!AI_CONFIGURED) return null;
  const batches = await Promise.all(
    Array.from({ length: 3 }, (_, b) => generateDays(profile, b * 10, 10, opts)),
  );
  if (batches.every((b) => b === null)) return null;
  return batches.flatMap((b, i) =>
    fillGaps(profile, i * 10, b ?? Array.from({ length: 10 }, () => null), opts),
  );
}

/** A run of consecutive days via AI (single-day and week regeneration). */
export async function generateRangeWithAI(
  profile: BusinessProfile,
  fromDay: number,
  count: number,
  opts: GenOptions,
): Promise<DayPlan[] | null> {
  if (!AI_CONFIGURED) return null;
  const days = await generateDays(profile, fromDay, count, opts);
  if (!days) return null;
  return fillGaps(profile, fromDay, days, opts);
}

/** Deterministic engine fallback — always succeeds. */
export function buildCalendarFallback(profile: BusinessProfile, opts: GenOptions): DayPlan[] {
  return buildCalendarPersonalized(profile, { startDate: opts.startDate, salt: opts.salt }).map(
    withFallbackTime,
  );
}

export function buildDayFallback(
  profile: BusinessProfile,
  dayIndex: number,
  opts: GenOptions,
): DayPlan {
  return withFallbackTime(
    buildDayPlanPersonalized(profile, dayIndex, { startDate: opts.startDate, salt: opts.salt }),
  );
}

const withFallbackTime = (day: DayPlan): DayPlan =>
  day.time ? day : { ...day, time: TIME_SLOTS[day.contentType][0] };
