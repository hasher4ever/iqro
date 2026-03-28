import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { notify, getAdminIds } from "./notifications";

const statusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("late"),
  v.literal("excused")
);

const DAYS_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

// UTC+5 Tashkent offset; see lib/utils.ts for the frontend equivalent
function getTashkentNow(): Date {
  return new Date(Date.now() + 5 * 60 * 60 * 1000);
}

function getTashkentDate(now: Date): string {
  const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return tashkent.toISOString().split("T")[0];
}

function getTashkentDayOfWeek(now: Date): string {
  const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return DAYS_MAP[tashkent.getUTCDay()];
}

// Check if any schedule entry for today has an open attendance window
function findOpenWindow(
  scheduleDays: Array<{ dayOfWeek: string; startTime: string; endTime: string }>,
  now: Date
): { isOpen: boolean; reason: string } {
  const todayDay = getTashkentDayOfWeek(now);
  const todaySlots = scheduleDays.filter((s) => s.dayOfWeek === todayDay);

  if (todaySlots.length === 0) {
    return { isOpen: false, reason: "No class scheduled today" };
  }

  // Tashkent local minutes
  const tashkentOffset = 5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const localMinutes = ((utcMinutes + tashkentOffset) % 1440 + 1440) % 1440;

  for (const slot of todaySlots) {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    const windowStart = startH * 60 + startM - 15;
    const windowEnd = endH * 60 + endM;

    if (localMinutes >= windowStart && localMinutes <= windowEnd) {
      return { isOpen: true, reason: "Within class time" };
    }
  }

  return { isOpen: false, reason: "Outside class hours" };
}

// Mark attendance for a class
export const markAttendance = mutation({
  args: {
    classId: v.id("classes"),
    date: v.optional(v.string()),
    records: v.array(v.object({
      studentId: v.id("users"),
      status: statusValidator,
    })),
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
    if (!cls) throw new ConvexError("Class not found");
    if (cls.companyId !== user.companyId) throw new ConvexError("Class not found");

    const now = new Date();
    const today = args.date || getTashkentDate(now);

    // Check time window (skip for admin/super_admin)
    if (user.role === "teacher") {
      const unlocks = await ctx.db
        .query("attendanceUnlocks")
        .withIndex("by_class_and_date", (q: any) =>
          q.eq("classId", args.classId).eq("date", today)
        )
        .take(1);

      const isUnlocked = unlocks.length > 0 && unlocks[0].expiresAt > Date.now();

      if (!isUnlocked) {
        const window = findOpenWindow(cls.scheduleDays, now);
        if (!window.isOpen) {
          throw new ConvexError("Attendance window is closed. Please request admin to unlock.");
        }
      }
    }

    for (const record of args.records) {
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_class_and_date", (q: any) =>
          q.eq("classId", args.classId).eq("date", today)
        )
        .take(500);

      const existingRecord = existing.find((a: any) => a.studentId === record.studentId);

      if (existingRecord) {
        const oldStatus = existingRecord.status;
        await ctx.db.patch(existingRecord._id, {
          status: record.status,
          markedBy: userId,
          version: existingRecord.version + 1,
        });

        await ctx.db.insert("attendanceHistory", {
          attendanceId: existingRecord._id,
          previousStatus: oldStatus,
          newStatus: record.status,
          editedBy: userId,
          version: existingRecord.version + 1,
          companyId: user.companyId,
        });
      } else {
        await ctx.db.insert("attendance", {
          classId: args.classId,
          studentId: record.studentId,
          date: today,
          status: record.status,
          markedBy: userId,
          version: 1,
          companyId: user.companyId,
        });
      }
    }

    // Notifications — AFTER the loop
    // Recipients: each student individually, class teacher (if not the actor), all admins (batch)
    if (user.companyId) {
      const adminIds = await getAdminIds(ctx.db, user.companyId);
      const adminIdSet = new Set(adminIds.map((id) => id as string));

      // Calculate per-student charge info for the notification
      const isChargeable = (status: string) =>
        status === "present" || status === "late" || (cls.chargeAbsent && status === "absent");
      const pricePerClass = cls.pricePerClass ?? 0;
      const billingType = cls.billingType ?? "per_lesson";

      for (const record of args.records) {
        // Only send individual notification to actual students (not admin/super_admin)
        // Admins receive the batch notification below instead
        if (adminIdSet.has(record.studentId as string)) continue;

        // Include charge amount so student/parent knows the financial impact
        const chargeAmount = (billingType === "per_lesson" && isChargeable(record.status))
          ? pricePerClass : 0;

        await notify(ctx, {
          companyId: user.companyId,
          recipientIds: [record.studentId],
          type: "attendance_marked",
          data: {
            className: cls.name,
            date: today,
            status: record.status,
            classId: args.classId,
            chargeAmount,
            billingType,
          },
          actorId: userId,
        });
      }

      // Notify class teacher if they are NOT the one marking attendance (substitute/admin scenario)
      if (cls.teacherId && (cls.teacherId as string) !== (userId as string)) {
        await notify(ctx, {
          companyId: user.companyId,
          recipientIds: [cls.teacherId],
          type: "attendance_marked_batch",
          data: { className: cls.name, date: today, count: args.records.length, classId: args.classId },
          actorId: userId,
        });
      }

      // Notify admins once about the batch
      await notify(ctx, {
        companyId: user.companyId,
        recipientIds: adminIds,
        type: "attendance_marked_batch",
        data: { className: cls.name, date: today, count: args.records.length, classId: args.classId },
        actorId: userId,
      });
    }

    await ctx.db.insert("auditLogs", {
      userId,
      action: "mark_attendance",
      entityType: "attendance",
      entityId: args.classId,
      details: JSON.stringify({ date: today, recordCount: args.records.length }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    return null;
  },
});

// Unlock attendance (admin only)
export const unlockAttendance = mutation({
  args: {
    classId: v.id("classes"),
    date: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
      throw new ConvexError("Only admin can unlock attendance");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) throw new ConvexError("Class not found");
    if (cls.companyId !== user.companyId) throw new ConvexError("Class not found");

    const date = args.date || getTashkentDate(new Date());
    const duration = args.durationMinutes || 30;

    await ctx.db.insert("attendanceUnlocks", {
      classId: args.classId,
      date,
      unlockedBy: userId,
      expiresAt: Date.now() + duration * 60 * 1000,
      companyId: cls.companyId,
    });

    await ctx.db.insert("auditLogs", {
      userId,
      action: "unlock_attendance",
      entityType: "attendance",
      entityId: args.classId,
      details: JSON.stringify({ date, durationMinutes: duration }),
      timestamp: Date.now(),
      companyId: user.companyId,
    });

    return null;
  },
});

// Get attendance for a class on a date
export const getClassAttendance = query({
  args: {
    classId: v.id("classes"),
    date: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("attendance"),
    studentId: v.id("users"),
    studentName: v.optional(v.string()),
    status: v.string(),
    version: v.number(),
  })),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Not authenticated");

    const cls = await ctx.db.get(args.classId);
    if (!cls) throw new ConvexError("Class not found");
    if (cls.companyId !== user.companyId) throw new ConvexError("Class not found");

    const date = args.date || getTashkentDate(new Date());
    const records = await ctx.db
      .query("attendance")
      .withIndex("by_class_and_date", (q: any) =>
        q.eq("classId", args.classId).eq("date", date)
      )
      .take(500);

    const result: Array<{
      _id: Id<"attendance">;
      studentId: Id<"users">;
      studentName: string | undefined;
      status: string;
      version: number;
    }> = [];

    for (const r of records) {
      const student = await ctx.db.get(r.studentId);
      result.push({
        _id: r._id,
        studentId: r.studentId,
        studentName: student?.name,
        status: r.status,
        version: r.version,
      });
    }

    return result;
  },
});

