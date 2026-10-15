/**
 * Cloudy AI — social brand research.
 *
 * After onboarding, this module "visits" the social profile the owner
 * provided (Instagram) and extracts whatever public signal is available —
 * bio, follower counts, recent post captions — into a compact text brief.
 * The brief is stored on the business record and fed to the AI so every
 * generated post matches the brand's real voice, products and posting
 * style.
 *
 * Best-effort by design: platforms that are login-walled, private or
 * blocked are skipped gracefully, and the plan is still generated from
 * the questionnaire answers.
 */

"use node";

import { chat, parseJson as parseAiJson, type ChatContentPart } from "./ai";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Apify credentials (set in the Freebuff Keys tab). When a token is present,
// Instagram research uses Apify's managed "Instagram Profile Scraper" actor —
// a look-and-leave scraper that reads public profiles without any login or
// cookies, so the AI can analyze real profiles reliably.
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = "apify~instagram-profile-scraper";

// Instagram session cookies (set in the Freebuff Keys tab). These let
// Cloudy read public profiles through Instagram's internal web API — no
// Facebook/Meta app required. The cookies belong to a real Instagram
// account that stays logged in; rotate them if the account password changes.
const IG_SESSION_ID = process.env.IG_SESSION_ID;
const IG_CSRF_TOKEN = process.env.IG_CSRF_TOKEN;

const MAX_POSTS = 6;
const MAX_BRIEF = 9000;
// Website research: homepage plus up to this many menu/product pages.
const WEBSITE_EXTRA_PAGES = 2;
const WEBSITE_TIMEOUT_MS = 20000;
const MAX_WEBSITE_TEXT = 12000;
const MAX_PRODUCTS = 25;
// Aesthetic analysis: how many recent post images the vision model looks at.
const AESTHETIC_IMAGES = 12;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 2_000_000;
const TIMEOUT_MS = 7000;
const APIFY_TIMEOUT_MS = 60000;

export interface SocialHandles {
  instagram?: string;
  website?: string;
}

/**
 * Optional Meta Instagram Graph API credentials (from the owner's connected
 * Instagram Business account). When present, Instagram research prefers the
 * official, free Business Discovery API over scraping.
 */
export interface ResearchOptions {
  igToken?: string;
  igAccountId?: string;
  /** Helps the product extractor tell real products from noise. */
  businessName?: string;
  businessType?: string;
}

export interface ResearchResult {
  /** Compact brand brief for prompts ("" when nothing was found). */
  brief: string;
  /** Products/services seen on their Instagram and website. */
  products: string[];
}

// ---------------------------------------------------------------------------
// Handle normalization
// ---------------------------------------------------------------------------

const stripUrl = (s: string): string =>
  s.replace(/^https?:\/\/(www\.|m\.|web\.)?/i, "").replace(/\/+$/, "");

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Turn whatever the owner typed into a bare handle:
 * "Soft Spot Açai.sg", "@softspotacai.sg", "https://instagram.com/softspotacai.sg/"
 * all become "softspotacai.sg".
 */
export function normalizeHandle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let h = raw.trim();
  h = stripUrl(h);
  h = h.replace(/^instagram\.com\//i, "");
  h = h.replace(/^@+/, "");
  h = h.replace(/\s+/g, ""); // "soft spot acai.sg" -> "softspotacai.sg"
  h = stripDiacritics(h); // "açai" -> "acai"
  if (!h || h.length < 2) return undefined;
  return h.toLowerCase();
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 1_500_000 ? null : text;
  } catch {
    return null;
  }
}

const parseJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Find a <script> containing `marker` and parse the JSON object that follows it. */
function extractScriptJson(html: string, marker: string): unknown {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf("{", idx);
  if (start < 0) return null;
  const end = html.indexOf("</script>", start);
  if (end < 0) return null;
  let chunk = html.slice(start, end);
  chunk = chunk.replace(/\s*\);?\s*$/, ""); // strip a trailing ); or ;
  return parseJson(chunk);
}

// ---------------------------------------------------------------------------
// Small value helpers
// ---------------------------------------------------------------------------

const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
const num = (x: unknown, key?: string): number | undefined => {
  const v = key ? (x as Record<string, unknown> | undefined)?.[key] : x;
  return typeof v === "number" ? v : undefined;
};
const truncate = (x: string, n: number): string =>
  x.length > n ? `${x.slice(0, n - 1)}…` : x;

