import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { auth, isPhone } from "./auth";

const ROLE_LEVEL: Record<string, number> = {
super_admin: 4,
admin: 3,
teacher: 2,
student_parent: 1,
};

// Public action: user changes their own password (synchronous, waits for hash)
export const selfResetPassword = action({
  args: {
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // This runs synchronously - waits for hash + DB update to complete
    await ctx.runAction(internal.adminAuth.hashAndResetPassword, {
      targetUserId: userId,
      newPassword: args.newPassword,
    });

    await ctx.runMutation(internal.adminAuthHelpers.insertAuditLog, {
      userId,
      action: "self_reset_password",
      entityType: "user",
      entityId: userId,
    });

    return null;
  },
});

// Public action: admin triggers password reset (synchronous)
export const adminResetPassword = action({
  args: {
    targetUserId: v.id("users"),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.adminAuthHelpers.getUserForAuth, { userId });
    if (!user) throw new Error("User not found");

    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new Error("Only admin can reset passwords");
    }

    const target = await ctx.runQuery(internal.adminAuthHelpers.getUserForAuth, { userId: args.targetUserId });
    if (!target) throw new Error("Target user not found");

    if (target.companyId !== user.companyId) {
      throw new Error("Cannot reset password for users in another company");
    }

    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    await ctx.runAction(internal.adminAuth.hashAndResetPassword, {
      targetUserId: args.targetUserId,
      newPassword: args.newPassword,
    });

    await ctx.runMutation(internal.adminAuthHelpers.insertAuditLog, {
      userId,
      action: "admin_reset_password",
      entityType: "user",
      entityId: args.targetUserId,
    });

    return null;
  },
});

// Internal helper: get user data for auth checks (used by actions)
export const getUserForAuth = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      role: v.optional(v.string()),
      companyId: v.optional(v.id("companies")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return { role: user.role, companyId: user.companyId };
  },
});

// Internal mutation: insert audit log entry
export const insertAuditLog = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.companyId) throw new ConvexError("No company");
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: JSON.stringify({ email: user?.email, phone: user?.phone }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });
    return null;
  },
});

// Internal mutation: update the auth account secret
export const updateAccountSecret = internalMutation({
  args: {
    targetUserId: v.id("users"),
    hashedSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // authAccounts is managed by Convex Auth - custom indexes not available, filter is required
    const account = await ctx.db
      .query("authAccounts")
      .filter((q: any) => q.eq(q.field("userId"), args.targetUserId))
      .first();

    if (!account || (account as any).provider !== "password") {
      throw new Error("No password account found for this user");
    }

    await ctx.db.patch(account._id, { secret: args.hashedSecret });
    return null;
  },
});

// Internal mutation: create a user + auth account (called from adminAuth action after password hashing)
export const createUserWithAccount = internalMutation({
  args: {
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    hashedPassword: v.string(),
    role: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check if identifier already exists (email index stores both email and phone identifiers)
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();
    if (existing) {
      throw new Error("A user with this identifier already exists");
    }

    // If phone provided, also check phone uniqueness
    if (args.phone) {
      const existingPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q: any) => q.eq("phone", args.phone))
        .first();
      if (existingPhone) {
        throw new Error("A user with this phone number already exists");
      }
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone || undefined,
      role: args.role as any,
      isActive: true,
      isArchived: false,
      companyId: args.companyId,
    });

    // Create the auth account (providerAccountId is the login identifier)
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email.toLowerCase(),
      secret: args.hashedPassword,
    } as any);

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId: args.createdBy,
      action: "admin_create_user",
      entityType: "user",
      entityId: userId,
      details: JSON.stringify({ email: args.email, phone: args.phone, role: args.role, name: args.name }),
      timestamp: Date.now(),
      companyId: args.companyId,
    });

    return userId;
  },
});

// Public action: admin creates a new user with email or phone + password
export const adminCreateUser = action({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.string(),
    password: v.string(),
    role: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user: any = await ctx.runQuery(internal.adminAuthHelpers.getUserForAuth, { userId });
    if (!user) throw new Error("User not found");

    const myLevel = ROLE_LEVEL[user.role || ""] || 0;
    if (myLevel < 2) throw new Error("Insufficient permissions"); // teacher+ can create

    const targetRole = args.role || "student_parent";
    const targetLevel = ROLE_LEVEL[targetRole] || 0;
    if (targetLevel >= myLevel && user.role !== "super_admin") {
      throw new Error("Cannot create user at or above your level");
    }

    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Require at least one identifier
    const email = args.email?.trim().toLowerCase();
    const phone = args.phone?.trim();

    if (!email && !phone) {
      throw new Error("Either email or phone is required");
    }

    if (email && !email.includes("@")) {
      throw new Error("Invalid email");
    }

    if (phone && !isPhone(phone)) {
      throw new Error("Invalid phone number");
    }

    // The auth identifier: email takes priority, fallback to phone
    const identifier = email || phone!;

    const newUserId: Id<"users"> = await ctx.runAction(internal.adminAuth.hashAndCreateUser, {
      email: identifier,
      phone: phone || undefined,
      name: args.name.trim(),
      password: args.password,
      role: targetRole,
      companyId: user.companyId!,
      createdBy: userId,
    });

    return newUserId;
  },
});