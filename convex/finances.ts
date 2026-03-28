import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { notify, getAdminIds } from "./notifications";

// Helper: check if a date string falls within a period
function isDateInPeriod(dateStr: string, startDate: string, endDate: string): boolean {
return dateStr >= startDate && dateStr <= endDate;
}

// Helper: count scheduled lessons for a class in a date range
function countScheduledLessons(
scheduleDays: Array<{ dayOfWeek: string }>,
startDate: string,
endDate: string
): number {
const dayMap: Record<string, number> = {
sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
thursday: 4, friday: 5, saturday: 6,
};
const scheduledDayNumbers = scheduleDays.map(d => dayMap[d.dayOfWeek]).filter(n => n !== undefined);
if (scheduledDayNumbers.length === 0) return 0;

let count = 0;
const start = new Date(startDate + "T00:00:00Z");
const end = new Date(endDate + "T00:00:00Z");
const current = new Date(start);

while (current <= end) {
if (scheduledDayNumbers.includes(current.getUTCDay())) {
count++;
}
current.setUTCDate(current.getUTCDate() + 1);
}
return count;
}

// Helper: get Tashkent date range for a period filter
function getDateRange(period: string): { startDate: string; endDate: string } {
// Current Tashkent time (UTC+5 offset; see lib/utils.ts TIMEZONE_OFFSET_MS for frontend equivalent)
const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
const today = now.toISOString().split("T")[0];

if (period === "day") {
return { startDate: today, endDate: today };
}

if (period === "week") {
const dayOfWeek = now.getUTCDay();
const monday = new Date(now);
monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7));
const sunday = new Date(monday);
sunday.setUTCDate(monday.getUTCDate() + 6);
return {
startDate: monday.toISOString().split("T")[0],
endDate: sunday.toISOString().split("T")[0],
};
}

// month
const year = now.getUTCFullYear();
const month = now.getUTCMonth();
const firstDay = new Date(Date.UTC(year, month, 1));
const lastDay = new Date(Date.UTC(year, month + 1, 0));
return {
startDate: firstDay.toISOString().split("T")[0],
endDate: lastDay.toISOString().split("T")[0],
};
}

