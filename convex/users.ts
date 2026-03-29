import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { notify, getAdminIds } from "./notifications";

const roleValidator = v.union(
v.literal("super_admin"),
v.literal("admin"),
v.literal("teacher"),
v.literal("student_parent")
);

const languageValidator = v.union(
v.literal("ru"),
v.literal("uz_latin"),
v.literal("uz_cyrillic"),
v.literal("en")
);

const ROLE_LEVEL: Record<string, number> = {
super_admin: 4,
admin: 3,
teacher: 2,
student_parent: 1,
};

function getVisibleRoles(userRole: string | undefined): string[] {
const level = ROLE_LEVEL[userRole || ""] || 0;
return Object.entries(ROLE_LEVEL)
.filter(([_, l]) => l <= level)
.map(([role]) => role);
}

// Get current user with role and companyId
export const me = query({
args: {},
returns: v.union(
v.object({
_id: v.id("users"),
name: v.optional(v.string()),
email: v.optional(v.string()),
phone: v.optional(v.string()),
role: v.optional(roleValidator),
language: v.optional(languageValidator),
isActive: v.optional(v.boolean()),
companyId: v.optional(v.id("companies")),
}),
v.null()
),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return null;
const user = await ctx.db.get(userId);
if (!user) return null;

return {
_id: user._id,
name: user.name,
email: user.email,
phone: user.phone,
role: user.role,
language: user.language,
isActive: user.isActive,
companyId: user.companyId,
};
},
});

// Update user language preference
export const updateLanguage = mutation({
args: { language: languageValidator },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
await ctx.db.patch(userId, { language: args.language });
return null;
},
});

// Update user profile
export const updateProfile = mutation({
args: {
name: v.optional(v.string()),
language: v.optional(languageValidator),
},
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const updates: Record<string, string> = {};
if (args.name !== undefined) updates.name = args.name;
if (args.language !== undefined) updates.language = args.language;
await ctx.db.patch(userId, updates);
return null;
},
});

// Admin: list all users in same company (filtered by role hierarchy)
export const listUsers = query({
args: {
role: v.optional(roleValidator),
search: v.optional(v.string()),
status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
sortBy: v.optional(v.union(v.literal("name"), v.literal("date"), v.literal("role"))),
showArchived: v.optional(v.boolean()),
},
returns: v.array(v.object({
_id: v.id("users"),
_creationTime: v.number(),
name: v.optional(v.string()),
email: v.optional(v.string()),
phone: v.optional(v.string()),
role: v.optional(roleValidator),
isActive: v.optional(v.boolean()),
isArchived: v.optional(v.boolean()),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new Error("User not found");
if (!user.role || ROLE_LEVEL[user.role] === undefined) {
throw new Error("Insufficient permissions");
}
if (!user.companyId) return [];

const visibleRoles = getVisibleRoles(user.role);

// Query by company
let users;
if (args.role) {
if (!visibleRoles.includes(args.role)) return [];
users = await ctx.db.query("users")
.withIndex("by_company_and_role", (q: any) =>
q.eq("companyId", user.companyId).eq("role", args.role!)
)
.take(500);
} else {
users = await ctx.db.query("users")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(500);
}

let filtered = users.filter((u) => {
const uRole = u.role || "student_parent";
return visibleRoles.includes(uRole);
});

// Filter archived: hide by default unless showArchived is true
if (!args.showArchived) {
filtered = filtered.filter((u) => !u.isArchived);
} else {
// When showArchived is true, only show archived users
filtered = filtered.filter((u) => u.isArchived === true);
}

if (args.status) {
const isActive = args.status === "active";
filtered = filtered.filter((u) => u.isActive === isActive);
}

if (args.search) {
const searchLower = args.search.toLowerCase();
filtered = filtered.filter((u) => {
const name = (u.name || "").toLowerCase();
const email = (u.email || "").toLowerCase();
const phone = (u.phone || "").toLowerCase();
return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
});
}

if (args.sortBy === "name") {
filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
} else if (args.sortBy === "date") {
filtered.sort((a, b) => b._creationTime - a._creationTime);
} else if (args.sortBy === "role") {
filtered.sort((a, b) => {
return (ROLE_LEVEL[b.role || "student_parent"] || 0) - (ROLE_LEVEL[a.role || "student_parent"] || 0);
});
}

return filtered.map((u) => ({
_id: u._id,
_creationTime: u._creationTime,
name: u.name,
email: u.email,
phone: u.phone,
role: u.role,
isActive: u.isActive,
isArchived: u.isArchived,
}));
},
});

// Admin: set user role (same company only)
export const setUserRole = mutation({
args: {
targetUserId: v.id("users"),
role: roleValidator,
},
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new Error("User not found");
if (!user.companyId) throw new Error("No company");

const myLevel = ROLE_LEVEL[user.role || ""] || 0;
const targetRoleLevel = ROLE_LEVEL[args.role] || 0;

const target = await ctx.db.get(args.targetUserId);
if (!target) throw new Error("Target user not found");

// Must be same company
if (target.companyId !== user.companyId) {
throw new Error("Cannot modify users from another company");
}

if (user.role === "super_admin" || user.role === "admin") {
if (user.role !== "super_admin" && targetRoleLevel >= myLevel) {
throw new Error("Cannot assign a role at or above your level");
}
} else {
throw new Error("Insufficient permissions");
}

if (target.role) {
const targetCurrentLevel = ROLE_LEVEL[target.role] || 0;
if (user.role !== "super_admin" && targetCurrentLevel >= myLevel) {
throw new Error("Cannot modify a user at or above your level");
}
}

await ctx.db.patch(args.targetUserId, { role: args.role, isActive: true });

await ctx.db.insert("auditLogs", {
userId,
action: "set_user_role",
entityType: "user",
entityId: args.targetUserId,
details: JSON.stringify({ newRole: args.role }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify the target user and admins
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: [args.targetUserId, ...adminIds],
    type: "role_changed",
    data: { targetName: target.name, newRole: args.role },
    actorId: userId,
  });
}

return null;
},
});

// Admin: toggle user active status
export const toggleUserActive = mutation({
args: { targetUserId: v.id("users") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.role) throw new Error("Insufficient permissions");
if (!user.companyId) throw new Error("No company");

const target = await ctx.db.get(args.targetUserId);
if (!target) throw new Error("Target user not found");
if (target.companyId !== user.companyId) {
throw new Error("Cannot modify users from another company");
}

const myLevel = ROLE_LEVEL[user.role] || 0;
const targetLevel = ROLE_LEVEL[target.role || ""] || 0;
if (targetLevel >= myLevel && user.role !== "super_admin") {
throw new Error("Cannot modify a user at or above your level");
}

await ctx.db.patch(args.targetUserId, { isActive: !target.isActive });

await ctx.db.insert("auditLogs", {
userId,
action: "toggle_user_active",
entityType: "user",
entityId: args.targetUserId,
details: JSON.stringify({ isActive: !target.isActive }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify the target user and admins
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: [args.targetUserId, ...adminIds],
    type: "user_status_changed",
    data: { targetName: target.name, isActive: !target.isActive },
    actorId: userId,
  });
}

return null;
},
});

