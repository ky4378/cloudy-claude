/**
 * Cloudy AI — Supabase Storage integration.
 *
 * Brand media (logo + photos) lives in Supabase Storage under a public
 * "brand-media" bucket; Convex keeps the metadata. Everything runs
 * server-side in the Node runtime so the service role key never touches the
 * browser — it's read from the project's environment variables
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, managed in the Keys tab).
 */

"use node";

import { createClient } from "@supabase/supabase-js";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "brand-media";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const configured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

type UploadResult = { ok: true; url: string } | { ok: false; error: string };
type DeleteResult = { ok: true } | { ok: false; error: string };

function getClient() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Create the public bucket on first use (no-op when it already exists). */
async function ensureBucket(): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (error && !String(error.message).toLowerCase().includes("already exists")) {
    throw error;
  }
}

function safeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "image";
}

/**
 * Upload a brand image (logo or photo) to Supabase Storage and record it in
 * Convex. The browser sends the file as base64; the action decodes it and
 * stores it under the business's own folder.
 */
export const uploadImage = action({
  args: {
    kind: v.union(v.literal("logo"), v.literal("photo")),
    fileName: v.string(),
    mimeType: v.string(),
    base64: v.string(),
  },
  handler: async (ctx, { kind, fileName, mimeType, base64 }): Promise<UploadResult> => {
    if (!configured) {
      return {
        ok: false,
        error:
          "Supabase isn't configured yet — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Keys tab.",
      };
    }
    if (!mimeType.startsWith("image/")) {
      return { ok: false, error: "Only image files are allowed." };
    }

    const userId = await getAuthUserId(ctx);
    if (userId === null) return { ok: false, error: "Not signed in." };

    const business = await ctx.runQuery(internal.businesses.getBusinessByUser, {
      userId,
    });
    if (!business) return { ok: false, error: "No business found." };

    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength === 0) return { ok: false, error: "Empty file." };
    if (bytes.byteLength > MAX_BYTES) {
      return { ok: false, error: "Images must be 8 MB or smaller." };
    }

    try {
      await ensureBucket();
      const path = `${business._id}/${kind}/${Date.now()}-${safeFileName(fileName)}`;
      const supabase = getClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;

      await ctx.runMutation(internal.businessMedia.insertMedia, {
        businessId: business._id,
        kind,
        fileName,
        mimeType,
        url,
      });
      return { ok: true, url };
    } catch (err) {
      return {
        ok: false,
        error: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },
});

/**
 * Delete a media item — removes the file from Supabase Storage and its
 * metadata row from Convex. Ownership is verified before anything is removed.
 */
export const deleteImage = action({
  args: { mediaId: v.id("businessMedia") },
  handler: async (ctx, { mediaId }): Promise<DeleteResult> => {
    if (!configured) {
      return {
        ok: false,
        error:
          "Supabase isn't configured yet — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Keys tab.",
      };
    }

    const userId = await getAuthUserId(ctx);
    if (userId === null) return { ok: false, error: "Not signed in." };

    const business = await ctx.runQuery(internal.businesses.getBusinessByUser, {
      userId,
    });
    if (!business) return { ok: false, error: "No business found." };

    const media = await ctx.runQuery(internal.businessMedia.getMediaById, {
      id: mediaId,
    });
    if (!media || media.businessId !== business._id) {
      return { ok: false, error: "Media item not found." };
    }

    try {
      // The public URL ends with /object/public/brand-media/<path>
      const marker = `/object/public/${BUCKET}/`;
      const idx = media.url.indexOf(marker);
      if (idx !== -1) {
        const path = media.url.slice(idx + marker.length);
        const { error: removeError } = await getClient()
          .storage.from(BUCKET)
          .remove([path]);
        if (removeError) throw removeError;
      }
      await ctx.runMutation(internal.businessMedia.deleteMedia, {
        id: mediaId,
      });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: `Delete failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },
});

