/**
 * Cloudy AI — Meta Instagram Graph API connection.
 *
 * The free, official, ToS-compliant research path: the business owner clicks
 * "Connect Instagram", Meta's OAuth dialog grants read-only access to their
 * Instagram Business account, and we store a long-lived token on the business
 * record. Research (src/convex/lib/research.ts) then uses Instagram Business
 * Discovery to read ANY public business profile's bio, stats and recent posts
 * — no passwords, no scraping, no per-look cost.
 *
 * Env vars (set in the Freebuff Keys tab):
 *   META_APP_ID     — App ID of your Meta for Developers app
 *   META_APP_SECRET — App Secret of the same app
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const GRAPH_VERSION = "v23.0";
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

interface GraphError {
  error?: { message?: string };
}

const jsonOrThrow = async (res: Response): Promise<Record<string, unknown>> => {
  const data = (await res.json()) as Record<string, unknown> & GraphError;
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Meta API error (${res.status})`);
  }
  return data;
};

/** Exchange the OAuth `code` from the redirect for a short-lived token. */
async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", APP_ID!);
  url.searchParams.set("client_secret", APP_SECRET!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const data = await jsonOrThrow(res);
  const token = data.access_token;
  if (typeof token !== "string" || !token) throw new Error("No access token returned");
  return token;
}

/** Exchange a short-lived token for a long-lived (~60 day) one. */
async function exchangeLongLived(
  shortToken: string,
): Promise<{ token: string; expiresAt?: number }> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", APP_ID!);
  url.searchParams.set("client_secret", APP_SECRET!);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url);
  const data = await jsonOrThrow(res);
  const token = data.access_token;
  if (typeof token !== "string" || !token) throw new Error("Token exchange failed");
  const expiresIn = data.expires_in;
  const expiresAt =
    typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : undefined;
  return { token, expiresAt };
}

/**
 * Find the user's Instagram Business account. Meta links each Instagram
 * Business account to a Facebook Page, so we list the user's pages and pick
 * the first one that carries an instagram_business_account.
 */
async function findInstagramBusiness(
  token: string,
): Promise<{ id: string; username: string } | null> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
  url.searchParams.set(
    "fields",
    "name,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const data = await jsonOrThrow(res);
  const pages = Array.isArray(data.data) ? data.data : [];
  for (const page of pages) {
    const ig = (page as { instagram_business_account?: { id?: string; username?: string } })
      .instagram_business_account;
    if (ig?.id && ig.username) return { id: ig.id, username: ig.username };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns what the frontend needs to render the Connect Instagram panel:
 * whether the Meta app is configured, and whether this user's business is
 * already connected (username, token expiry). Never returns the token.
 */
export const getInstagramSetup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const base = {
      // App ID is public by design — needed client-side to build the OAuth URL.
      appId: APP_ID ?? null,
      configured: Boolean(APP_ID && APP_SECRET),
    };
    if (userId === null) {
      return { ...base, connected: false, connectedUsername: null, expiresAt: null };
    }
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return {
      ...base,
      connected: Boolean(business?.igToken),
      connectedUsername: business?.igConnectedUsername ?? null,
      expiresAt: business?.igTokenExpiresAt ?? null,
    };
  },
});

/**
 * Finish the OAuth flow: exchange the `code` Meta redirected back with for a
 * long-lived token, locate the user's Instagram Business account, and store
 * the connection on their business record. The client never sees the token.
 */
export const connectInstagram = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, { code, redirectUri }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!APP_ID || !APP_SECRET) {
      throw new Error("Meta app not configured — add META_APP_ID and META_APP_SECRET in the Keys tab.");
    }
    const business = await ctx.runQuery(internal.businesses.getBusinessByUser, {
      userId,
    });
    if (!business) throw new Error("Create your business profile first.");

    const shortToken = await exchangeCode(code, redirectUri);
    const { token, expiresAt } = await exchangeLongLived(shortToken);
    const ig = await findInstagramBusiness(token);
    if (!ig) {
      throw new Error(
        "No Instagram Business account found. Make sure the Instagram account is a Business or Creator account linked to a Facebook Page.",
      );
    }

    await ctx.runMutation(internal.businesses.saveIgConnection, {
      businessId: business._id,
      igToken: token,
      igTokenExpiresAt: expiresAt,
      igConnectedUsername: ig.username,
      igConnectedAccountId: ig.id,
    });
    return { username: ig.username };
  },
});

/** Revoke the connection: clears the stored token so research falls back. */
export const disconnectInstagram = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (business) {
      await ctx.db.patch(business._id, {
        igToken: undefined,
        igTokenExpiresAt: undefined,
        igConnectedUsername: undefined,
        igConnectedAccountId: undefined,
      });
    }
  },
});
