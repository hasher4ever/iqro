import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { notify, getAdminIds, getEnrolledStudentIds } from "./notifications";

const gradingSystemValidator = v.union(
v.literal("a_f"),
v.literal("0_100"),
v.literal("1_5")
);

const scheduleDayEntry = v.object({
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
});

// Helper to get current user's companyId
async function getCompanyId(ctx: any): Promise<Id<"companies">> {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");
  if (!user.companyId) throw new ConvexError("No company");
  return user.companyId;
}

export const list = query({
args: {},
returns: v.array(v.object({
_id: v.id("classes"),
_creationTime: v.number(),
name: v.string(),
subjectName: v.string(),
teacherId: v.id("users"),
teacherName: v.optional(v.string()),
roomId: v.id("rooms"),
roomName: v.optional(v.string()),
gradingSystem: gradingSystemValidator,
pricePerClass: v.number(),
teacherSharePercent: v.optional(v.number()),
scheduleDays: v.array(scheduleDayEntry),
isActive: v.boolean(),
enrolledCount: v.number(),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");
if (!user.companyId) return [];

const classes = await ctx.db.query("classes")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .take(200);

const result: Array<{
_id: Id<"classes">;
_creationTime: number;
name: string;
subjectName: string;
teacherId: Id<"users">;
teacherName: string | undefined;
roomId: Id<"rooms">;
roomName: string | undefined;
gradingSystem: "a_f" | "0_100" | "1_5";
pricePerClass: number;
teacherSharePercent: number | undefined;
scheduleDays: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
isActive: boolean;
enrolledCount: number;
}> = [];

// Batch-fetch all teachers, rooms, and enrollment counts upfront
const teacherIds = [...new Set(classes.map((c: any) => c.teacherId))] as Id<"users">[];
const roomIds = [...new Set(classes.map((c: any) => c.roomId))] as Id<"rooms">[];
const teacherNameMap: Record<string, string | undefined> = {};
const roomNameMap: Record<string, string | undefined> = {};

for (const tid of teacherIds) {
const t = await ctx.db.get(tid);
teacherNameMap[tid as string] = t?.name;
}
for (const rid of roomIds) {
const r = await ctx.db.get(rid);
roomNameMap[rid as string] = r?.name;
}

const enrolledCountMap: Record<string, number> = {};
for (const cls of classes) {
const enrollments = await ctx.db
.query("enrollments")
.withIndex("by_class", (q: any) => q.eq("classId", cls._id))
.take(500);
enrolledCountMap[cls._id as string] = enrollments.filter((e: any) => e.status === "approved").length;
}

for (const cls of classes) {
result.push({
_id: cls._id,
_creationTime: cls._creationTime,
name: cls.name,
subjectName: cls.subjectName,
teacherId: cls.teacherId,
teacherName: teacherNameMap[cls.teacherId as string],
roomId: cls.roomId,
roomName: roomNameMap[cls.roomId as string],
gradingSystem: cls.gradingSystem,
pricePerClass: cls.pricePerClass,
teacherSharePercent: cls.teacherSharePercent,
scheduleDays: cls.scheduleDays,
isActive: cls.isActive,
enrolledCount: enrolledCountMap[cls._id as string] ?? 0,
});
}
return result;
},
});

export const getById = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      name: v.string(),
      subjectName: v.string(),
      teacherId: v.id("users"),
      roomId: v.id("rooms"),
      gradingSystem: gradingSystemValidator,
      billingType: v.optional(v.union(v.literal("per_lesson"), v.literal("per_month"))),
      pricePerClass: v.number(),
      monthlyPrice: v.optional(v.number()),
      chargeAbsent: v.optional(v.boolean()),
      teacherSharePercent: v.optional(v.number()),
      scheduleDays: v.array(scheduleDayEntry),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");
    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.companyId !== user.companyId) return null;
    return {
      _id: cls._id,
      _creationTime: cls._creationTime,
      name: cls.name,
      subjectName: cls.subjectName,
      teacherId: cls.teacherId,
      roomId: cls.roomId,
      gradingSystem: cls.gradingSystem,
      billingType: cls.billingType,
      pricePerClass: cls.pricePerClass,
      monthlyPrice: cls.monthlyPrice,
      chargeAbsent: cls.chargeAbsent,
      teacherSharePercent: cls.teacherSharePercent,
      scheduleDays: cls.scheduleDays,
      isActive: cls.isActive,
    };
  },
});

