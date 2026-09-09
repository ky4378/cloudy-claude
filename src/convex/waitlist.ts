import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Join the launch waitlist. Idempotent per email. */
export const join = mutation({
  args: {
    email: v.string(),
    businessType: v.optional(v.string()),
  },
  handler: async (ctx, { email, businessType }) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      throw new Error("Please enter a valid email address.");
    }
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (existing) {
      if (businessType && !existing.businessType) {
        await ctx.db.patch(existing._id, { businessType });
      }
      return { joined: true, alreadyOnList: true };
    }
    await ctx.db.insert("waitlist", {
      email: normalized,
      businessType: businessType?.trim() || undefined,
      createdAt: Date.now(),
    });
    return { joined: true, alreadyOnList: false };
  },
});

/** Public count only — emails are never exposed. */
export const count = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("waitlist").collect();
    return rows.length;
  },
});
