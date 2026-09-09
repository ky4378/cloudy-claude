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
const MAX_BRIEF = 5000;
const TIMEOUT_MS = 7000;
const APIFY_TIMEOUT_MS = 60000;

export interface SocialHandles {
  instagram?: string;
}

/**
 * Optional Meta Instagram Graph API credentials (from the owner's connected
 * Instagram Business account). When present, Instagram research prefers the
 * official, free Business Discovery API over scraping.
 */
export interface ResearchOptions {
  igToken?: string;
  igAccountId?: string;
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
  category?: string;
  isPrivate?: boolean;
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
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${handle}/`],
          resultsLimit: 1,
        }),
        signal: AbortSignal.timeout(APIFY_TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) {
      items = data as ApifyIgProfile[];
    } else {
      const wrapped = data as { items?: ApifyIgProfile[] } | null;
      if (wrapped && Array.isArray(wrapped.items)) items = wrapped.items;
    }
  } catch {
    return null;
  }
  const profile = items?.find((p) => p && typeof p === "object") ?? null;
  if (!profile) return null;

  const lines: string[] = [];
  lines.push(`INSTAGRAM (@${profile.username || handle})`);
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.biography) lines.push(`Bio: ${truncate(profile.biography, 300)}`);
  if (profile.category) lines.push(`Category: ${profile.category}`);
  if (profile.followersCount !== undefined)
    lines.push(`Followers: ${profile.followersCount.toLocaleString()}`);
  if (profile.postsCount !== undefined)
    lines.push(`Posts: ${profile.postsCount}`);
  if (profile.isPrivate === true)
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
      const tags = Array.isArray(p.hashtags)
        ? ` · ${p.hashtags.slice(0, 8).join(" ")}`
        : "";
      lines.push(
        `${i + 1}. [${kind}]${likes}${day}${tags} ${truncate(
          p.caption || "(no caption)",
          200,
        )}`,
      );
    });
  }
  if (lines.length <= 1) return null;
  return lines.join("\n");
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
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const user = dig(data, "data", "user") as Rec | undefined;
    if (!user) return null;

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

  // Official Meta Business Discovery first (free + ToS-compliant) when the
  // owner has connected their Instagram account.
  const graph = await researchInstagramViaGraph(rawHandle, opts);
  if (graph) return graph;

  // Session cookies — reliable profile reading via a real Instagram login.
  const session = await researchInstagramViaSession(rawHandle);
  if (session) return session;

  // Apify next — reliable public-profile scraping when a token is configured.
  const apify = await researchInstagramViaApify(rawHandle);
  if (apify) return apify;

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
    if (r.status === "fulfilled" && r.value) return r.value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Visit all provided profiles in parallel and build a compact brand brief.
 * Returns "" (never throws) when nothing public could be gathered.
 */
export async function researchProfiles(
  handles: SocialHandles,
  opts: ResearchOptions = {},
): Promise<string> {
  const jobs: Promise<string | null>[] = [];
  if (handles.instagram) jobs.push(researchInstagram(handles.instagram, opts));

  const settled = await Promise.allSettled(jobs);
  const brief = settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is string => Boolean(v))
    .join("\n\n")
    .slice(0, MAX_BRIEF);
  return brief;
}