// Get attendance percentage for a student in a class
export const getStudentAttendanceStats = query({
  args: {
    studentId: v.id("users"),
    classId: v.optional(v.id("classes")),
  },
  returns: v.object({
    total: v.number(),
    present: v.number(),
    absent: v.number(),
    late: v.number(),
    excused: v.number(),
    percentage: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Not authenticated");

    if (args.classId) {
      const cls = await ctx.db.get(args.classId);
      if (!cls) throw new ConvexError("Class not found");
      if (cls.companyId !== user.companyId) throw new ConvexError("Class not found");
    }

    let records;
    if (args.classId) {
      records = await ctx.db
        .query("attendance")
        .withIndex("by_student_and_class", (q: any) =>
          q.eq("studentId", args.studentId).eq("classId", args.classId!)
        )
        .take(1000);
    } else {
      records = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q: any) => q.eq("studentId", args.studentId))
        .take(1000);
    }

    let present = 0, absent = 0, late = 0, excused = 0;

    for (const r of records) {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "late") late++;
      else if (r.status === "excused") excused++;
    }

    const total = records.length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, absent, late, excused, percentage };
  },
});

// Check if attendance is open for a class
export const isAttendanceOpen = query({
  args: { classId: v.id("classes") },
  returns: v.object({
    isOpen: v.boolean(),
    reason: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Not authenticated");

    const cls = await ctx.db.get(args.classId);
    if (!cls) return { isOpen: false, reason: "Class not found" };
    if (cls.companyId !== user.companyId) return { isOpen: false, reason: "Class not found" };

    const now = new Date();
    const today = getTashkentDate(now);

    // Check unlock
    const unlocks = await ctx.db
      .query("attendanceUnlocks")
      .withIndex("by_class_and_date", (q: any) =>
        q.eq("classId", args.classId).eq("date", today)
      )
      .take(1);

    if (unlocks.length > 0 && unlocks[0].expiresAt > Date.now()) {
      return { isOpen: true, reason: "Unlocked by admin" };
    }

    return findOpenWindow(cls.scheduleDays, now);
  },
});