// Main finances query - returns all financial metrics for the center
export const getFinancials = query({
args: {
period: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
},
returns: v.object({
// Revenue side
projected: v.number(),
factualAR: v.number(),
factualGathered: v.number(),
factualLoss: v.number(),
advanceAmount: v.number(),
// Teacher side
teacherProjected: v.number(),
teacherFactualAP: v.number(),
teacherFactualToBePaid: v.number(),
teacherFactualLoss: v.number(),
teacherAdvance: v.number(),
teacherTotalPaid: v.number(),
// Period info
startDate: v.string(),
endDate: v.string(),
// Per-teacher breakdown
teacherBreakdown: v.array(v.object({
teacherId: v.id("users"),
teacherName: v.optional(v.string()),
sharePercent: v.number(),
projected: v.number(),
factualAP: v.number(),
factualToBePaid: v.number(),
factualLoss: v.number(),
advance: v.number(),
totalPaidToTeacher: v.number(),
balance: v.number(),
})),
}),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (!user.companyId) {
return {
projected: 0, factualAR: 0, factualGathered: 0, factualLoss: 0, advanceAmount: 0,
teacherProjected: 0, teacherFactualAP: 0, teacherFactualToBePaid: 0, teacherFactualLoss: 0, teacherAdvance: 0, teacherTotalPaid: 0,
startDate: "", endDate: "",
teacherBreakdown: [],
};
}

const { startDate, endDate } = getDateRange(args.period);

// Get all active classes in this company
const allClasses = await ctx.db.query("classes")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(500);
const classes = allClasses.filter((c: any) => c.isActive);

// Cache teacher info
const teacherCache: Record<string, { name: string | undefined; }> = {};

// Per-teacher aggregation
const teacherAgg: Record<string, {
teacherId: Id<"users">;
teacherName: string | undefined;
projected: number;
factualAP: number;
factualToBePaid: number;
factualLoss: number;
advance: number;
totalClassRevenue: number;
}> = {};

let totalProjected = 0;
let totalFactualAR = 0;
let totalFactualGathered = 0;
let totalFactualLoss = 0;
let totalAdvance = 0;

for (const cls of classes) {
const pricePerClass = cls.pricePerClass;
const sharePercent = cls.teacherSharePercent ?? 50;
const teacherShare = sharePercent / 100;
const billingType = cls.billingType ?? "per_lesson";
const chargeAbsent = cls.chargeAbsent ?? false;

// Initialize teacher aggregation
if (!teacherAgg[cls.teacherId]) {
if (!teacherCache[cls.teacherId]) {
const teacher = await ctx.db.get(cls.teacherId);
teacherCache[cls.teacherId] = { name: teacher?.name };
}
teacherAgg[cls.teacherId] = {
teacherId: cls.teacherId,
teacherName: teacherCache[cls.teacherId].name,
projected: 0,
factualAP: 0,
factualToBePaid: 0,
factualLoss: 0,
advance: 0,
totalClassRevenue: 0,
};
}

// Get approved enrollments for this class
const enrollments = await ctx.db.query("enrollments")
.withIndex("by_class", (q: any) => q.eq("classId", cls._id))
.take(500);
const approved = enrollments.filter((e: any) => e.status === "approved");
const enrolledCount = approved.length;

if (enrolledCount === 0) continue;

// Get cancelled dates
const cancellations = await ctx.db.query("classCancellations")
  .withIndex("by_class", (q: any) => q.eq("classId", cls._id))
  .take(500);
const cancelledDates = new Set(cancellations.map((c: any) => c.date));

// Count scheduled lessons in period (exclude cancelled)
const scheduledLessons = countScheduledLessons(cls.scheduleDays, startDate, endDate);
// Count cancelled lessons in period
let cancelledInPeriod = 0;
for (const c of cancellations) {
  if (isDateInPeriod(c.date, startDate, endDate)) cancelledInPeriod++;
}
const effectiveLessons = Math.max(0, scheduledLessons - cancelledInPeriod);

// Projected: all effective lessons x all students x price
let classProjected: number;
let effectiveMonthlyPrice: number;
if (billingType === "per_month") {
  if (cls.monthlyPrice == null) {
    console.warn(`[finances] per_month class "${cls.name ?? cls._id}" has no monthlyPrice set — using 0 to avoid incorrect charges`);
    effectiveMonthlyPrice = 0;
  } else {
    effectiveMonthlyPrice = cls.monthlyPrice;
  }
  classProjected = enrolledCount * effectiveMonthlyPrice;
} else {
  effectiveMonthlyPrice = 0; // not used for per_lesson
  classProjected = effectiveLessons * enrolledCount * pricePerClass;
}
totalProjected += classProjected;
teacherAgg[cls.teacherId].projected += classProjected * teacherShare;
teacherAgg[cls.teacherId].totalClassRevenue += classProjected;

// Get all attendance records for this class
const attendance = await ctx.db.query("attendance")
.withIndex("by_class_and_date", (q: any) => q.eq("classId", cls._id))
.take(10000);

// Filter to period and exclude cancelled dates
const periodAttendance = attendance.filter(
  (a: any) => isDateInPeriod(a.date, startDate, endDate) && !cancelledDates.has(a.date)
);

// Get unique dates with at least one present/late
const dateStudentMap: Record<string, Array<{ studentId: Id<"users">; status: string }>> = {};
for (const a of periodAttendance) {
if (!dateStudentMap[a.date]) dateStudentMap[a.date] = [];
dateStudentMap[a.date].push({ studentId: a.studentId, status: a.status });
}

// Per-student analysis in this class for the period
const studentAttendedSessions: Record<string, number> = {};
const studentAbsentSessions: Record<string, number> = {};

for (const [_date, records] of Object.entries(dateStudentMap)) {
for (const r of records) {
if (r.status === "present" || r.status === "late") {
studentAttendedSessions[r.studentId] = (studentAttendedSessions[r.studentId] || 0) + 1;
} else if (r.status === "absent") {
  if (chargeAbsent) {
    // Strict: absent counts as attended (charged)
    studentAttendedSessions[r.studentId] = (studentAttendedSessions[r.studentId] || 0) + 1;
  } else {
    studentAbsentSessions[r.studentId] = (studentAbsentSessions[r.studentId] || 0) + 1;
  }
} else if (r.status === "excused") {
  // Excused is never charged
  studentAbsentSessions[r.studentId] = (studentAbsentSessions[r.studentId] || 0) + 1;
}
}
}

// Factual AR: sum of (attended sessions x price) for all students
let classFactualAR = 0;
if (billingType === "per_month") {
  // For per_month: count distinct months with chargeable attendance per student
  for (const [sid, _count] of Object.entries(studentAttendedSessions)) {
    // Collect distinct months for this student's chargeable sessions
    const studentMonths = new Set<string>();
    for (const [date, records] of Object.entries(dateStudentMap)) {
      for (const r of records) {
        if (r.studentId !== sid) continue;
        if (r.status === "present" || r.status === "late" || (chargeAbsent && r.status === "absent")) {
          studentMonths.add(date.substring(0, 7));
        }
      }
    }
    classFactualAR += studentMonths.size * effectiveMonthlyPrice;
  }
} else {
  for (const count of Object.values(studentAttendedSessions)) {
    classFactualAR += count * pricePerClass;
  }
}
totalFactualAR += classFactualAR;
teacherAgg[cls.teacherId].factualAP += classFactualAR * teacherShare;

// Factual Loss: sum of (absent sessions x price) for all students
let classFactualLoss = 0;
if (billingType === "per_month") {
  // For per_month: count distinct months where student ONLY had absences (no chargeable attendance)
  // Loss is the projected minus factual AR for this class
  classFactualLoss = Math.max(0, classProjected - classFactualAR);
} else {
  for (const count of Object.values(studentAbsentSessions)) {
    classFactualLoss += count * pricePerClass;
  }
}
totalFactualLoss += classFactualLoss;
teacherAgg[cls.teacherId].factualLoss += classFactualLoss * teacherShare;

// Now compute gathered (paid) vs advance per student
for (const enrollment of approved) {
const sid = enrollment.studentId;

// Get ALL attendance for this student in this class (not just this period)
const studentAttAll = await ctx.db.query("attendance")
  .withIndex("by_student_and_class", (q: any) =>
    q.eq("studentId", sid).eq("classId", cls._id)
  )
  .take(1000);
// Filter out cancelled dates from all-time attendance
const validAttAll = studentAttAll.filter((a: any) => !cancelledDates.has(a.date));

// H9: respect chargeAbsent; C4: respect billingType
let totalOwedAll: number;
if (billingType === "per_month") {
  const chargeableMonths = new Set<string>();
  for (const a of validAttAll) {
    if (a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")) {
      chargeableMonths.add(a.date.substring(0, 7));
    }
  }
  totalOwedAll = chargeableMonths.size * effectiveMonthlyPrice;
} else {
  const chargeableAll = validAttAll.filter(
    (a: any) => a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")
  ).length;
  totalOwedAll = chargeableAll * pricePerClass;
}

// Get ALL confirmed payments for this student in this class
const txs = await ctx.db.query("transactions")
  .withIndex("by_class_and_student", (q: any) =>
    q.eq("classId", cls._id).eq("studentId", sid)
  )
  .take(1000);
let totalPaidAll = 0;
for (const tx of txs) {
if (tx.status === "confirmed") totalPaidAll += tx.amount;
}

// How much of what they attended in THIS period has been covered by payments?
const attendedThisPeriod = studentAttendedSessions[sid] || 0;
let owedThisPeriod: number;
if (billingType === "per_month") {
  // For per_month: count distinct months with chargeable attendance this period
  const periodMonths = new Set<string>();
  for (const [date, records] of Object.entries(dateStudentMap)) {
    for (const r of records) {
      if (r.studentId !== sid) continue;
      if (r.status === "present" || r.status === "late" || (chargeAbsent && r.status === "absent")) {
        periodMonths.add(date.substring(0, 7));
      }
    }
  }
  owedThisPeriod = periodMonths.size * effectiveMonthlyPrice;
} else {
  owedThisPeriod = attendedThisPeriod * pricePerClass;
}

// Student overall balance = totalPaid - totalOwed (positive = overpaid)
const overallBalance = totalPaidAll - totalOwedAll;

// Factual gathered for this period: min of what's owed this period vs what's available
// If student has positive balance overall, they've covered their attended sessions
if (overallBalance >= 0) {
// Student has paid for everything + has advance
totalFactualGathered += owedThisPeriod;
teacherAgg[cls.teacherId].factualToBePaid += owedThisPeriod * teacherShare;
} else {
// Student owes money. They've paid totalPaidAll but owe totalOwedAll.
// For this period's lessons: how much is covered?
const coveredThisPeriod = Math.max(0, owedThisPeriod + overallBalance < owedThisPeriod ? Math.max(0, totalPaidAll - (totalOwedAll - owedThisPeriod)) : owedThisPeriod);
totalFactualGathered += Math.min(coveredThisPeriod, owedThisPeriod);
teacherAgg[cls.teacherId].factualToBePaid += Math.min(coveredThisPeriod, owedThisPeriod) * teacherShare;
}

// Advance: if student paid more than they owe overall
if (overallBalance > 0) {
totalAdvance += overallBalance;
teacherAgg[cls.teacherId].advance += overallBalance * teacherShare;
}
}
}

// Get teacher payments
const teacherPayments = await ctx.db.query("teacherPayments")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(10000);

// Aggregate teacher payments total
let teacherTotalPaid = 0;
const teacherPaidMap: Record<string, number> = {};
for (const tp of teacherPayments) {
teacherTotalPaid += tp.amount;
teacherPaidMap[tp.teacherId] = (teacherPaidMap[tp.teacherId] || 0) + tp.amount;
}

// Build teacher breakdown with balance
const teacherBreakdown: Array<{
teacherId: Id<"users">;
teacherName: string | undefined;
sharePercent: number;
projected: number;
factualAP: number;
factualToBePaid: number;
factualLoss: number;
advance: number;
totalPaidToTeacher: number;
balance: number;
}> = [];

for (const [tid, agg] of Object.entries(teacherAgg)) {
const paidToTeacher = teacherPaidMap[tid] || 0;
// H10: compute effective sharePercent as (teacher earned / total class revenue) * 100
// instead of using first class's sharePercent which is misleading for multi-class teachers
// Use projected amounts for a stable weighted average (factualAP could be 0 with no attendance yet)
const effectiveSharePercent = agg.totalClassRevenue > 0
  ? (agg.projected / agg.totalClassRevenue) * 100
  : 0;
const { totalClassRevenue: _unused, ...aggWithoutRevenue } = agg;
teacherBreakdown.push({
...aggWithoutRevenue,
sharePercent: Math.round(effectiveSharePercent * 100) / 100,
totalPaidToTeacher: paidToTeacher,
balance: agg.factualAP - paidToTeacher, // positive = center owes teacher
});
}

// Sort by balance descending (most owed first)
teacherBreakdown.sort((a, b) => b.balance - a.balance);

return {
projected: totalProjected,
factualAR: totalFactualAR,
factualGathered: totalFactualGathered,
factualLoss: totalFactualLoss,
advanceAmount: totalAdvance,
teacherProjected: Object.values(teacherAgg).reduce((s, t) => s + t.projected, 0),
teacherFactualAP: Object.values(teacherAgg).reduce((s, t) => s + t.factualAP, 0),
teacherFactualToBePaid: Object.values(teacherAgg).reduce((s, t) => s + t.factualToBePaid, 0),
teacherFactualLoss: Object.values(teacherAgg).reduce((s, t) => s + t.factualLoss, 0),
teacherAdvance: Object.values(teacherAgg).reduce((s, t) => s + t.advance, 0),
teacherTotalPaid: teacherTotalPaid,
startDate,
endDate,
teacherBreakdown,
};
},
});