type Rec = Record<string, unknown>;

/** Safely walk a nested object from parsed JSON (avoids indexing `unknown`). */
const dig = (obj: unknown, ...path: (string | number)[]): unknown => {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Rec)[key];
  }
  return cur;
};

// ---------------------------------------------------------------------------
// Instagram — best-effort public signals (login-walled in most regions)
// ---------------------------------------------------------------------------

interface IgPost {
  caption: string;
  likes: number | undefined;
  isVideo: boolean;
}

function summarizeIgUser(u: Record<string, unknown>): string | null {
  const lines: string[] = [];
  const fullName = str(u.full_name) || str(u.fullName);
  if (fullName) lines.push(`Name: ${fullName}`);
  const bio = str(u.biography);
  if (bio) lines.push(`Bio: ${truncate(bio, 300)}`);
  const category = str(u.category_name) || str(u.category);
  if (category) lines.push(`Category: ${category}`);
  const followers = num(u.edge_followed_by, "count") ?? num(u.follower_count);
  if (followers !== undefined) lines.push(`Followers: ${followers.toLocaleString()}`);
  if (u.is_private === true) lines.push("Private account (posts not visible)");

  const posts: IgPost[] = [];
  const media = (u.edge_owner_to_timeline_media as Record<string, unknown> | undefined)
    ?.edges;
  if (Array.isArray(media)) {
    for (const e of media.slice(0, MAX_POSTS)) {
      const node = ((e as Record<string, unknown>)?.node ?? {}) as Record<string, unknown>;
      const cap = (node.edge_media_to_caption as Record<string, unknown> | undefined)
        ?.edges as unknown[] | undefined;
      const capText = str((cap?.[0] as Record<string, unknown> | undefined)?.node);
      posts.push({
        caption: capText,
        likes: num(node.edge_liked_by, "count") ?? num(node.like_count),
        isVideo: node.is_video === true,
      });
    }
  }
  if (posts.length) {
    lines.push("Recent posts (captions):");
    posts.forEach((p, i) => {
      const kind = p.isVideo ? "video" : "photo";
      const likes = p.likes !== undefined ? ` · ${p.likes.toLocaleString()} likes` : "";
      lines.push(`${i + 1}. [${kind}]${likes} ${truncate(p.caption || "(no caption)", 200)}`);
    });
  }
  if (lines.length === 0) return null;
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Instagram via Meta Graph API — official, free Business Discovery
// ---------------------------------------------------------------------------

interface GraphMedia {
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  caption?: string;
  media_type?: string;
  permalink?: string;
}

interface GraphDiscovery {
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  website?: string;
  is_verified?: boolean;
  media?: { data?: GraphMedia[] };
}

/**
 * Instagram Business Discovery: with a connected business token, the Graph
 * API reads ANY public business profile's bio, stats and recent posts.
 * Official, free, and doesn't depend on scraping — used first when the
 * owner has connected their Instagram account.
 */
async function researchInstagramViaGraph(
  rawHandle: string,
  opts: ResearchOptions,
): Promise<string | null> {
  if (!opts.igToken || !opts.igAccountId) return null;
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;
  try {
    const url = new URL(
      `https://graph.facebook.com/v23.0/${opts.igAccountId}`,
    );
    url.searchParams.set(
      "fields",
      `business_discovery.username(${handle}){username,name,biography,followers_count,follows_count,media_count,website,is_verified,media{timestamp,like_count,comments_count,caption,media_type,permalink}}`,
    );
    url.searchParams.set("access_token", opts.igToken);
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { business_discovery?: GraphDiscovery };
    const d = data.business_discovery;
    if (!d || typeof d !== "object") return null;

    const lines: string[] = [];
    lines.push(`INSTAGRAM (@${d.username || handle}) — official Meta data`);
    if (d.name) lines.push(`Name: ${d.name}`);
    if (d.biography) lines.push(`Bio: ${truncate(d.biography, 300)}`);
    if (typeof d.followers_count === "number")
      lines.push(`Followers: ${d.followers_count.toLocaleString()}`);
    if (typeof d.media_count === "number")
      lines.push(`Posts: ${d.media_count}`);
    if (d.website) lines.push(`Website: ${d.website}`);
    if (d.is_verified === true) lines.push("Verified account");

    const posts = (d.media?.data ?? []).slice(0, MAX_POSTS);
    if (posts.length) {
      lines.push("Recent posts (captions):");
      posts.forEach((p, i) => {
        const kind = /VIDEO|REEL/i.test(p.media_type ?? "")
          ? "video"
          : p.media_type === "CAROUSEL_ALBUM"
            ? "carousel"
            : "photo";
        const likes =
          typeof p.like_count === "number"
            ? ` · ${p.like_count.toLocaleString()} likes`
            : "";
        const day = p.timestamp ? ` · ${String(p.timestamp).slice(0, 10)}` : "";
        lines.push(
          `${i + 1}. [${kind}]${likes}${day} ${truncate(
            p.caption || "(no caption)",
            200,
          )}`,
        );
      });
    }
    if (lines.length <= 1) return null;
    return lines.join("\n");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Instagram via Apify — reliable public-profile analysis (no login needed)
// ---------------------------------------------------------------------------

interface ApifyIgPost {
  caption?: string;
  displayUrl?: string;
  alt?: string;
  likesCount?: number;
  commentsCount?: number;
  type?: string;
  timestamp?: string;
  hashtags?: string[];
}

interface ApifyIgProfile {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  externalUrl?: string;
  businessCategoryName?: string;
  private?: boolean;
  isBusinessAccount?: boolean;
  verified?: boolean;
  latestPosts?: ApifyIgPost[];
}

/**
 * Scrape one public Instagram profile through Apify's managed actor.
 * Returns null when no token is configured or the run fails, so the
 * pipeline falls back to the free best-effort strategies below.
 */
async function researchInstagramViaApify(
  rawHandle: string,
): Promise<string | null> {
  if (!APIFY_TOKEN) return null;
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;

  let items: ApifyIgProfile[] | null = null;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [handle] }),
        signal: AbortSignal.timeout(APIFY_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      console.warn(`[IG research] @${handle}: Apify HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) {
      items = data as ApifyIgProfile[];
    } else {
      const wrapped = data as { items?: ApifyIgProfile[] } | null;
      if (wrapped && Array.isArray(wrapped.items)) items = wrapped.items;
    }
  } catch (err) {
    console.warn(`[IG research] @${handle}: Apify failed`, err);
    return null;
  }
  const profile = items?.find((p) => p && typeof p === "object") ?? null;
  if (!profile) return null;

  const lines: string[] = [];
  lines.push(`INSTAGRAM (@${profile.username || handle})`);
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.biography) lines.push(`Bio: ${truncate(profile.biography, 300)}`);
  if (profile.businessCategoryName) lines.push(`Category: ${profile.businessCategoryName}`);
  if (profile.followersCount !== undefined)
    lines.push(`Followers: ${profile.followersCount.toLocaleString()}`);
  if (profile.postsCount !== undefined)
    lines.push(`Posts: ${profile.postsCount}`);
  if (profile.private === true)
    lines.push("Private account (posts not visible)");
  if (profile.verified === true) lines.push("Verified account");

  const posts = (profile.latestPosts ?? []).slice(0, MAX_POSTS);
  if (posts.length) {
    lines.push("Recent posts (captions):");
    posts.forEach((p, i) => {
      const kind = /video|reel/i.test(p.type ?? "") ? "video" : "photo";
      const likes =
        p.likesCount !== undefined
          ? ` · ${p.likesCount.toLocaleString()} likes`
          : "";
      const day = p.timestamp ? ` · ${String(p.timestamp).slice(0, 10)}` : "";
      const tags = Array.isArray(p.hashtags) && p.hashtags.length
        ? ` · ${p.hashtags.slice(0, 8).join(" ")}`
        : "";
      const alt = p.alt ? ` (image: ${truncate(p.alt, 120)})` : "";
      lines.push(
        `${i + 1}. [${kind}]${likes}${day}${tags} ${truncate(
          p.caption || "(no caption)",
          200,
        )}${alt}`,
      );
    });
  }
  if (lines.length <= 1) return null;

  const aesthetic = await analyzeBrandAesthetic(profile.username || handle, profile);
  if (aesthetic) lines.push("", aesthetic);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Brand aesthetic & personality — a vision model looks at the brand's recent
// post images and captions and describes how the feed looks and sounds, so
// the plan can match it.
// ---------------------------------------------------------------------------

interface AestheticResult {
  overallLook?: string;
  palette?: string[];
  lighting?: string;
  composition?: string;
  editing?: string;
  settingAndProps?: string;
  recurringSubjects?: string[];
  mood?: string;
  personalityTraits?: string[];
  captionVoice?: string;
  whatWorks?: string[];
  offBrand?: string[];
  postProducts?: { post?: number; name?: string; type?: string; looks?: string }[];
}

const AESTHETIC_SYSTEM = `You are a brand designer and social media art director. You are shown a small business's most recent Instagram post images with their captions and engagement. Describe the brand's real visual identity and personality so a content planner can create new posts that sit naturally in this feed.

Be concrete and specific to what you actually see — name colours, light, angles, backgrounds, props, textures, fonts on graphics, people/no people. Never invent things that aren't visible. Keep every field short.

Also identify the product in each post ("postProducts"). Decide WHAT the item is from the IMAGE, never from words in its name: a drink called "Espresso Choco Cake Matcha" served in a cup is a matcha DRINK, not a cake; a cake called "Latte Slice" is a DESSERT, not a drink. Use the caption only for the item's name; if it isn't named, give a specific descriptive name ("iced matcha latte with strawberry cold foam"), never a vague one — BAD: "fall drink", "matcha drink", "matcha drink close-up", "matcha product"; GOOD: "iced matcha latte with banana cream", "matcha powder tin". Never put camera words (close-up, flat lay) in a name. "looks" describes ONLY the product itself: vessel or plate, colours, layers, toppings, garnish, hot/iced, size — not the background, setting or who is holding it. List only things the business sells: skip interiors, people, events, design work and text-only graphics (no product visible = skip). If one photo shows two products (e.g. a drink and a pastry), list them as two separate entries, each with its own type.

Return ONLY valid JSON:
{"overallLook":"one sentence describing the feed's look and feel","palette":["3-6 dominant colours, plain names"],"lighting":"...","composition":"framing, angles, negative space, close-ups vs wide","editing":"filters, contrast, warmth, grain, text overlays","settingAndProps":"backgrounds, surfaces, props, location cues","recurringSubjects":["what they post most"],"mood":"the emotional feel","personalityTraits":["3-5 adjectives for the brand personality"],"captionVoice":"how captions read: length, emoji use, humour, formality, recurring phrases","whatWorks":["which subjects/formats get the most likes here"],"offBrand":["things that would clash with this feed"],"postProducts":[{"post":1,"name":"the product's name from its caption, or a plain description if unnamed","type":"drink | food | dessert | baked good | retail product | service | other","looks":"what it physically looks like in the photo"}]}`;

/** Download one image and return it as a data URL, or null on any failure. */
async function imageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function analyzeBrandAesthetic(
  handle: string,
  profile: ApifyIgProfile,
): Promise<string | null> {
  const posts = (profile.latestPosts ?? [])
    .filter((p) => p.displayUrl)
    .slice(0, AESTHETIC_IMAGES);
  if (posts.length < 2) return null;

  // Instagram CDN links are short-lived and sometimes blocked for third
  // parties, so download the images here and send them inline.
  const images = await Promise.all(posts.map((p) => imageDataUrl(p.displayUrl!)));
  const parts: ChatContentPart[] = [
    {
      type: "text",
      text: `Instagram account @${handle}${profile.fullName ? ` (${profile.fullName})` : ""}${
        profile.businessCategoryName ? ` — ${profile.businessCategoryName}` : ""
      }.\nBio: ${truncate(profile.biography || "(none)", 300)}\n\nRecent posts, newest first:`,
    },
  ];
  let imageCount = 0;
  posts.forEach((p, i) => {
    const kind = /video|reel/i.test(p.type ?? "") ? "video (cover frame)" : (p.type ?? "photo").toLowerCase();
    const likes = p.likesCount !== undefined ? `, ${p.likesCount} likes` : "";
    parts.push({
      type: "text",
      text: `\nPost ${i + 1} — ${kind}${likes}. Caption: ${truncate(p.caption || "(no caption)", 300)}`,
    });
    if (images[i]) {
      parts.push({ type: "image_url", image_url: { url: images[i]!, detail: "low" } });
      imageCount++;
    }
  });
  if (imageCount < 2) {
    console.warn(`[IG research] @${handle}: aesthetic skipped, only ${imageCount} images downloaded`);
    return null;
  }

  const raw = await chat(
    [
      { role: "system", content: AESTHETIC_SYSTEM },
      { role: "user", content: parts },
    ],
    { maxTokens: 2000, temperature: 0.3, timeoutMs: 90_000 },
  );
  const a = raw ? parseAiJson<AestheticResult>(raw) : null;
  if (!a || typeof a !== "object") {
    console.warn(`[IG research] @${handle}: aesthetic analysis failed`);
    return null;
  }

  const list = (x: unknown): string =>
    Array.isArray(x) ? x.filter((v) => typeof v === "string" && v.trim()).join(", ") : "";
  const text = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
  const rows: [string, string][] = [
    ["Overall look", text(a.overallLook)],
    ["Colour palette", list(a.palette)],
    ["Lighting", text(a.lighting)],
    ["Composition", text(a.composition)],
    ["Editing", text(a.editing)],
    ["Setting & props", text(a.settingAndProps)],
    ["Recurring subjects", list(a.recurringSubjects)],
    ["Mood", text(a.mood)],
    ["Personality", list(a.personalityTraits)],
    ["Caption voice", text(a.captionVoice)],
    ["What performs best", list(a.whatWorks)],
    ["Off-brand (avoid)", list(a.offBrand)],
  ];
  const body = rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${truncate(v, 260)}`);
  if (body.length < 3) return null;

  const seen = (Array.isArray(a.postProducts) ? a.postProducts : [])
    .map((p) => ({ name: text(p?.name), type: text(p?.type), looks: text(p?.looks) }))
    .filter((p) => p.name && p.type);
  console.log(
    `[IG research] @${handle}: aesthetic analysed from ${imageCount} images, ${seen.length} products identified`,
  );
  const out = [`BRAND AESTHETIC & PERSONALITY (from their last ${imageCount} Instagram posts)`, ...body];
  if (seen.length) {
    out.push(
      "",
      "PRODUCTS AS SEEN IN THEIR PHOTOS (what each item really is and how it looks)",
      ...seen.map((p) => `• ${p.name} — ${p.type.toUpperCase()}${p.looks ? `. Looks: ${truncate(p.looks, 200)}` : ""}`),
    );
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Instagram via session cookies — uses a real logged-in session to hit
// Instagram's internal web_profile_info API. No Meta app needed.
// ---------------------------------------------------------------------------

async function researchInstagramViaSession(
  rawHandle: string,
): Promise<string | null> {
  if (!IG_SESSION_ID || !IG_CSRF_TOKEN) return null;
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;
  try {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept": "application/json",
        "x-ig-app-id": "936619743392459",
        "x-csrftoken": IG_CSRF_TOKEN,
        "cookie": `sessionid=${IG_SESSION_ID}; csrftoken=${IG_CSRF_TOKEN}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(
        `[IG research] session lookup for @${handle} failed: HTTP ${res.status}` +
          (res.status === 401 || res.status === 403 || res.url.includes("/accounts/login")
            ? " (session expired or cookies mismatched — refresh IG_SESSION_ID and IG_CSRF_TOKEN)"
            : res.status === 429
              ? " (rate limited by Instagram)"
              : ""),
      );
      return null;
    }
    const data = (await res.json()) as unknown;
    const user = dig(data, "data", "user") as Rec | undefined;
    if (!user) {
      console.warn(`[IG research] session lookup for @${handle}: no user in response`);
      return null;
    }

    const lines: string[] = [];
    lines.push(`INSTAGRAM (@${handle}) — via session`);
    const fullName = str(user.full_name);
    if (fullName) lines.push(`Name: ${fullName}`);
    const bio = str(user.biography);
    if (bio) lines.push(`Bio: ${truncate(bio, 300)}`);
    const category = str(user.category_name) || str(user.category);
    if (category) lines.push(`Category: ${category}`);
    const followers = num(user.edge_followed_by, "count") ?? num(user.follower_count);
    if (followers !== undefined) lines.push(`Followers: ${followers.toLocaleString()}`);
    const postsCount = num(user.edge_owner_to_timeline_media, "count") ?? num(user.media_count);
    if (postsCount !== undefined) lines.push(`Posts: ${postsCount}`);
    if (user.is_private === true) lines.push("Private account (posts not visible)");
    if (user.is_verified === true) lines.push("Verified account");

    const media = (user.edge_owner_to_timeline_media as Record<string, unknown> | undefined)
      ?.edges as unknown[] | undefined;
    if (Array.isArray(media) && media.length) {
      lines.push("Recent posts (captions):");
      media.slice(0, MAX_POSTS).forEach((e, i) => {
        const node = ((e as Record<string, unknown>)?.node ?? {}) as Record<string, unknown>;
        const cap = (node.edge_media_to_caption as Record<string, unknown> | undefined)
          ?.edges as unknown[] | undefined;
        const capText = str((cap?.[0] as Record<string, unknown> | undefined)?.node);
        const likes = num(node.edge_liked_by, "count") ?? num(node.like_count);
        const kind = node.is_video === true ? "video" : "photo";
        const likesStr = likes !== undefined ? ` · ${likes.toLocaleString()} likes` : "";
        lines.push(`${i + 1}. [${kind}]${likesStr} ${truncate(capText || "(no caption)", 200)}`);
      });
    }
    if (lines.length <= 1) return null;
    return lines.join("\n");
  } catch {
    return null;
  }
}

async function researchInstagram(
  rawHandle: string,
  opts: ResearchOptions = {},
): Promise<string | null> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;

  // Apify first — reliable public-profile scraping (no Instagram login) and
  // the only path that also analyses the brand's visual aesthetic.
  const apify = await researchInstagramViaApify(rawHandle);
  if (apify) {
    console.log(`[IG research] @${handle}: via Apify`);
    return apify;
  }

  // Official Meta Business Discovery when the owner has connected their
  // Instagram account.
  const graph = await researchInstagramViaGraph(rawHandle, opts);
  if (graph) {
    console.log(`[IG research] @${handle}: via Meta Graph API`);
    return graph;
  }

  // Session cookies — backup when Apify is unavailable or fails.
  const session = await researchInstagramViaSession(rawHandle);
  if (session) {
    console.log(`[IG research] @${handle}: via session cookies`);
    return session;
  }

  // Run both strategies in parallel; take whichever finds data first.
  const attempts: Promise<string | null>[] = [
    (async () => {
      const html = await fetchText(`https://www.instagram.com/${handle}/`);
      if (!html) return null;

      // Embedded profile JSON (the classic _sharedData / additionalDataLoaded payloads).
      const shared = extractScriptJson(html, "window._sharedData =");
      const extra = extractScriptJson(html, "__additionalDataLoaded('extra'");
      const igUser = dig(shared ?? extra, "entry_data", "ProfilePage", 0, "graphql", "user") as
        | Rec
        | undefined;
      if (igUser) {
        const summary = summarizeIgUser(igUser);
        if (summary) return `INSTAGRAM (@${handle})\n${summary}`;
      }

      // og:description fallback ("N Followers, N Following, N Posts — See Instagram...").
      const og = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (og) {
        const desc = og[1].replace(/&amp;/g, "&").slice(0, 300);
        if (!/log in/i.test(desc)) return `INSTAGRAM (@${handle})\n${desc}`;
      }
      return null;
    })(),
    (async () => {
      // Jina's reader renders the page in a real browser — it occasionally
      // gets through for public profiles when the direct fetch can't.
      const txt = await fetchText(`https://r.jina.ai/https://www.instagram.com/${handle}/`);
      if (!txt) return null;
      const body = txt
        .replace(/^[\s\S]*?Markdown Content:\s*/i, "")
        .replace(/\s+/g, " ")
        .slice(0, 1400);
      if (
        !body ||
        body.length < 40 ||
        /log into instagram|create new account|this page isn't available/i.test(body)
      ) {
        return null;
      }
      return `INSTAGRAM (@${handle})\n${truncate(body, 1200)}`;
    })(),
  ];

  const results = await Promise.allSettled(attempts);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      console.log(`[IG research] @${handle}: via public page fallback`);
      return r.value;
    }
  }
  console.warn(`[IG research] @${handle}: no data from any method`);
  return null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Website — homepage plus menu / product / services pages
// ---------------------------------------------------------------------------

/** Turn whatever the owner typed into a full https URL, or undefined. */
export function normalizeWebsite(raw: string | undefined): string | undefined {
  let s = (raw ?? "").trim();
  if (!s || /\s/.test(s)) return undefined;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return undefined;
    // Their Instagram is researched separately.
    if (/(^|\.)instagram\.com$/i.test(u.hostname)) return undefined;
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

const MENU_LINK =
  /menu|product|shop|store|service|pric|treatment|collection|catalog|order|food|drink|dishes|offer/i;

/** Read a page as text through Jina's reader (renders JS sites and PDFs). */
async function readPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      // No browser user-agent here: the reader answers 403 to spoofed UAs.
      headers: { "x-return-format": "markdown" },
      signal: AbortSignal.timeout(WEBSITE_TIMEOUT_MS),
    });
    if (res.ok) {
      const txt = (await res.text()).replace(/^[\s\S]*?Markdown Content:\s*/i, "");
      if (txt.trim().length > 80) return txt;
    } else {
      console.warn(`[Web research] reader HTTP ${res.status} for ${url}`);
    }
  } catch (err) {
    console.warn(`[Web research] reader failed for ${url}`, err);
  }
  const html = await fetchText(url);
  if (!html) return null;
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => `[${m[2].replace(/<[^>]+>/g, "").trim()}](${m[1]})`)
    .join(" ");
  const text = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 80 ? `${text}\n${links}` : null;
}

