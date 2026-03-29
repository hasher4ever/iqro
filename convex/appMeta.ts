import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestBuildId = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const meta = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q: any) => q.eq("key", "latestBuildId"))
      .first();
    return meta?.value ?? null;
  },
});

export const setLatestBuildId = mutation({
  args: { buildId: v.string(), changelog: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q: any) => q.eq("key", "latestBuildId"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.buildId });
    } else {
      await ctx.db.insert("appMeta", { key: "latestBuildId", value: args.buildId });
    }

    // Also store changelog
    if (args.changelog !== undefined) {
      const clEntry = await ctx.db
        .query("appMeta")
        .withIndex("by_key", (q: any) => q.eq("key", "latestChangelog"))
        .first();
      if (clEntry) {
        await ctx.db.patch(clEntry._id, { value: args.changelog });
      } else {
        await ctx.db.insert("appMeta", { key: "latestChangelog", value: args.changelog });
      }
    }

    return null;
  },
});