// Record a payment to a teacher
export const recordTeacherPayment = mutation({
args: {
teacherId: v.id("users"),
amount: v.number(),
note: v.optional(v.string()),
},
returns: v.id("teacherPayments"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Only admin can record teacher payments");
}
if (args.amount <= 0) throw new ConvexError("Amount must be positive");

const teacher = await ctx.db.get(args.teacherId);
if (!teacher || teacher.role !== "teacher") {
throw new ConvexError("Invalid teacher");
}
if (teacher.companyId !== user.companyId) throw new ConvexError("Teacher does not belong to your company");

// Compute current YYYY-MM period in Tashkent time
const tashkentNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
const period = tashkentNow.toISOString().substring(0, 7); // YYYY-MM

const id = await ctx.db.insert("teacherPayments", {
teacherId: args.teacherId,
amount: args.amount,
note: args.note,
period,
createdBy: userId,
companyId: user.companyId!,
});

await ctx.db.insert("auditLogs", {
userId,
action: "record_teacher_payment",
entityType: "teacherPayment",
entityId: id,
details: JSON.stringify({ teacherId: args.teacherId, amount: args.amount }),
timestamp: Date.now(),
companyId: user.companyId!,
});

// Notify teacher and admins
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: [args.teacherId, ...adminIds],
    type: "teacher_payment",
    data: { teacherName: teacher.name, amount: args.amount, note: args.note },
    actorId: userId,
  });
}

