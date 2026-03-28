import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ─── Helper: create notifications for multiple recipients ───
// Accepts full mutation ctx to also dispatch Telegram notifications.

export async function notify(
ctx: any,
params: {
companyId: Id<"companies">;
recipientIds: Id<"users">[];
type: string;
data: Record<string, any>;
actorId?: Id<"users">;
skipActorFilter?: boolean; // when true, the actor is NOT filtered out of recipients
}
) {
const db = ctx.db;

// Map in-app notification types to Telegram template types
const telegramTypeMap: Record<string, string> = {
  attendance_marked: "attendance_marked",
  attendance_marked_batch: "attendance_marked_batch",
  grade_added: "grade_received",
  grade_edited: "grade_received",
  payment_recorded: "payment_recorded",
  payment_confirmed: "payment_confirmed",
  payment_reversed: "payment_reversed",
  class_cancelled: "class_cancelled",
  student_enrolled: "student_enrolled",
  student_unenrolled: "student_unenrolled",
  enrollment_approved: "enrollment_approved",
  enrollment_rejected: "enrollment_rejected",
  teacher_payment: "teacher_payment",
};

// Deduplicate recipients; optionally skip the actor to avoid self-notification
const seen = new Set<string>();
for (const uid of params.recipientIds) {
const key = uid as string;
if (seen.has(key)) continue;
// Skip actor self-notification unless skipActorFilter is set
if (params.actorId && key === (params.actorId as string) && !params.skipActorFilter) continue;
seen.add(key);

await db.insert("notifications", {
companyId: params.companyId,
userId: uid,
type: params.type,
isRead: false,
data: params.data,
actorId: params.actorId,
});

// Also dispatch via Telegram if user has a linked account
const telegramType = telegramTypeMap[params.type];
if (telegramType && ctx.scheduler) {
  try {
    await ctx.scheduler.runAfter(0, internal.telegram.dispatchNotification, {
      tenantId: params.companyId,
      userId: uid,
      eventType: telegramType,
      data: params.data,
      attempt: 1,
    });
  } catch (_e) {
    // Telegram dispatch is best-effort; don't fail the mutation
  }
}
}
}

// Helper: get all admin + super_admin user IDs for a company
export async function getAdminIds(db: any, companyId: Id<"companies">): Promise<Id<"users">[]> {
const admins = await db.query("users")
.withIndex("by_company", (q: any) => q.eq("companyId", companyId))
.take(500);
return admins
.filter((u: any) => u.role === "super_admin" || u.role === "admin")
.map((u: any) => u._id);
}

// Helper: get teacher ID for a class
export async function getTeacherIdForClass(db: any, classId: Id<"classes">): Promise<Id<"users"> | null> {
const cls = await db.get(classId);
return cls?.teacherId ?? null;
}

// Helper: get all enrolled student IDs for a class
export async function getEnrolledStudentIds(db: any, classId: Id<"classes">): Promise<Id<"users">[]> {
const enrollments = await db.query("enrollments")
.withIndex("by_class", (q: any) => q.eq("classId", classId))
.take(500);
return enrollments
.filter((e: any) => e.status === "approved")
.map((e: any) => e.studentId);
}

// ─── Queries ───

// List notifications for current user (newest first)
export const list = query({
args: {
limit: v.optional(v.number()),
},
returns: v.array(v.object({
_id: v.id("notifications"),
_creationTime: v.number(),
type: v.string(),
isRead: v.boolean(),
data: v.any(),
actorId: v.optional(v.id("users")),
actorName: v.optional(v.string()),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");

const limit = args.limit ?? 50;
const notifications = await ctx.db.query("notifications")
.withIndex("by_user", (q: any) => q.eq("userId", userId))
.order("desc")
.take(limit);

const result: Array<{
_id: Id<"notifications">;
_creationTime: number;
type: string;
isRead: boolean;
data: any;
actorId: Id<"users"> | undefined;
actorName: string | undefined;
}> = [];

for (const n of notifications) {
let actorName: string | undefined;
if (n.actorId) {
const actor = await ctx.db.get(n.actorId);
actorName = actor?.name;
}
result.push({
_id: n._id,
_creationTime: n._creationTime,
type: n.type,
isRead: n.isRead,
data: n.data,
actorId: n.actorId,
actorName,
});
}

return result;
},
});

// Get unread count
export const getUnreadCount = query({
args: {},
returns: v.number(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return 0;

const unread = await ctx.db.query("notifications")
.withIndex("by_user_and_read", (q: any) => q.eq("userId", userId).eq("isRead", false))
.take(100);
return unread.length;
},
});

// ─── Mutations ───

// Mark single notification as read
export const markAsRead = mutation({
args: { notificationId: v.id("notifications") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");

const notif = await ctx.db.get(args.notificationId);
if (!notif) return null;
if (notif.userId !== userId) throw new Error("Not your notification");

await ctx.db.patch(args.notificationId, { isRead: true });
return null;
},
});

// Mark all as read
export const markAllAsRead = mutation({
args: {},
returns: v.null(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");

const unread = await ctx.db.query("notifications")
.withIndex("by_user_and_read", (q: any) => q.eq("userId", userId).eq("isRead", false))
.take(200);

for (const n of unread) {
await ctx.db.patch(n._id, { isRead: true });
}

return null;
},
});