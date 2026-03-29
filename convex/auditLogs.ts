import { query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

export const list = query({
args: {
entityType: v.optional(v.string()),
limit: v.optional(v.number()),
},
returns: v.array(v.object({
_id: v.id("auditLogs"),
_creationTime: v.number(),
userId: v.id("users"),
userName: v.optional(v.string()),
action: v.string(),
entityType: v.string(),
entityId: v.optional(v.string()),
details: v.optional(v.string()),
timestamp: v.number(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new Error("Insufficient permissions");
}
if (!user.companyId) return [];

const limit = args.limit || 100;

// Use compound index when entityType is provided, otherwise query by company
let logs;
if (args.entityType) {
  logs = await ctx.db
    .query("auditLogs")
    .withIndex("by_company_and_entityType", (q: any) =>
      q.eq("companyId", user.companyId).eq("entityType", args.entityType)
    )
    .order("desc")
    .take(limit);
} else {
  logs = await ctx.db
    .query("auditLogs")
    .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
    .order("desc")
    .take(limit);
}

const result: Array<{
_id: Id<"auditLogs">;
_creationTime: number;
userId: Id<"users">;
userName: string | undefined;
action: string;
entityType: string;
entityId: string | undefined;
details: string | undefined;
timestamp: number;
}> = [];

// Batch-fetch all user names upfront
const logUserIds = [...new Set(logs.map((l: any) => l.userId))] as Id<"users">[];
const logUserNameMap: Record<string, string | undefined> = {};
for (const uid of logUserIds) {
const u = await ctx.db.get(uid);
logUserNameMap[uid as string] = u?.name;
}

for (const log of logs) {
result.push({
_id: log._id,
_creationTime: log._creationTime,
userId: log.userId,
userName: logUserNameMap[log.userId as string],
action: log.action,
entityType: log.entityType,
entityId: log.entityId,
details: log.details,
timestamp: log.timestamp,
});
}

return result;
},
});