return id;
},
});

// List teacher payments
export const listTeacherPayments = query({
args: {
teacherId: v.optional(v.id("users")),
},
returns: v.array(v.object({
_id: v.id("teacherPayments"),
_creationTime: v.number(),
teacherId: v.id("users"),
teacherName: v.optional(v.string()),
amount: v.number(),
note: v.optional(v.string()),
createdBy: v.id("users"),
createdByName: v.optional(v.string()),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
throw new ConvexError("Insufficient permissions");
}

// Verify teacherId belongs to caller's company if provided
if (args.teacherId) {
const teacherDoc = await ctx.db.get(args.teacherId);
if (!teacherDoc) throw new ConvexError("Teacher not found");
if (teacherDoc.companyId !== user.companyId) throw new ConvexError("Teacher does not belong to your company");
}

let payments;
if (args.teacherId) {
payments = await ctx.db.query("teacherPayments")
.withIndex("by_teacher", (q: any) => q.eq("teacherId", args.teacherId))
.order("desc")
.take(200);
} else if (user.companyId) {
payments = await ctx.db.query("teacherPayments")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.order("desc")
.take(200);
} else {
return [];
}

const result: Array<{
_id: Id<"teacherPayments">;
_creationTime: number;
teacherId: Id<"users">;
teacherName: string | undefined;
amount: number;
note: string | undefined;
createdBy: Id<"users">;
createdByName: string | undefined;
}> = [];

for (const p of payments) {
const teacher = await ctx.db.get(p.teacherId);
const creator = await ctx.db.get(p.createdBy);
result.push({
_id: p._id,
_creationTime: p._creationTime,
teacherId: p.teacherId,
teacherName: teacher?.name,
amount: p.amount,
note: p.note,
createdBy: p.createdBy,
createdByName: creator?.name,
});
}

return result;
},
});

// Update teacher share on a class
export const updateTeacherShare = mutation({
args: {
classId: v.id("classes"),
teacherSharePercent: v.number(),
},
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (args.teacherSharePercent < 0 || args.teacherSharePercent > 100) {
throw new ConvexError("Share must be between 0 and 100");
}

// Verify class belongs to caller's company
const classDoc = await ctx.db.get(args.classId);
if (!classDoc) throw new ConvexError("Class not found");
if (classDoc.companyId !== user.companyId) throw new ConvexError("Class does not belong to your company");

await ctx.db.patch(args.classId, {
teacherSharePercent: args.teacherSharePercent,
});

await ctx.db.insert("auditLogs", {
userId,
action: "update_teacher_share",
entityType: "class",
entityId: args.classId,
details: JSON.stringify({ teacherSharePercent: args.teacherSharePercent }),
timestamp: Date.now(),
companyId: user.companyId,
});

return null;
},
});