export const getByTeacher = query({
args: { teacherId: v.optional(v.id("users")) },
returns: v.array(v.object({
_id: v.id("classes"),
name: v.string(),
subjectName: v.string(),
scheduleDays: v.array(scheduleDayEntry),
roomId: v.id("rooms"),
roomName: v.optional(v.string()),
pricePerClass: v.number(),
gradingSystem: gradingSystemValidator,
isActive: v.boolean(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

const tId = args.teacherId ?? userId;

// If querying another teacher, verify they belong to the same company
if (args.teacherId && args.teacherId !== userId) {
const teacher = await ctx.db.get(args.teacherId);
if (!teacher || teacher.companyId !== user.companyId) return [];
}

const classes = await ctx.db
.query("classes")
.withIndex("by_teacher", (q: any) => q.eq("teacherId", tId))
.take(100);

const result: Array<{
_id: Id<"classes">;
name: string;
subjectName: string;
scheduleDays: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
roomId: Id<"rooms">;
roomName: string | undefined;
pricePerClass: number;
gradingSystem: "a_f" | "0_100" | "1_5";
isActive: boolean;
}> = [];

// Filter first, then batch-fetch rooms
const activeClasses = classes.filter((cls: any) => cls.isActive && cls.companyId === user.companyId);
const roomIdsForTeacher = [...new Set(activeClasses.map((c: any) => c.roomId))] as Id<"rooms">[];
const roomNameMapForTeacher: Record<string, string | undefined> = {};
for (const rid of roomIdsForTeacher) {
const r = await ctx.db.get(rid);
roomNameMapForTeacher[rid as string] = r?.name;
}

for (const cls of activeClasses) {
result.push({
_id: cls._id,
name: cls.name,
subjectName: cls.subjectName,
scheduleDays: cls.scheduleDays,
roomId: cls.roomId,
roomName: roomNameMapForTeacher[cls.roomId as string],
pricePerClass: cls.pricePerClass,
gradingSystem: cls.gradingSystem,
isActive: cls.isActive,
});
}
return result;
},
});

export const create = mutation({
args: {
name: v.string(),
subjectName: v.string(),
teacherId: v.id("users"),
roomId: v.id("rooms"),
gradingSystem: gradingSystemValidator,
billingType: v.optional(v.union(v.literal("per_lesson"), v.literal("per_month"))),
pricePerClass: v.number(),
monthlyPrice: v.optional(v.number()),
chargeAbsent: v.optional(v.boolean()),
teacherSharePercent: v.optional(v.number()),
scheduleDays: v.array(scheduleDayEntry),
},
returns: v.id("classes"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (!user.companyId) throw new ConvexError("No company");

if (args.scheduleDays.length === 0) {
throw new ConvexError("At least one schedule day is required");
}

// Check for schedule conflicts in the target room
for (const day of args.scheduleDays) {
const existingSlots = await ctx.db
.query("scheduleSlots")
.withIndex("by_room_and_day", (q: any) =>
q.eq("roomId", args.roomId).eq("dayOfWeek", day.dayOfWeek)
)
.collect();
for (const slot of existingSlots) {
if (slot.startTime < day.endTime && slot.endTime > day.startTime) {
const conflictClass = await ctx.db.get(slot.classId);
throw new ConvexError(
`Schedule conflict in this room on ${day.dayOfWeek}: overlaps with "${conflictClass?.name || "another class"}" (${slot.startTime}-${slot.endTime})`
);
}
}
}

const classId = await ctx.db.insert("classes", {
name: args.name,
subjectName: args.subjectName,
teacherId: args.teacherId,
roomId: args.roomId,
gradingSystem: args.gradingSystem,
billingType: args.billingType ?? "per_lesson",
pricePerClass: args.pricePerClass,
monthlyPrice: args.monthlyPrice,
chargeAbsent: args.chargeAbsent ?? false,
teacherSharePercent: args.teacherSharePercent ?? 50,
scheduleDays: args.scheduleDays,
isActive: true,
companyId: user.companyId,
});

for (const day of args.scheduleDays) {
await ctx.db.insert("scheduleSlots", {
roomId: args.roomId,
classId,
dayOfWeek: day.dayOfWeek,
startTime: day.startTime,
endTime: day.endTime,
companyId: user.companyId,
});
}

await ctx.db.insert("auditLogs", {
userId,
action: "create_class",
entityType: "class",
entityId: classId,
details: JSON.stringify({ name: args.name }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify teacher and admins about new class
const adminIds = await getAdminIds(ctx.db, user.companyId);
await notify(ctx, {
  companyId: user.companyId,
  recipientIds: [args.teacherId, ...adminIds],
  type: "class_created",
  data: { className: args.name, classId },
  actorId: userId,
});

return classId;
},
});

export const update = mutation({
args: {
classId: v.id("classes"),
name: v.optional(v.string()),
subjectName: v.optional(v.string()),
teacherId: v.optional(v.id("users")),
roomId: v.optional(v.id("rooms")),
pricePerClass: v.optional(v.number()),
scheduleDays: v.optional(v.array(scheduleDayEntry)),
isActive: v.optional(v.boolean()),
},
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}

const existingClass = await ctx.db.get(args.classId);
if (!existingClass || existingClass.companyId !== user.companyId) throw new ConvexError("Not found");

const { classId, ...updates } = args;
const filtered: Record<string, unknown> = {};
for (const [key, val] of Object.entries(updates)) {
if (val !== undefined) filtered[key] = val;
}
await ctx.db.patch(classId, filtered);

if (args.scheduleDays) {
const cls = await ctx.db.get(classId);
if (cls) {
const oldSlots = await ctx.db
.query("scheduleSlots")
.withIndex("by_class", (q: any) => q.eq("classId", classId))
.take(50);
for (const slot of oldSlots) {
await ctx.db.delete(slot._id);
}
for (const day of args.scheduleDays) {
await ctx.db.insert("scheduleSlots", {
roomId: cls.roomId,
classId,
dayOfWeek: day.dayOfWeek,
startTime: day.startTime,
endTime: day.endTime,
companyId: user.companyId,
});
}
}
}

await ctx.db.insert("auditLogs", {
userId,
action: "update_class",
entityType: "class",
entityId: classId,
details: JSON.stringify(filtered),
timestamp: Date.now(),
companyId: user.companyId,
});

return null;
},
});

export const requestEnrollment = mutation({
args: { classId: v.id("classes") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");
if (!user.role) throw new ConvexError("No role assigned");
if (!user.companyId) throw new ConvexError("No company");

const cls = await ctx.db.get(args.classId);
if (!cls || cls.companyId !== user.companyId) throw new ConvexError("Not found");

const existing = await ctx.db
.query("enrollments")
.withIndex("by_class_and_student", (q: any) =>
q.eq("classId", args.classId).eq("studentId", userId)
)
.take(1);

if (existing.length > 0 && (existing[0].status === "approved" || existing[0].status === "pending")) {
throw new ConvexError("Already enrolled or pending");
}

await ctx.db.insert("enrollments", {
studentId: userId,
classId: args.classId,
status: "pending",
companyId: user.companyId,
});

return null;
},
});

export const approveEnrollment = mutation({
args: { enrollmentId: v.id("enrollments") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
throw new ConvexError("Insufficient permissions");
}

const enrollment = await ctx.db.get(args.enrollmentId);
if (!enrollment || enrollment.companyId !== user.companyId) throw new ConvexError("Not found");

await ctx.db.patch(args.enrollmentId, {
status: "approved",
approvedBy: userId,
approvedAt: Date.now(),
});

await ctx.db.insert("auditLogs", {
userId,
action: "approve_enrollment",
entityType: "enrollment",
entityId: args.enrollmentId,
details: JSON.stringify({ studentId: enrollment.studentId, classId: enrollment.classId }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify student, class teacher, and all admins
if (user.companyId) {
  const cls = await ctx.db.get(enrollment.classId);
  const student = await ctx.db.get(enrollment.studentId);
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [enrollment.studentId, ...adminIds];
  if (cls?.teacherId) recipients.push(cls.teacherId);
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "enrollment_approved",
    data: { className: cls?.name, studentName: student?.name, classId: enrollment.classId },
    actorId: userId,
  });
}

return null;
},
});

export const rejectEnrollment = mutation({
args: { enrollmentId: v.id("enrollments") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
throw new ConvexError("Insufficient permissions");
}

const enrollment = await ctx.db.get(args.enrollmentId);
if (!enrollment || enrollment.companyId !== user.companyId) throw new ConvexError("Not found");
await ctx.db.patch(args.enrollmentId, { status: "rejected" });

await ctx.db.insert("auditLogs", {
userId,
action: "reject_enrollment",
entityType: "enrollment",
entityId: args.enrollmentId,
details: JSON.stringify({ studentId: enrollment.studentId, classId: enrollment.classId }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify student, class teacher, and all admins
if (user.companyId) {
  const cls = await ctx.db.get(enrollment.classId);
  const student = await ctx.db.get(enrollment.studentId);
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [enrollment.studentId, ...adminIds];
  if (cls?.teacherId) recipients.push(cls.teacherId);
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "enrollment_rejected",
    data: { className: cls?.name, studentName: student?.name, classId: enrollment.classId },
    actorId: userId,
  });
}

return null;
},
});

export const listEnrollments = query({
args: { classId: v.optional(v.id("classes")), status: v.optional(v.string()) },
returns: v.array(v.object({
_id: v.id("enrollments"),
_creationTime: v.number(),
studentId: v.id("users"),
studentName: v.optional(v.string()),
classId: v.id("classes"),
className: v.optional(v.string()),
status: v.string(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

let enrollments;
if (args.classId) {
const cls = await ctx.db.get(args.classId);
if (!cls || cls.companyId !== user.companyId) return [];
enrollments = await ctx.db
.query("enrollments")
.withIndex("by_class", (q: any) => q.eq("classId", args.classId!))
.take(500);
} else if (user.companyId) {
enrollments = await ctx.db.query("enrollments")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .take(500);
} else {
return [];
}

if (args.status) {
enrollments = enrollments.filter((e: any) => e.status === args.status);
}

const result: Array<{
_id: Id<"enrollments">;
_creationTime: number;
studentId: Id<"users">;
studentName: string | undefined;
classId: Id<"classes">;
className: string | undefined;
status: string;
}> = [];

// Batch-fetch all students and classes upfront
const enrollStudentIds = [...new Set(enrollments.map((e: any) => e.studentId))] as Id<"users">[];
const enrollClassIds = [...new Set(enrollments.map((e: any) => e.classId))] as Id<"classes">[];
const enrollNameMap: Record<string, string | undefined> = {};
for (const sid of enrollStudentIds) {
const s = await ctx.db.get(sid);
enrollNameMap[sid as string] = s?.name;
}
for (const cid of enrollClassIds) {
const c = await ctx.db.get(cid);
enrollNameMap[cid as string] = c?.name;
}

for (const e of enrollments) {
result.push({
_id: e._id,
_creationTime: e._creationTime,
studentId: e.studentId,
studentName: enrollNameMap[e.studentId as string],
classId: e.classId,
className: enrollNameMap[e.classId as string],
status: e.status,
});
}

return result;
},
});

export const getClassStudents = query({
args: { classId: v.id("classes") },
returns: v.array(v.object({
_id: v.id("users"),
name: v.optional(v.string()),
email: v.optional(v.string()),
phone: v.optional(v.string()),
enrollmentId: v.id("enrollments"),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

const cls = await ctx.db.get(args.classId);
if (!cls || cls.companyId !== user.companyId) return [];

const enrollments = await ctx.db
.query("enrollments")
.withIndex("by_class", (q: any) => q.eq("classId", args.classId))
.take(500);

const result: Array<{
_id: Id<"users">;
name: string | undefined;
email: string | undefined;
phone: string | undefined;
enrollmentId: Id<"enrollments">;
}> = [];

for (const e of enrollments) {
if (e.status !== "approved") continue;
const student = await ctx.db.get(e.studentId);
if (student) {
result.push({
_id: student._id,
name: student.name,
email: student.email,
phone: student.phone,
enrollmentId: e._id,
});
}
}

return result;
},
});

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
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return [];

const teachers = await ctx.db.query("users")
  .withIndex("by_company_and_role", (q: any) =>
    q.eq("companyId", user.companyId).eq("role", "teacher")
  )
  .take(100);

return teachers.map((t: any) => ({ _id: t._id, name: t.name, email: t.email, phone: t.phone }));
},
});

export const listStudentUsers = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.companyId) return [];

    const students = await ctx.db.query("users")
      .withIndex("by_company_and_role", (q: any) =>
        q.eq("companyId", user.companyId).eq("role", "student_parent")
      )
      .take(200);

    return students.map((s: any) => ({ _id: s._id, name: s.name, email: s.email, phone: s.phone }));
  },
});

export const adminEnrollStudent = mutation({
  args: {
    classId: v.id("classes"),
    studentId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
      throw new ConvexError("Insufficient permissions");
    }

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q: any) =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .take(1);

    if (existing.length > 0 && existing[0].status === "approved") {
      throw new ConvexError("Already enrolled");
    }

    if (existing.length > 0) {
      await ctx.db.patch(existing[0]._id, {
        status: "approved",
        approvedBy: userId,
        approvedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("enrollments", {
        studentId: args.studentId,
        classId: args.classId,
        status: "approved",
        approvedBy: userId,
        approvedAt: Date.now(),
        companyId: user.companyId!,
      });
    }

    await ctx.db.insert("auditLogs", {
      userId,
      action: "enroll_student",
      entityType: "enrollment",
      entityId: args.classId,
      details: JSON.stringify({ studentId: args.studentId }),
      timestamp: Date.now(),
      companyId: user.companyId!,
    });

    return null;
  },
});

export const setClassActive = mutation({
  args: {
    classId: v.id("classes"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
      throw new ConvexError("Insufficient permissions");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.companyId !== user.companyId) throw new ConvexError("Not found");

    await ctx.db.patch(args.classId, { isActive: args.isActive });

    await ctx.db.insert("auditLogs", {
      userId,
      action: args.isActive ? "reactivate_class" : "terminate_class",
      entityType: "class",
      entityId: args.classId,
      details: JSON.stringify({ isActive: args.isActive }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    return null;
  },
});

export const removeEnrollment = mutation({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
      throw new ConvexError("Insufficient permissions");
    }

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.companyId !== user.companyId) throw new ConvexError("Not found");

    await ctx.db.patch(args.enrollmentId, { status: "withdrawn" });

    await ctx.db.insert("auditLogs", {
      userId,
      action: "remove_enrollment",
      entityType: "enrollment",
      entityId: args.enrollmentId,
      details: JSON.stringify({ studentId: enrollment.studentId, classId: enrollment.classId }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    // Notify student, teacher, and admins
    if (user.companyId) {
      const cls = await ctx.db.get(enrollment.classId);
      const student = await ctx.db.get(enrollment.studentId);
      const adminIds = await getAdminIds(ctx.db, user.companyId);
      const teacherId = cls?.teacherId;
      const recipients = [enrollment.studentId, ...adminIds];
      if (teacherId) recipients.push(teacherId);
      await notify(ctx, {
        companyId: user.companyId,
        recipientIds: recipients,
        type: "student_unenrolled",
        data: { className: cls?.name, studentName: student?.name, classId: enrollment.classId },
        actorId: userId,
      });
    }

    return null;
  },
});

// Cancel/postpone a class for a specific date (teacher absence)
export const cancelClassDate = mutation({
  args: {
    classId: v.id("classes"),
    date: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
      throw new ConvexError("Insufficient permissions");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.companyId !== user.companyId) throw new ConvexError("Not found");

    // Check if already cancelled
    const existing = await ctx.db.query("classCancellations")
      .withIndex("by_class_and_date", (q: any) => q.eq("classId", args.classId).eq("date", args.date))
      .take(1);
    if (existing.length > 0) throw new ConvexError("Already cancelled for this date");

    await ctx.db.insert("classCancellations", {
      classId: args.classId,
      date: args.date,
      reason: args.reason,
      cancelledBy: userId,
      companyId: user.companyId,
    });

    await ctx.db.insert("auditLogs", {
      userId,
      action: "cancel_class_date",
      entityType: "class",
      entityId: args.classId,
      details: JSON.stringify({ date: args.date, reason: args.reason }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    // Notify all enrolled students, teacher, and admins
    if (user.companyId) {
      const cls = await ctx.db.get(args.classId);
      const studentIds = await getEnrolledStudentIds(ctx.db, args.classId);
      const adminIds = await getAdminIds(ctx.db, user.companyId);
      const teacherId = cls?.teacherId;
      const recipients = [...studentIds, ...adminIds];
      if (teacherId) recipients.push(teacherId);
      await notify(ctx, {
        companyId: user.companyId,
        recipientIds: recipients,
        type: "class_cancelled",
        data: { className: cls?.name, date: args.date, reason: args.reason, classId: args.classId },
        actorId: userId,
      });
    }

    return null;
  },
});

// Get cancelled dates for a class
export const getClassCancellations = query({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    _id: v.id("classCancellations"),
    _creationTime: v.number(),
    date: v.string(),
    reason: v.optional(v.string()),
    cancelledBy: v.id("users"),
    cancelledByName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.companyId !== user.companyId) return [];

    const cancellations = await ctx.db.query("classCancellations")
      .withIndex("by_class", (q: any) => q.eq("classId", args.classId))
      .take(500);

    const result: Array<{
      _id: Id<"classCancellations">;
      _creationTime: number;
      date: string;
      reason: string | undefined;
      cancelledBy: Id<"users">;
      cancelledByName: string | undefined;
    }> = [];

    // Batch-fetch all cancelledBy users upfront
    const cancellerIds = [...new Set(cancellations.map((c: any) => c.cancelledBy))] as Id<"users">[];
    const cancellerNameMap: Record<string, string | undefined> = {};
    for (const uid of cancellerIds) {
      const u = await ctx.db.get(uid);
      cancellerNameMap[uid as string] = u?.name;
    }

    for (const c of cancellations) {
      result.push({
        _id: c._id,
        _creationTime: c._creationTime,
        date: c.date,
        reason: c.reason,
        cancelledBy: c.cancelledBy,
        cancelledByName: cancellerNameMap[c.cancelledBy as string],
      });
    }

    return result;
  },
});
