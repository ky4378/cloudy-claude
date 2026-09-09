/**
 * Cloudy AI — automatic competitor discovery.
 *
 * Turns a business profile into a scored, classified competitor analysis:
 *
 *   1. Build a search profile from the questionnaire (type, products,
 *      location, target customers, platforms).
 *   2. Run several web searches (via OpenAI's Responses API web-search
 *      tool — no separate search key needed) to discover real local
 *      businesses competing for the same customers.
 *   3. Score each candidate with a Competitor Relevance Score and classify
 *      them into Direct / Indirect / Attention competitors.
 *   4. Analyze the top 5 and turn the findings into market gaps → content
 *      opportunities.
 *   5. Produce a compact "competitor brief" that the plan generator uses
 *      to differentiate the 30-day calendar.
 *
 * Best-effort by design: when no OpenAI key is configured (or the searches
 * fail), a deterministic fallback engine generates a representative set of
 * competitors and opportunities from the business type + location, so the
 * feature always has something to show.
 */

"use node";

import type { BusinessProfile } from "./strategy";
import { typeKB } from "./strategy";

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// ---------------------------------------------------------------------------
// Types (shared with schema.ts + the dashboard)
// ---------------------------------------------------------------------------

export type CompetitorCategory = "direct" | "indirect" | "attention";