async function researchWebsite(rawUrl: string): Promise<string | null> {
  const url = normalizeWebsite(rawUrl);
  if (!url) return null;
  const home = await readPage(url);
  if (!home) {
    console.warn(`[Web research] ${url}: could not read homepage`);
    return null;
  }

  // Follow a couple of same-site links that look like a menu / products page.
  const host = new URL(url).hostname.replace(/^www\./, "");
  const extra: string[] = [];
  for (const m of home.matchAll(/\[([^\]]{0,80})\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g)) {
    let link: URL;
    try {
      link = new URL(m[2], url);
    } catch {
      continue;
    }
    if (link.hostname.replace(/^www\./, "") !== host) continue;
    if (!MENU_LINK.test(`${m[1]} ${link.pathname}`)) continue;
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(link.pathname)) continue;
    link.hash = "";
    const href = link.toString();
    if (href.replace(/\/$/, "") === url || extra.includes(href)) continue;
    extra.push(href);
    if (extra.length >= WEBSITE_EXTRA_PAGES) break;
  }
  const pages = await Promise.all(extra.map((u) => readPage(u)));

  const strip = (t: string) =>
    t
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // keep link text only
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const parts = [`HOMEPAGE (${url})\n${strip(home)}`];
  pages.forEach((t, i) => {
    if (t) parts.push(`PAGE (${extra[i]})\n${strip(t)}`);
  });
  console.log(`[Web research] ${url}: read ${1 + pages.filter(Boolean).length} page(s)`);
  return parts.join("\n\n").slice(0, MAX_WEBSITE_TEXT);
}