// Admin: archive/unarchive user
export const archiveUser = mutation({
  args: {
    targetUserId: v.id("users"),
    isArchived: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.role) throw new Error("Insufficient permissions");
    if (!user.companyId) throw new Error("No company");

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Target user not found");
    if (target.companyId !== user.companyId) {
      throw new Error("Cannot modify users from another company");
    }

    const myLevel = ROLE_LEVEL[user.role] || 0;
    const targetLevel = ROLE_LEVEL[target.role || ""] || 0;
    if (targetLevel >= myLevel && user.role !== "super_admin") {
      throw new Error("Cannot modify a user at or above your level");
    }

    const newArchived = args.isArchived !== undefined ? args.isArchived : !target.isArchived;
    await ctx.db.patch(args.targetUserId, { isArchived: newArchived });

    await ctx.db.insert("auditLogs", {
      userId,
      action: "archive_user",
      entityType: "user",
      entityId: args.targetUserId,
      details: JSON.stringify({ isArchived: newArchived }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    return null;
  },
});

// Admin: update user name
export const adminUpdateUserName = mutation({
  args: {
    targetUserId: v.id("users"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.role) throw new Error("Insufficient permissions");
    if (!user.companyId) throw new Error("No company");

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Target user not found");
    if (target.companyId !== user.companyId) {
      throw new Error("Cannot modify users from another company");
    }

    const myLevel = ROLE_LEVEL[user.role] || 0;
    const targetLevel = ROLE_LEVEL[target.role || ""] || 0;
    if (targetLevel >= myLevel && user.role !== "super_admin") {
      throw new Error("Cannot modify a user at or above your level");
    }

    await ctx.db.patch(args.targetUserId, { name: args.name });

    await ctx.db.insert("auditLogs", {
      userId,
      action: "admin_update_user_name",
      entityType: "user",
      entityId: args.targetUserId,
      details: JSON.stringify({ oldName: target.name, newName: args.name }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    return null;
  },
});

// List teachers in same company
export const listTeachers = query({
args: {},
returns: v.array(v.object({
_id: v.id("users"),
name: v.optional(v.string()),
email: v.optional(v.string()),
phone: v.optional(v.string()),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return [];

const teachers = await ctx.db.query("users")
.withIndex("by_company_and_role", (q: any) =>
q.eq("companyId", user.companyId).eq("role", "teacher")
)
.take(100);

return teachers.map((t) => ({ _id: t._id, name: t.name, email: t.email, phone: t.phone }));
},
});

// List students in same company
export const listStudents = query({
args: {},
returns: v.array(v.object({
_id: v.id("users"),
name: v.optional(v.string()),
email: v.optional(v.string()),
phone: v.optional(v.string()),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return [];

const students = await ctx.db.query("users")
.withIndex("by_company_and_role", (q: any) =>
q.eq("companyId", user.companyId).eq("role", "student_parent")
)
.take(500);

return students.map((s) => ({ _id: s._id, name: s.name, email: s.email, phone: s.phone }));
},
});