export interface Competitor {
  name: string;
  category: CompetitorCategory;
  relevanceScore: number; // 0..100 — how closely they compete
  /** True when this entry is a profile-based estimate, never an invented brand. */
  estimated?: boolean;
  website?: string;
  location?: string;
  services?: string;
  pricing?: string;
  followers?: string;
  postingFrequency?: string;
  contentTypes: string[];
  engagement?: string;
  bestContent?: string;
  offers?: string;
  positioning?: string;
  /** Who they serve — age / type of customer (spec: "Target audience"). */
  targetAudience?: string;
  /** Why they compete with THIS business, in one line. */
  whyCompetes?: string;
  /** What the search findings actually show, or "could not be verified". */
  evidence?: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorOpportunity {
  gap: string; // what competitors are missing
  opportunity: string; // what the business should do about it
  contentIdea: string; // a ready-to-shoot post idea
  why: string; // why this wins
}

export interface CompetitorAnalysis {
  status: "done" | "fallback";
  generatedAt: number;
  searches: string[];
  summary: string;
  competitors: Competitor[];
  opportunities: CompetitorOpportunity[];
  /** Compact brief fed to the plan generator so the 30 days are shaped by the gaps. */
  brief: string;
}

// ---------------------------------------------------------------------------
// Search profile → search queries
// ---------------------------------------------------------------------------

const stripOfferWords = (s: string): string =>
  s
    .replace(/\b(classes|courses|services|products|packages|sessions|lessons|studio)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const buildSearchQueries = (biz: BusinessProfile): string[] => {
  const kb = typeKB(biz.businessType);
  const label = kb.label.toLowerCase();
  const area = (biz.location || "").trim();
  const product = stripOfferWords(biz.products?.[0] ?? "");
  // Lead with the specific product/service when one is given (e.g. "hot mat
  // pilates") — that's what actually identifies who competes with the business.
  const base = product || label;

  const qs: string[] = [];
  if (area) {
    qs.push(
      `${base} ${area}`,
      `best ${base} in ${area}`,
      `${base} near ${area}`,
      `${base} prices ${area}`,
      `${kb.typeWord.toLowerCase()} ${base} ${area}`,
    );
  } else {
    qs.push(
      `${base}`,
      `best ${base}`,
      `${base} near me`,
      `${base} prices`,
      `${kb.typeWord.toLowerCase()} ${base}`,
    );
  }
  if (biz.instagram) qs.push(`instagram ${base} ${area || ""}`.trim());
  // 6 queries max — enough coverage, bounded cost.
  return [...new Set(qs)].filter(Boolean).slice(0, 6);
};

// ---------------------------------------------------------------------------
// OpenAI Responses API — web search + structured JSON
// ---------------------------------------------------------------------------

interface SearchResult {
  name: string;
  location?: string;
  website?: string;
  description?: string;
}

/** Pull the assistant's final text out of a Responses-API payload. */
function extractOutputText(data: { output?: unknown[] }): string | null {
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (!item || typeof item !== "object") continue;
    const it = item as { type?: string; role?: string; content?: unknown };
    if (it.type !== "message" || it.role !== "assistant") continue;
    const content = Array.isArray(it.content) ? it.content : [];
    for (const c of content) {
      const cc = c as { type?: string; text?: string };
      if (cc.type === "output_text" && typeof cc.text === "string") parts.push(cc.text);
    }
  }
  return parts.length ? parts.join("\n") : null;
}

/** Robustly parse a JSON blob that may be wrapped in code fences / prose. */
function parseJsonBlob(s: string): unknown {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? s).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(body.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

const asStr = (x: unknown): string | undefined =>
  typeof x === "string" && x.trim() ? x.trim() : undefined;
const asStrArr = (x: unknown): string[] =>
  Array.isArray(x)
    ? x.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    : [];

async function aiSearch(query: string): Promise<SearchResult[] | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are a local-market research assistant. Use the web search results to find REAL local businesses that match the query. Return ONLY valid JSON — an array of objects with keys: name (string), location (string), website (string, if found), description (string, one short line about what they offer). When the search results show a follower count (e.g. '12k followers'), include it in the description. List up to 8 businesses. Never invent businesses: only list ones the search results actually show.",
          },
          { role: "user", content: `Search the web for: ${query}` },
        ],
        tools: [{ type: "web_search_preview", search_context_size: "medium" }],
        text: { format: { type: "json_object" } },
        max_output_tokens: 2500,
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { output?: unknown[] };
    const text = extractOutputText(data);
    if (!text) return null;
    const parsed = parseJsonBlob(text);
    let list: unknown = null;
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === "object") {
      // The model may wrap the array under any key (results/businesses/data…).
      for (const v of Object.values(parsed as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          list = v;
          break;
        }
      }
    }
    if (!list || !Array.isArray(list)) return null;
    const out: SearchResult[] = [];
    for (const r of list) {
      const rr = r as Record<string, unknown>;
      const name = asStr(rr.name);
      if (!name) continue;
      out.push({
        name,
        location: asStr(rr.location),
        website: asStr(rr.website),
        description: asStr(rr.description),
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Consolidation: score + classify + pick the top competitors
// ---------------------------------------------------------------------------

async function chatJson(
  messages: { role: "system" | "user"; content: string }[],
  maxTokens: number,
): Promise<unknown | null> {
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
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return parseJsonBlob(content);
  } catch {
    return null;
  }
}

const SCORING_RULES = `Score each candidate 0-100 as a Competitor Relevance Score using these weights:
- Same product/service (closely substitutable, not merely same industry): 25 points
- Same target customers (age, interests, needs, spending level, positioning): 20 points
- Geographic relevance (same city or realistic travel area; for online businesses, the same served market): 20 points
- Similar price and positioning (budget / mid-market / premium / luxury): 15 points
- Same customer problem (they solve the same core need): 10 points
- Online / social presence (active website or socials that Cloudy can actually analyze; compare their reach against the business's OWN following - candidates with comparable reach score higher): 10 points`;

const REJECT_RULES = `Do NOT classify a business as a competitor if it:
- Is only in the same broad industry (e.g. any fitness studio when the business is a hot mat pilates studio)
- Serves a completely different audience
- Is too far away for a location-dependent business
- Is significantly different in price or positioning
- Offers a fundamentally different product or service
- Is a supplier, vendor or partner rather than a competitor
- Is a directory, marketplace, news website, review website or aggregator
- Is a large company that does not realistically compete for the same customers
- Has insufficient evidence that it is actually relevant

Only recommend competitors scoring 70 or higher. If fewer than three competitors score 70 or higher, return the strongest available and clearly state that there are fewer highly relevant competitors. Never invent competitors, websites, prices, follower counts or other facts; when something cannot be verified, use null or say the information could not be verified.`;

async function consolidateCandidates(
  biz: BusinessProfile,
  found: SearchResult[],
): Promise<{ competitors: Competitor[]; summary: string } | null> {
  const parsed = await chatJson(
    [
      {
        role: "system",
        content: `You are a competitive-intelligence analyst for local businesses. You receive a business profile and a list of candidates found via web search. Pick the 5 strongest competitors and analyze each one. Only pick businesses that ACTUALLY appear in the candidate list - never invent, rename or substitute brand names. If fewer than 5 strong candidates exist, analyze what is actually there. ${SCORING_RULES}\n\n${REJECT_RULES}\n\nClassify each competitor into exactly one category:\n- "direct": same product/service AND similar customers (they'd lose a sale to each other)\n- "indirect": different product/service but competing for the same customer's money\n- "attention": competing for the same audience's attention (local influencers, content creators, media)\n\nReturn ONLY valid JSON with this shape:\n{"competitors":[{"name":"...","category":"direct|indirect|attention","relevanceScore":92,"website":"... or null","location":"... or null","services":"... or null","pricing":"... or null","followers":"e.g. 2.4k - include it when the search results show it, else null","postingFrequency":"e.g. daily, or null","contentTypes":["Reels","Carousels"],"engagement":"e.g. high, or null","bestContent":"what performs best for them","offers":"their main offers/promotions","positioning":"their angle in one line","targetAudience":"who they serve (age, type of customer)","whyCompetes":"why they compete with THIS business - same offer, same customers, same area, or same spend","evidence":"what the search findings actually show about them - one short line, or 'could not be verified'","strengths":["what they do well that this business likely isn't doing","..."],"weaknesses":["...","..."]}],"summary":"one paragraph: who competes with this business, how intense it is, whether the rivals' audience sizes are similar to the business's own following, and whether fewer than three highly relevant competitors were found (if so, say so)"}\nUse "null" for unknown fields - never invent numbers or facts. Base everything on the search findings. If a competitor's details could not be verified, say the information could not be verified in the evidence field.`,
      },
      {
        role: "user",
        content: `Business profile (JSON):\n${JSON.stringify(
          {
            name: biz.businessName,
            type: biz.businessType,
            location: biz.location,
            products: biz.products,
            targetCustomers: biz.targetCustomers,
            website: biz.website,
            instagram: biz.instagram,
            igFollowers: biz.igFollowers,
            audienceSize: followerRange(biz.igFollowers) ?? "unknown",
          },
          null,
          2,
        )}\n\nCandidates found (JSON):\n${JSON.stringify(found.slice(0, 30), null, 2)}`,
      },
    ],
    4000,
  );
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const list = Array.isArray(p.competitors) ? p.competitors : null;
  if (!list || list.length === 0) return null;

  const competitors: Competitor[] = [];
  for (const c of list) {
    const cc = c as Record<string, unknown>;
    const name = asStr(cc.name);
    if (!name) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(cc.relevanceScore) || 0)));
    const category: CompetitorCategory =
      cc.category === "indirect" || cc.category === "attention" ? cc.category : "direct";
    competitors.push({
      name,
      category,
      relevanceScore: score,
      website: asStr(cc.website),
      location: asStr(cc.location),
      services: asStr(cc.services),
      pricing: asStr(cc.pricing),
      followers: asStr(cc.followers),
      postingFrequency: asStr(cc.postingFrequency),
      contentTypes: asStrArr(cc.contentTypes).slice(0, 6),
      engagement: asStr(cc.engagement),
      bestContent: asStr(cc.bestContent),
      offers: asStr(cc.offers),
      positioning: asStr(cc.positioning),
      targetAudience: asStr(cc.targetAudience),
      whyCompetes: asStr(cc.whyCompetes),
      evidence: asStr(cc.evidence),
      strengths: asStrArr(cc.strengths).slice(0, 4),
      weaknesses: asStrArr(cc.weaknesses).slice(0, 4),
    });
  }
  if (competitors.length === 0) return null;

  // Hard anti-hallucination guard: drop any competitor whose name does not
  // actually appear in the real search results. The model can drift and invent
  // plausible-sounding brands — this makes that impossible to ship.
  const real = filterToReal(competitors, found);
  if (real.length === 0) return null;

  // Spec rule: only recommend competitors scoring 70 or higher. If fewer than
  // three score 70+, return the strongest available anyway and say so.
  const strong = real.filter((c) => c.relevanceScore >= 70);
  const fewHighlyRelevant = strong.length < 3;
  const pool = fewHighlyRelevant ? real : strong;

  // Sort by score, keep at most 5, prefer at least one of each category when available.
  pool.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const picked: Competitor[] = [];
  for (const cat of ["direct", "indirect", "attention"] as CompetitorCategory[]) {
    const best = pool.find((c) => c.category === cat);
    if (best && !picked.includes(best)) picked.push(best);
  }
  for (const c of pool) {
    if (picked.length >= 5) break;
    if (!picked.includes(c)) picked.push(c);
  }

  const baseSummary =
    asStr(p.summary) ??
    `${biz.businessName} faces ${picked.length} notable competitors in ${biz.location || "the area"}.`;
  const summary = fewHighlyRelevant
    ? `${baseSummary} Fewer than three competitors scored 70 or higher, so the strongest available are listed here.`
    : baseSummary;

  return {
    competitors: picked.slice(0, 5),
    summary,
  };
}