// ---------------------------------------------------------------------------
// Product discovery — what they actually sell, from Instagram + website
// ---------------------------------------------------------------------------

interface ProductExtraction {
  products?: { name?: string; type?: string; looks?: string; detail?: string }[];
  websiteSummary?: string;
}

const PRODUCTS_SYSTEM = `You read a small business's Instagram research and website text and list what the business ACTUALLY sells — specific products, menu items, dishes, drinks, services, treatments or packages.

Rules:
- Only list items clearly shown in the material (menu, product pages, captions, photos). Never invent items, prices or names.
- Be specific ("Iced Ube Latte", "Balayage", "Sourdough Croissant"), not generic categories ("drinks", "hair services") — unless only the category is known.
- Prefer signature items, best-sellers and items that appear repeatedly. Max ${MAX_PRODUCTS}.
- Merge entries that are clearly the same item seen in several posts into one, keeping the most specific name. Rename vague or camera-word names ("matcha drink close-up") to a specific descriptive name built from the look. Never list interiors, people, events, design work, or items whose only evidence is a text graphic.
- Never combine two items into one entry ("matcha drink and pastry") — split them.
- "type" is what the item really is: drink | food | dessert | baked good | retail product | service | other.
  • If the item appears in "PRODUCTS AS SEEN IN THEIR PHOTOS", copy its type and look from there — that is what the photo shows, and it overrides any words in the name.
  • Otherwise use the menu section or description it sits under (an item under "Drinks" is a drink).
  • Never decide the type from words inside the name alone: "Espresso Choco Cake Matcha" can be a drink. If nothing tells you, use "unknown".
- "looks" is what it physically looks like (vessel/plate, colours, layers, toppings, garnish, hot/iced) — from the photos, or from the website's description; "" if unknown.
- "detail" is optional and short: price, size, key ingredient or what makes it special — only if stated.
- "websiteSummary": 2-4 sentences on what the website says about the business (offer, story, location, ordering/booking), or "" if no website text was given.

Return ONLY valid JSON: {"products":[{"name":"...","type":"...","looks":"...","detail":"..."}],"websiteSummary":"..."}`;

