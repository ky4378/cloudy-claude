/**
 * Cloudy — AI provider client.
 *
 * Every AI feature in the app goes through this module so the provider can
 * be swapped in one place. It speaks the OpenAI-compatible chat-completions
 * protocol, which most providers (OpenAI, Azure OpenAI, Groq, Together,
 * OpenRouter, local gateways…) expose.
 *
 * Environment variables (set on the Convex deployment):
 *   OPENAI_API_KEY   — required to enable AI generation
 *   OPENAI_MODEL     — optional, defaults to gpt-4o-mini
 *   OPENAI_BASE_URL  — optional, defaults to https://api.openai.com/v1
 *
 * When no key is configured (or a call fails / returns invalid JSON) callers
 * fall back to the deterministic strategy engine so the product always works.
 * Only import this from "use node" modules.
 */

import type { BusinessProfile } from "./strategy";
import { BUSINESS_TYPES } from "./strategy";

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

export const AI_CONFIGURED = Boolean(API_KEY);

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider for a JSON object response (default true). */
  json?: boolean;
  /** Abort after this many ms (default 90s). */
  timeoutMs?: number;
}

/** Raw chat call. Returns the assistant text or null on any failure. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string | null> {
  if (!API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.8,
        ...(opts.json === false ? {} : { response_format: { type: "json_object" } }),
      }),
    });
    if (!res.ok) {
      console.error("AI provider error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error("AI provider request failed", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Chat and parse the reply as JSON. Returns null when anything goes wrong. */
export async function chatJson<T = unknown>(
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<T | null> {
  const content = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { ...opts, json: true },
  );
  if (!content) return null;
  return parseJson<T>(content);
}

/** Tolerant JSON parse — strips code fences and trailing commentary. */
export function parseJson<T = unknown>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared prompt building blocks
// ---------------------------------------------------------------------------

const FOLLOWER_LABEL: Record<string, string> = {
  under500: "under 500 followers",
  "500to2k": "500–2,000 followers",
  "2kto10k": "2,000–10,000 followers",
  "10kplus": "over 10,000 followers",
};
const FREQUENCY_LABEL: Record<string, string> = {
  daily: "posts daily",
  "3to4x": "posts 3–4 times a week",
  "1to2x": "posts 1–2 times a week",
  rarely: "rarely posts / just starting",
};
const ENGAGEMENT_LABEL: Record<string, string> = {
  high: "very active — lots of comments and DMs",
  some: "some engagement",
  low: "little engagement",
};

export const businessTypeLabel = (id: string): string =>
  BUSINESS_TYPES.find((b) => b.id === id)?.label ?? id;

/**
 * The business context block that every prompt receives. It is built from
 * the owner's questionnaire answers — this is what makes two businesses of
 * the same type get different plans.
 */
export function businessContext(p: BusinessProfile): string {
  const lines: string[] = [
    `Business name: ${p.businessName}`,
    `Business type: ${businessTypeLabel(p.businessType)}`,
    `Location: ${p.location || "not specified"}`,
  ];
  if (p.website) lines.push(`Website: ${p.website}`);
  if (p.instagram) lines.push(`Instagram: ${p.instagram}`);
  lines.push(`Target audience: ${p.targetCustomers || "local customers"}`);
  if (p.mainGoal) lines.push(`Main marketing goal: ${p.mainGoal}`);
  if (p.goals.length) lines.push(`All goals: ${p.goals.join(", ")}`);
  const social = [
    p.igFollowers && FOLLOWER_LABEL[p.igFollowers],
    p.postingFrequency && FREQUENCY_LABEL[p.postingFrequency],
    p.engagement && ENGAGEMENT_LABEL[p.engagement],
  ].filter(Boolean);
  if (social.length) lines.push(`Current social media: ${social.join("; ")}`);
  if (p.products.length) lines.push(`Products / services: ${p.products.join(", ")}`);
  if (p.differentiator) lines.push(`What makes them different: ${p.differentiator}`);
  lines.push(
    `Preferred brand tone: ${p.tone ?? p.brandPersonality[0] ?? "Friendly"}${
      p.brandPersonality.length ? ` (personality: ${p.brandPersonality.join(", ")})` : ""
    }`,
  );
  if (p.contentLikes) lines.push(`Content they like / want more of: ${p.contentLikes}`);
  if (p.contentDislikes) lines.push(`Content they do NOT want: ${p.contentDislikes}`);
  if (p.competitors?.length) lines.push(`Main competitors: ${p.competitors.join(", ")}`);
  if (p.challenges) lines.push(`Marketing challenges: ${p.challenges}`);
  if (p.brandResearch) lines.push(`\nBrand research from their live profiles:\n${p.brandResearch}`);
  return lines.join("\n");
}

export const STRATEGIST_SYSTEM = `You are the senior marketing strategist behind Cloudy, an AI marketing platform for small local businesses (cafés, salons, restaurants, retail, fitness studios, local services).

You write like an experienced agency strategist who knows exactly what performs on Instagram for small local businesses. Everything you produce must be concrete, specific to THIS business, and immediately usable by a busy owner with no marketing experience.

Hard rules:
- Return ONLY valid JSON matching the requested shape. No markdown, no commentary.
- Never produce generic advice that would apply to any business. Use the business's real products, location, audience, tone, differentiator and challenges.
- Respect the preferred brand tone in every sentence you write for them.
- Respect the "content they do NOT want" list absolutely.
- Keep language plain and friendly; no jargon, no buzzwords.`;

/** Small helpers used to validate model output. */
export const asString = (x: unknown, fallback = ""): string =>
  typeof x === "string" && x.trim() ? x.trim() : fallback;
export const asStringArray = (x: unknown, max = 12): string[] =>
  Array.isArray(x)
    ? x
        .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
        .map((i) => i.trim())
        .slice(0, max)
    : [];
export const asNumber = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;