// Get teacher's own financial summary
export const getTeacherEarnings = query({
  args: {
    period: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  returns: v.object({
    totalEarned: v.number(),
    totalPaidOut: v.number(),
    balance: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");

    // Optional date range filtering (reuses getDateRange helper)
    const dateRange = args.period ? getDateRange(args.period) : null;

    // Get all active classes taught by this teacher (consistent with getFinancials)
    const allClasses = await ctx.db.query("classes")
      .withIndex("by_teacher", (q: any) => q.eq("teacherId", userId))
      .take(200);
    // Filter to active classes in teacher's company only
    const classes = allClasses.filter((c: any) => c.isActive && c.companyId === user.companyId);

    let totalEarned = 0;

    for (const cls of classes) {
      const sharePercent = cls.teacherSharePercent ?? 50;
      const teacherShare = sharePercent / 100;
      const pricePerClass = cls.pricePerClass;
      const billingType = cls.billingType ?? "per_lesson";
      const chargeAbsent = cls.chargeAbsent ?? false;

      // Get cancelled dates
      const cancellations = await ctx.db.query("classCancellations")
        .withIndex("by_class", (q: any) => q.eq("classId", cls._id))
        .take(500);
      const cancelledDates = new Set(cancellations.map((c: any) => c.date));

      const enrollments = await ctx.db.query("enrollments")
        .withIndex("by_class", (q: any) => q.eq("classId", cls._id))
        .take(500);
      const approved = enrollments.filter((e: any) => e.status === "approved");

      for (const enrollment of approved) {
        const attendance = await ctx.db.query("attendance")
          .withIndex("by_student_and_class", (q: any) =>
            q.eq("studentId", enrollment.studentId).eq("classId", cls._id)
          )
          .take(1000);

        // Filter out cancelled dates, and optionally filter by period
        const validAttendance = attendance.filter(
          (a: any) => !cancelledDates.has(a.date) &&
            (!dateRange || isDateInPeriod(a.date, dateRange.startDate, dateRange.endDate))
        );

        if (billingType === "per_month") {
          if (cls.monthlyPrice == null) {
            console.warn(`[finances] per_month class "${cls.name ?? cls._id}" has no monthlyPrice set — skipping from teacher earnings`);
            continue;
          }
          const monthlyPrice = cls.monthlyPrice;
          // Only count months with chargeable attendance
          const chargeableAtt = validAttendance.filter(
            (a: any) => a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")
          );
          const months = new Set(chargeableAtt.map((a: any) => a.date.substring(0, 7)));
          totalEarned += months.size * monthlyPrice * teacherShare;
        } else {
          let charged: number;
          if (chargeAbsent) {
            charged = validAttendance.filter(
              (a: any) => a.status === "present" || a.status === "late" || a.status === "absent"
            ).length;
          } else {
            charged = validAttendance.filter(
              (a: any) => a.status === "present" || a.status === "late"
            ).length;
          }
          totalEarned += charged * pricePerClass * teacherShare;
        }
      }
    }

    // Get total payments received
    const payments = await ctx.db.query("teacherPayments")
      .withIndex("by_teacher", (q: any) => q.eq("teacherId", userId))
      .take(1000);
    let totalPaidOut = 0;
    for (const p of payments) {
      totalPaidOut += p.amount;
    }

    return {
      totalEarned,
      totalPaidOut,
      balance: totalEarned - totalPaidOut,
    };
  },
});