async function extractProducts(
  igBrief: string | null,
  websiteText: string | null,
  opts: ResearchOptions,
): Promise<ProductExtraction | null> {
  const user = [
    `Business: ${opts.businessName || "(unknown)"}${opts.businessType ? ` — ${opts.businessType}` : ""}`,
    igBrief ? `\nINSTAGRAM RESEARCH:\n${igBrief}` : "",
    websiteText ? `\nWEBSITE TEXT:\n${websiteText}` : "",
  ].join("\n");
  const raw = await chat(
    [
      { role: "system", content: PRODUCTS_SYSTEM },
      { role: "user", content: user },
    ],
    { maxTokens: 1200, temperature: 0.2, timeoutMs: 60_000 },
  );
  const parsed = raw ? parseAiJson<ProductExtraction>(raw) : null;
  return parsed && typeof parsed === "object" ? parsed : null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Visit their Instagram and website in parallel, then work out what they
 * sell from both. Never throws; returns an empty brief when nothing public
 * could be gathered.
 */
export async function researchProfiles(
  handles: SocialHandles,
  opts: ResearchOptions = {},
): Promise<ResearchResult> {
  const [ig, web] = await Promise.all([
    handles.instagram ? researchInstagram(handles.instagram, opts).catch(() => null) : null,
    handles.website ? researchWebsite(handles.website).catch(() => null) : null,
  ]);
  if (!ig && !web) return { brief: "", products: [] };

  const extracted = await extractProducts(ig, web, opts);
  const seen = new Set<string>();
  const clean = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  // Models sometimes name an item after the shot ("matcha drink close-up").
  const cleanName = (x: unknown) =>
    clean(x).replace(/[\s,–—-]*\b(close-?up|flat ?lay)s?\s*$/i, "").trim();
  const items = (extracted?.products ?? [])
    .map((p) => ({ name: cleanName(p?.name), type: clean(p?.type), looks: clean(p?.looks), detail: clean(p?.detail) }))
    .filter((p) => p.name && !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase()))
    .slice(0, MAX_PRODUCTS);
  // Plain names go into the product list; type + look live in the brief.
  const products = items.map((p) => p.name);
  const describe = (p: (typeof items)[number]) =>
    [
      `• ${p.name}`,
      p.type && p.type.toLowerCase() !== "unknown" ? ` — ${p.type.toUpperCase()}` : "",
      p.looks ? `. Looks: ${truncate(p.looks, 160)}` : "",
      p.detail ? `. ${truncate(p.detail, 80)}` : "",
    ].join("");

  const sections: string[] = [];
  // The per-photo product list fed the extractor; the merged list below replaces it.
  const igBrief =
    ig && items.length ? ig.replace(/\n\nPRODUCTS AS SEEN IN THEIR PHOTOS[\s\S]*$/, "") : ig;
  if (igBrief) sections.push(igBrief);
  if (web) {
    const summary = extracted?.websiteSummary?.trim();
    sections.push(
      `WEBSITE (${normalizeWebsite(handles.website)})\n${summary || truncate(web.replace(/\s+/g, " "), 1200)}`,
    );
  }
  if (items.length) {
    sections.push(
      `PRODUCTS & SERVICES FOUND ON THEIR INSTAGRAM/WEBSITE (type and look are facts — follow them exactly)\n${items.map(describe).join("\n")}`,
    );
  }
  console.log(
    `[Research] ig=${Boolean(ig)} web=${Boolean(web)} products=${products.length}`,
  );
  // Keep the products and website sections even when the Instagram part is long.
  const tail = sections.slice(igBrief ? 1 : 0).join("\n\n");
  const head = igBrief ? truncate(igBrief, Math.max(1500, MAX_BRIEF - tail.length - 2)) : "";
  return { brief: [head, tail].filter(Boolean).join("\n\n"), products };
}