// ---------------------------------------------------------------------------
// Gap analysis → opportunities + competitor brief
// ---------------------------------------------------------------------------

async function deriveOpportunities(
  biz: BusinessProfile,
  competitors: Competitor[],
): Promise<{ opportunities: CompetitorOpportunity[]; brief: string } | null> {
  const parsed = await chatJson(
    [
      {
        role: "system",
        content: `You are a marketing strategist for small local businesses. You receive a business profile and its top competitors. Identify the gaps as DIRECT COMPARISONS: what competitors are doing that this business currently isn't (or is doing better), what they rarely do, and the angles they are missing. Then turn each gap into a concrete content opportunity the owner can actually execute.\n\nFor every opportunity be explicit about the comparison: state what competitors do, confirm this business isn't doing it yet, then give the specific content that closes the gap.\n\nReturn ONLY valid JSON:\n{"opportunities":[{"gap":"what competitors are doing that this business isn't, phrased as a direct comparison","opportunity":"what the business should do to close the gap","contentIdea":"a ready-to-shoot post/reel idea, specific to this business","why":"why this wins with this audience"}],"brief":"one compact paragraph (max 6 sentences) for the plan generator: who the competitors are, what they do well, the content gaps, and what this business should lean into to stand out. No business names — talk about 'the market' / 'local competitors'."}\nGive 3-5 opportunities. Be specific to the business type, location and audience — never generic filler.`,
      },
      {
        role: "user",
        content: `Business profile (JSON):\n${JSON.stringify(
          {
            name: biz.businessName,
            type: biz.businessType,
            location: biz.location,
            products: biz.products,
            targetCustomers: biz.targetCustomers,
            goals: biz.goals,
            brandPersonality: biz.brandPersonality,
          },
          null,
          2,
        )}\n\nCompetitors (JSON):\n${JSON.stringify(competitors, null, 2)}`,
      },
    ],
    3000,
  );
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const list = Array.isArray(p.opportunities) ? p.opportunities : null;
  if (!list || list.length === 0) return null;

  const opportunities: CompetitorOpportunity[] = [];
  for (const o of list) {
    const oo = o as Record<string, unknown>;
    const gap = asStr(oo.gap);
    const opportunity = asStr(oo.opportunity);
    const contentIdea = asStr(oo.contentIdea);
    if (!gap && !opportunity) continue;
    opportunities.push({
      gap: gap ?? "Undefined gap",
      opportunity: opportunity ?? "Capitalize on this gap.",
      contentIdea: contentIdea ?? "Create content that fills this gap.",
      why: asStr(oo.why) ?? "This angle is unclaimed locally.",
    });
  }
  if (opportunities.length === 0) return null;
  return {
    opportunities: opportunities.slice(0, 5),
    brief:
      asStr(p.brief) ??
      `Local competitors ${biz.location ? `in ${biz.location} ` : ""}leave room for content that is more educational and personal. Lean into: ${opportunities
        .slice(0, 3)
        .map((o) => o.contentIdea)
        .join("; ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Deterministic fallback engine (no key / search failure)
// ---------------------------------------------------------------------------

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed: number) => {
  let a = seed;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
  };
};

const cityWord = (location: string): string =>
  (location || "")
    .split(/[\s,-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .filter(Boolean)[0] ?? "The Area";

const INDIRECT_TYPES: Record<string, string[]> = {
  cafe: ["Brunch restaurant", "Bakery", "Specialty tea house"],
  restaurant: ["Café", "Neighbourhood bistro", "Food delivery kitchen"],
  tuition: ["Online tutoring platform", "Enrichment centre"],
  salon: ["Day spa", "Barbershop", "Nail studio"],
  dental: ["Aesthetic clinic", "Orthodontist"],
  gym: ["Yoga studio", "Personal training home studio"],
  realestate: ["Interior styling studio", "Mortgage broker"],
  dealership: ["Pre-owned car trader", "Car detailing studio"],
  retail: ["Online boutique", "Marketplace seller"],
  petgroomer: ["Veterinary clinic", "Pet supplies store"],
};

const ATTENTION_TYPES: Record<string, string[]> = {
  cafe: ["Local food influencer", "Neighbourhood lifestyle page"],
  restaurant: ["Food reviewer", "Local foodie page"],
  tuition: ["Study-tips creator", "Parent community page"],
  salon: ["Beauty content creator", "Local lifestyle page"],
  dental: ["Health & wellness creator"],
  gym: ["Fitness creator", "Wellness influencer"],
  realestate: ["Property content creator", "Interior inspo page"],
  dealership: ["Car content creator", "Auto reviewer"],
  retail: ["Style creator", "Haul & unboxing page"],
  petgroomer: ["Pet content creator", "Local pet community page"],
};

const fallbackAnalysis = (biz: BusinessProfile, salt: number): CompetitorAnalysis => {
  const rng = makeRng(hashString(`${biz.businessName}|${biz.location}|${salt}`));
  const kb = typeKB(biz.businessType);
  const area = cityWord(biz.location);
  const label = kb.label;
  const ownReach = followerRange(biz.igFollowers);
  const reachNote = ownReach
    ? ` (similar audience size to yours — ~${ownReach} followers)`
    : "";

  // NOTE: these are descriptive estimates, never invented brand names. Each
  // entry is flagged `estimated: true` and the UI labels it "Estimate" under
  // the "Based on your profile" status — Cloudy never guesses who exists.
  const directTitles = [
    `${label} studio in ${area}${reachNote}`,
    `Another ${label} studio near ${area}`,
    `Best-known ${label} spot in ${area}`,
  ];
  const indirect = INDIRECT_TYPES[biz.businessType] ?? [`${label}-adjacent venue`];
  const attention = ATTENTION_TYPES[biz.businessType] ?? ["Local content creator"];

  const score = (lo: number, hi: number) => lo + rng.int(hi - lo);
  const mk = (
    name: string,
    category: CompetitorCategory,
    lo: number,
    hi: number,
    extra: Partial<Competitor> = {},
  ): Competitor => ({
    name,
    category,
    relevanceScore: score(lo, hi),
    estimated: true,
    location: biz.location || undefined,
    services: label,
    targetAudience: biz.targetCustomers,
    whyCompetes:
      category === "direct"
        ? "Same offer, same customers, same area."
        : category === "indirect"
          ? "Competes for the same customer's spending."
          : "Competes for the same audience's attention.",
    evidence:
      "Profile-based estimate - Cloudy never guesses brand names. Live research needs the OpenAI key.",
    contentTypes: rng.int(2) === 0 ? ["Reels", "Photos"] : ["Photos", "Stories"],
    strengths: [`Active ${label.toLowerCase()} presence`, "Regular posting"],
    weaknesses: ["Rarely educational content", "Generic captions"],
    ...extra,
  });

  const competitors: Competitor[] = [
    mk(directTitles[0], "direct", 80, 95),
    mk(directTitles[1], "direct", 70, 85),
    mk(directTitles[2], "direct", 60, 78),
    mk(`${area} ${indirect[rng.int(indirect.length)]}`, "indirect", 45, 62, {
      services: indirect[rng.int(indirect.length)],
      positioning: "Competes for the same customer's spending.",
    }),
    mk(attention[rng.int(attention.length)], "attention", 30, 48, {
      followers: ownReach ? `~${ownReach}` : undefined,
      positioning: "Competes for the same audience's attention.",
    }),
  ];
  competitors.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const tip = kb.tips[rng.int(kb.tips.length)];
  const offer = kb.offers[rng.int(kb.offers.length)];
  const opportunities: CompetitorOpportunity[] = [
    {
      gap: `Most nearby ${label.toLowerCase()}s post promotion and showcase content but rarely explain things for beginners.`,
      opportunity: "Own the educational angle nobody else is taking.",
      contentIdea: `"${tip.charAt(0).toUpperCase() + tip.slice(1)}" as a simple Reel or carousel.`,
      why: "Educational content builds trust and gets saved/shared — the exact signal the algorithm rewards.",
    },
    {
      gap: "Competitors mostly talk about themselves; few ask the audience anything.",
      opportunity: "Make engagement a habit with questions, polls and this-or-that stories.",
      contentIdea: `A weekly interactive story: "${kb.storyThemes[rng.int(kb.storyThemes.length)]}"`,
      why: "Comments and story replies push posts to new people — your cheapest growth lever.",
    },
    {
      gap: "Behind-the-scenes and the people behind the business are missing from competitor feeds.",
      opportunity: "Humanize the brand — buyers choose people they feel they know.",
      contentIdea: `A candid behind-the-scenes post: the team, the prep, the quiet moments before opening.`,
      why: "Authenticity is the strongest differentiator for small local businesses.",
    },
    {
      gap: `Few competitors promote a clear, simple offer like "${offer.toLowerCase()}".`,
      opportunity: "Give new customers a low-friction reason to try you first.",
      contentIdea: `An offer post + story countdown: "${offer}"`,
      why: "A specific offer converts attention into a visit — competitors leave this on the table.",
    },
  ];

  const brief = `Local competitors in ${area} post regularly but stay surface-level: showcases and promos, rarely education, rarely behind-the-scenes, and they rarely ask the audience anything. ${biz.businessName} should own the educational angle (${tip}), run interactive stories every week, show the people behind the business, and keep one simple offer in rotation (${offer.toLowerCase()}).`;

  return {
    status: "fallback",
    generatedAt: Date.now(),
    searches: buildSearchQueries(biz),
    summary: `${biz.businessName} faces an estimated ${competitors.length} local players — ${competitors.filter((c) => c.category === "direct").length} direct rivals, ${competitors.filter((c) => c.category === "indirect").length} indirect and ${competitors.filter((c) => c.category === "attention").length} attention competitor. These are profile-based estimates, not live research — Cloudy never guesses brand names. Live web research needs the OpenAI key.`,
    competitors,
    opportunities,
    brief,
  };
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const dedupe = (list: SearchResult[]): SearchResult[] => {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of list) {
    const key = r.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
};

/** Minimum number of real businesses a search round must surface before we
 *  trust it — below this, the engine broadens the queries instead of using
 *  thin or guessed results. */
const MIN_REAL_FOUND = 3;

/** Human-readable audience-size range for the owner's follower bucket. */
const followerRange = (bucket?: string): string | undefined => {
  switch (bucket) {
    case "under500":
      return "under 500";
    case "500to2k":
      return "500–2,000";
    case "2kto10k":
      return "2,000–10,000";
    case "10kplus":
      return "10,000+";
    default:
      return undefined;
  }
};

/**
 * Broader category terms per business type, used when the exact product
 * search comes up short. For a niche offering like "hot mat pilates", the
 * engine adapts: "hot mat pilates jakarta" → "pilates jakarta" → "yoga
 * studio jakarta" / "fitness studio jakarta".
 */
const BROADER_TERMS: Record<string, string[]> = {
  cafe: ["specialty coffee", "brunch cafe", "bakery cafe", "coffee house"],
  restaurant: ["bistro", "casual dining", "family restaurant", "dining"],
  tuition: ["tuition centre", "tutoring", "enrichment centre", "learning centre"],
  salon: ["hair salon", "beauty salon", "hair studio", "nail studio"],
  dental: ["dental clinic", "dentist", "dental care", "orthodontist"],
  gym: ["pilates", "hot pilates", "mat pilates", "yoga studio", "fitness studio", "personal training"],
  realestate: ["real estate agency", "property agent", "realtor", "property listing"],
  dealership: ["car dealer", "car showroom", "pre-owned car dealer", "used car dealer"],
  retail: ["boutique", "concept store", "gift shop", "department store"],
  petgroomer: ["pet grooming", "dog grooming", "pet care", "pet spa"],
};

/** Round 2 — broaden from the exact product to the category the product belongs to. */
export const buildBroaderQueries = (biz: BusinessProfile): string[] => {
  const area = (biz.location || "").trim();
  const terms = BROADER_TERMS[biz.businessType] ?? [];
  const qs: string[] = [];
  for (const term of terms.slice(0, 2)) {
    if (area) {
      qs.push(`${term} ${area}`, `best ${term} in ${area}`, `${term} near ${area}`);
    } else {
      qs.push(term, `best ${term}`, `${term} near me`);
    }
  }
  return [...new Set(qs)].filter(Boolean).slice(0, 6);
};

/** Round 3 — broadest fallback: the business-type label itself. */
export const buildBroadestQueries = (biz: BusinessProfile): string[] => {
  const kb = typeKB(biz.businessType);
  const label = kb.label;
  const area = (biz.location || "").trim();
  const qs: string[] = [];
  if (area) {
    qs.push(
      `${label} ${area}`,
      `best ${label} in ${area}`,
      `${label} near ${area}`,
      `${label} classes ${area}`,
      `${kb.typeWord.toLowerCase()} ${label} ${area}`,
    );
  } else {
    qs.push(label, `best ${label}`, `${label} near me`, `${label} classes`);
  }
  return [...new Set(qs)].filter(Boolean).slice(0, 4);
};

const runSearchRound = async (queries: string[]): Promise<SearchResult[]> => {
  const settled = await Promise.allSettled(queries.map((q) => aiSearch(q)));
  return dedupe(
    settled.flatMap((r) => (r.status === "fulfilled" ? (r.value ?? []) : [])),
  );
};

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Lenient name match — "The Mat — Jakarta" vs "The Mat" should both match. */
const fuzzyMatch = (a: string, b: string): boolean => {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(" ");
  const wb = nb.split(" ");
  if (wa.length >= 2 && wb.length >= 2) {
    const shared = wa.filter((w) => wb.includes(w)).length;
    if (shared >= 2) return true;
  }
  return false;
};

/**
 * Hard anti-hallucination guard: a competitor is only kept when its name
 * actually appears in the real search results. No real results → no name.
 */
const filterToReal = (
  competitors: Competitor[],
  found: SearchResult[],
): Competitor[] => competitors.filter((c) => found.some((f) => fuzzyMatch(c.name, f.name)));

/**
 * Discover + analyze competitors for a business. Runs three adaptive rounds
 * of real web search — exact product/service first, then broader category
 * terms, then the business-type label — and only falls back to profile-based
 * estimates when no key is set or every round comes up empty. Returns a full
 * analysis or null. Never throws — the caller treats a null as "skip
 * competitor work".
 */
export async function discoverCompetitorAnalysis(
  biz: BusinessProfile,
  salt: number,
): Promise<CompetitorAnalysis | null> {
  const searches: string[] = [];
  let found: SearchResult[] = [];

  if (OPENAI_KEY) {
    try {
      // Round 1 — the exact offering: "hot mat pilates jakarta".
      const r1 = buildSearchQueries(biz);
      searches.push(...r1);
      found = await runSearchRound(r1);

      // Round 2 — adapt: broaden to the category: "pilates jakarta".
      if (found.length < MIN_REAL_FOUND) {
        const r2 = buildBroaderQueries(biz);
        searches.push(...r2);
        found = dedupe([...found, ...(await runSearchRound(r2))]);
      }

      // Round 3 — broadest: "yoga studio jakarta", "fitness studio jakarta".
      if (found.length < MIN_REAL_FOUND) {
        const r3 = buildBroadestQueries(biz);
        searches.push(...r3);
        found = dedupe([...found, ...(await runSearchRound(r3))]);
      }

      if (found.length >= MIN_REAL_FOUND) {
        const cons = await consolidateCandidates(biz, found);
        if (cons && cons.competitors.length >= 2) {
          const gaps = await deriveOpportunities(biz, cons.competitors);
          return {
            status: "done",
            generatedAt: Date.now(),
            searches,
            summary: cons.summary,
            competitors: cons.competitors,
            opportunities: gaps?.opportunities ?? [],
            brief:
              gaps?.brief ??
              `Local competitors leave room for more educational, personal and interactive content. Lean into: ${cons.competitors
                .flatMap((c) => c.weaknesses)
                .slice(0, 3)
                .join("; ")}.`,
          };
        }
      }
    } catch {
      /* fall back below */
    }
  }

  return fallbackAnalysis(biz, salt);
}
