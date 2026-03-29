import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

function generateCode(length: number): string {
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let code = "";
for (let i = 0; i < length; i++) {
code += chars[Math.floor(Math.random() * chars.length)];
}
return code;
}

// Create a new company
export const create = mutation({
args: { name: v.string() },
returns: v.id("companies"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new Error("User not found");
if (user.companyId) throw new Error("Already part of a company");
if (!args.name.trim()) throw new Error("Company name is required");

let orgCode = generateCode(6);
let existing = await ctx.db.query("companies")
.withIndex("by_inviteCode", (q) => q.eq("inviteCode", orgCode))
.first();
while (existing) {
orgCode = generateCode(6);
existing = await ctx.db.query("companies")
.withIndex("by_inviteCode", (q) => q.eq("inviteCode", orgCode))
.first();
}

const companyId = await ctx.db.insert("companies", {
name: args.name.trim(),
inviteCode: orgCode,
ownerId: userId,
isActive: true,
});

await ctx.db.patch(userId, {
companyId,
role: "super_admin",
isActive: true,
});

await ctx.db.insert("auditLogs", {
userId, action: "create_company", entityType: "company",
entityId: companyId, details: JSON.stringify({ name: args.name.trim() }),
timestamp: Date.now(), companyId,
});

return companyId;
},
});

// Look up a company by org code (public, no auth needed for display)
export const findByOrgCode = query({
args: { orgCode: v.string() },
returns: v.union(
v.object({ _id: v.id("companies"), name: v.string() }),
v.null()
),
handler: async (ctx, args) => {
const code = args.orgCode.trim().toUpperCase();
const company = await ctx.db.query("companies")
.withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
.first();
if (!company || !company.isActive) return null;
return { _id: company._id, name: company.name };
},
});

// Join using a personal invite code (two-step: org code finds the company, invite code authorizes)
export const joinWithInviteCode = mutation({
args: { inviteCode: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new Error("User not found");
if (user.companyId) throw new Error("Already part of a company");

const code = args.inviteCode.trim().toUpperCase();
const invite = await ctx.db.query("inviteCodes")
.withIndex("by_code", (q) => q.eq("code", code))
.first();

if (!invite) throw new Error("Invalid invite code");
if (invite.usedBy) throw new Error("This invite code has already been used");

const company = await ctx.db.get(invite.companyId);
if (!company || !company.isActive) throw new Error("Organization is no longer active");

// Mark invite as used
await ctx.db.patch(invite._id, {
usedBy: userId,
usedAt: Date.now(),
});

// Join the company with optional pre-assigned role
await ctx.db.patch(userId, {
companyId: company._id,
isActive: true,
...(invite.role ? { role: invite.role } : {}),
});

await ctx.db.insert("auditLogs", {
userId, action: "join_company", entityType: "company",
entityId: company._id,
details: JSON.stringify({ inviteCode: code, role: invite.role || "none" }),
timestamp: Date.now(), companyId: company._id,
});

return null;
},
});

// Join using the organization code (company's inviteCode field)
export const joinByOrgCode = mutation({
  args: { orgCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.companyId) throw new Error("Already part of a company");

    const code = args.orgCode.trim().toUpperCase();
    const company = await ctx.db.query("companies")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();

    if (!company) throw new Error("Invalid organization code");
    if (!company.isActive) throw new Error("Organization is no longer active");

    await ctx.db.patch(userId, {
      companyId: company._id,
      isActive: true,
    });

    await ctx.db.insert("auditLogs", {
      userId, action: "join_company", entityType: "company",
      entityId: company._id,
      details: JSON.stringify({ orgCode: code }),
      timestamp: Date.now(), companyId: company._id,
    });

    return null;
  },
});

// Get current user's company info
export const myCompany = query({
args: {},
returns: v.union(
v.object({
_id: v.id("companies"),
name: v.string(),
inviteCode: v.string(),
isActive: v.boolean(),
memberCount: v.number(),
}),
v.null()
),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return null;
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return null;
const company = await ctx.db.get(user.companyId);
if (!company) return null;

const members = await ctx.db.query("users")
.withIndex("by_company", (q) => q.eq("companyId", company._id))
.take(500);

return {
_id: company._id,
name: company.name,
inviteCode: company.inviteCode,
isActive: company.isActive,
memberCount: members.length,
};
},
});

// Regenerate org code (admin only)
export const regenerateOrgCode = mutation({
args: {},
returns: v.string(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) throw new Error("No company");
if (user.role !== "admin" && user.role !== "super_admin") {
throw new Error("Only admin can regenerate org code");
}

let orgCode = generateCode(6);
let existing = await ctx.db.query("companies")
.withIndex("by_inviteCode", (q) => q.eq("inviteCode", orgCode))
.first();
while (existing) {
orgCode = generateCode(6);
existing = await ctx.db.query("companies")
.withIndex("by_inviteCode", (q) => q.eq("inviteCode", orgCode))
.first();
}

await ctx.db.patch(user.companyId, { inviteCode: orgCode });
return orgCode;
},
});