import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Brand media library — logo + photos the owner uploads. Files live in
 * Supabase Storage; this module keeps the metadata in Convex.
 */

/** The current user's media, newest first. Returns null when not signed in or no business. */
export const myMedia = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!business) return null;
    const media = await ctx.db
      .query("businessMedia")
      .withIndex("by_business", (q) => q.eq("businessId", business._id))
      .order("desc")
      .collect();
    return {
      businessId: business._id,
      media: media.map((m) => ({
        id: m._id,
        kind: m.kind,
        fileName: m.fileName,
        mimeType: m.mimeType,
        url: m.url,
        createdAt: m.createdAt,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Internal helpers — used by the Supabase actions in src/convex/supabase.ts
// ---------------------------------------------------------------------------

export const getMediaByBusiness = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) =>
    ctx.db
      .query("businessMedia")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect(),
});

export const getMediaById = internalQuery({
  args: { id: v.id("businessMedia") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const insertMedia = internalMutation({
  args: {
    businessId: v.id("businesses"),
    kind: v.union(v.literal("logo"), v.literal("photo")),
    fileName: v.string(),
    mimeType: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("businessMedia", { ...args, createdAt: Date.now() });
  },
});

export const deleteMedia = internalMutation({
  args: { id: v.id("businessMedia") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
