import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { notify, getAdminIds } from "./notifications";

const txTypeValidator = v.union(
v.literal("payment"),
v.literal("reversal"),
v.literal("adjustment")
);

const txStatusValidator = v.union(
v.literal("pending"),
v.literal("confirmed"),
v.literal("reversed")
);

// Record a payment (teacher collects cash)
export const recordPayment = mutation({
args: {
classId: v.id("classes"),
studentId: v.id("users"),
amount: v.number(),
note: v.optional(v.string()),
},
returns: v.id("transactions"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");
if (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher") {
throw new ConvexError("Insufficient permissions");
}

if (args.amount <= 0) throw new ConvexError("Amount must be positive");

// Verify classId belongs to caller's company
const cls = await ctx.db.get(args.classId);
if (!cls) throw new ConvexError("Class not found");
if (cls.companyId !== user.companyId) throw new ConvexError("Class does not belong to your company");

// Verify studentId belongs to caller's company
const student = await ctx.db.get(args.studentId);
if (!student) throw new ConvexError("Student not found");
if (student.companyId !== user.companyId) throw new ConvexError("Student does not belong to your company");

const txId = await ctx.db.insert("transactions", {
classId: args.classId,
studentId: args.studentId,
amount: args.amount,
type: "payment",
status: "pending",
createdBy: userId,
note: args.note,
companyId: user.companyId,
});

await ctx.db.insert("auditLogs", {
userId,
action: "record_payment",
entityType: "transaction",
entityId: txId,
details: JSON.stringify({ amount: args.amount, studentId: args.studentId, classId: args.classId }),
timestamp: Date.now(),
companyId: user.companyId,
});

// In-app notifications: student, class teacher, recording user (self), all admins
// Dedup in notify() handles overlaps (e.g., actor is the class teacher, or actor is an admin)
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [args.studentId, userId, ...adminIds];
  if (cls.teacherId) recipients.push(cls.teacherId);

  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "payment_recorded",
    data: { studentName: student?.name, className: cls?.name, amount: args.amount, classId: args.classId },
    actorId: userId,
    skipActorFilter: true,
  });
}

return txId;
},
});

// Admin confirms payment
export const confirmPayment = mutation({
args: { transactionId: v.id("transactions") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Only admin can confirm payments");
}

const tx = await ctx.db.get(args.transactionId);
if (!tx) throw new ConvexError("Transaction not found");
if (tx.companyId !== user.companyId) throw new ConvexError("Transaction does not belong to your company");
if (tx.status !== "pending") throw new ConvexError("Transaction is not pending");

await ctx.db.patch(args.transactionId, {
status: "confirmed",
verifiedBy: userId,
verifiedAt: Date.now(),
});

await ctx.db.insert("auditLogs", {
userId,
action: "confirm_payment",
entityType: "transaction",
entityId: args.transactionId,
details: JSON.stringify({ amount: tx.amount }),
timestamp: Date.now(),
companyId: user.companyId,
});

// In-app notifications: student, original recorder, class teacher, all admins
if (user.companyId) {
  const student = await ctx.db.get(tx.studentId);
  const cls = await ctx.db.get(tx.classId);
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [tx.studentId, tx.createdBy, ...adminIds];
  if (cls?.teacherId) recipients.push(cls.teacherId);

  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "payment_confirmed",
    data: { studentName: student?.name, className: cls?.name, amount: tx.amount, classId: tx.classId },
    actorId: userId,
    skipActorFilter: true,
  });
}

return null;
},
});

// Create reversal transaction
export const createReversal = mutation({
args: {
originalTransactionId: v.id("transactions"),
note: v.optional(v.string()),
},
returns: v.id("transactions"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Only admin can reverse transactions");
}

const original = await ctx.db.get(args.originalTransactionId);
if (!original) throw new ConvexError("Original transaction not found");
if (original.companyId !== user.companyId) throw new ConvexError("Transaction does not belong to your company");
if (original.status !== "confirmed") throw new ConvexError("Only confirmed payments can be reversed");

await ctx.db.patch(args.originalTransactionId, { status: "reversed" });

const reversalId = await ctx.db.insert("transactions", {
classId: original.classId,
studentId: original.studentId,
amount: -original.amount,
type: "reversal",
status: "reversed",
createdBy: userId,
verifiedBy: userId,
verifiedAt: Date.now(),
relatedTransactionId: args.originalTransactionId,
note: args.note || "Reversal of transaction",
companyId: user.companyId,
});

await ctx.db.insert("auditLogs", {
userId,
action: "create_reversal",
entityType: "transaction",
entityId: reversalId,
details: JSON.stringify({ originalId: args.originalTransactionId, amount: -original.amount }),
timestamp: Date.now(),
companyId: user.companyId,
});

// In-app notifications: student, original recorder, class teacher, all admins
if (user.companyId) {
  const student = await ctx.db.get(original.studentId);
  const cls = await ctx.db.get(original.classId);
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [original.studentId, original.createdBy, ...adminIds];
  if (cls?.teacherId) recipients.push(cls.teacherId);

  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "payment_reversed",
    data: { studentName: student?.name, className: cls?.name, amount: original.amount, classId: original.classId },
    actorId: userId,
    skipActorFilter: true,
  });
}

return reversalId;
},
});

// Get student balance for a class
export const getStudentClassBalance = query({
args: {
classId: v.id("classes"),
studentId: v.id("users"),
},
returns: v.object({
balance: v.number(),
pendingAmount: v.number(),
sessionsAttended: v.number(),
totalOwed: v.number(),
totalPaid: v.number(),
billingType: v.string(),
}),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

// Verify class belongs to caller's company
const classDoc = await ctx.db.get(args.classId);
if (!classDoc) throw new ConvexError("Class not found");
if (classDoc.companyId !== user.companyId) throw new ConvexError("Class does not belong to your company");

// Verify student belongs to caller's company
const studentDoc = await ctx.db.get(args.studentId);
if (!studentDoc) throw new ConvexError("Student not found");
if (studentDoc.companyId !== user.companyId) throw new ConvexError("Student does not belong to your company");

const txs = await ctx.db
.query("transactions")
.withIndex("by_class_and_student", (q) =>
q.eq("classId", args.classId).eq("studentId", args.studentId)
)
.take(1000);

let totalPaid = 0;
let pendingAmount = 0;
for (const tx of txs) {
if (tx.status === "confirmed") {
totalPaid += tx.amount;
} else if (tx.status === "pending") {
pendingAmount += tx.amount;
}
}

// Reuse classDoc already fetched above
const pricePerClass = classDoc.pricePerClass ?? 0;
const billingType = classDoc.billingType ?? "per_lesson";
const chargeAbsent = classDoc.chargeAbsent ?? false;

// Get cancelled dates for this class
const cancellations = await ctx.db.query("classCancellations")
  .withIndex("by_class", (q: any) => q.eq("classId", args.classId))
  .take(500);
const cancelledDates = new Set(cancellations.map((c: any) => c.date));

// Count sessions based on billing type
const attendanceRecords = await ctx.db
.query("attendance")
.withIndex("by_student_and_class", (q) =>
q.eq("studentId", args.studentId).eq("classId", args.classId)
)
.take(1000);

// Filter out cancelled dates
const validAttendance = attendanceRecords.filter(
  (a) => !cancelledDates.has(a.date)
);

let sessionsCharged: number;
if (chargeAbsent) {
  // Strict: charge present + late + absent, only excused is free
  sessionsCharged = validAttendance.filter(
    (a) => a.status === "present" || a.status === "late" || a.status === "absent"
  ).length;
} else {
  // Lenient: only charge present + late
  sessionsCharged = validAttendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
}

let totalOwed: number;
if (billingType === "per_month") {
  // Per month: count distinct months with chargeable attendance × monthly price
  // If monthlyPrice not set, use 0 (consistent with getFinancials) — pricePerClass is per-lesson, wrong unit
  const monthlyPrice = classDoc.monthlyPrice ?? 0;
  const chargeableAttendance = validAttendance.filter(a =>
    a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")
  );
  const months = new Set(chargeableAttendance.map((a) => a.date.substring(0, 7)));
  totalOwed = months.size * monthlyPrice;
} else {
  // Per lesson
  totalOwed = sessionsCharged * pricePerClass;
}

const balance = totalPaid - totalOwed;

return { balance, pendingAmount, sessionsAttended: sessionsCharged, totalOwed, totalPaid, billingType };
},
});

// List transactions for admin - scope by company
export const listTransactions = query({
args: {
classId: v.optional(v.id("classes")),
studentId: v.optional(v.id("users")),
status: v.optional(v.string()),
},
returns: v.array(v.object({
_id: v.id("transactions"),
_creationTime: v.number(),
classId: v.id("classes"),
className: v.optional(v.string()),
studentId: v.id("users"),
studentName: v.optional(v.string()),
amount: v.number(),
type: v.string(),
status: v.string(),
createdBy: v.id("users"),
createdByName: v.optional(v.string()),
verifiedBy: v.optional(v.id("users")),
verifiedAt: v.optional(v.number()),
relatedTransactionId: v.optional(v.id("transactions")),
note: v.optional(v.string()),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

// Verify classId belongs to caller's company if provided
if (args.classId) {
const classDoc = await ctx.db.get(args.classId);
if (!classDoc) throw new ConvexError("Class not found");
if (classDoc.companyId !== user.companyId) throw new ConvexError("Class does not belong to your company");
}

// Verify studentId belongs to caller's company if provided
if (args.studentId) {
const studentDoc = await ctx.db.get(args.studentId);
if (!studentDoc) throw new ConvexError("Student not found");
if (studentDoc.companyId !== user.companyId) throw new ConvexError("Student does not belong to your company");
}

let txs;
if (args.classId && args.studentId) {
txs = await ctx.db
.query("transactions")
.withIndex("by_class_and_student", (q: any) =>
q.eq("classId", args.classId!).eq("studentId", args.studentId!)
)
.order("desc")
.take(200);
} else if (args.classId) {
txs = await ctx.db
.query("transactions")
.withIndex("by_class", (q: any) => q.eq("classId", args.classId!))
.order("desc")
.take(200);
} else if (args.studentId) {
txs = await ctx.db
.query("transactions")
.withIndex("by_student", (q: any) => q.eq("studentId", args.studentId!))
.order("desc")
.take(200);
} else if (user.companyId) {
txs = await ctx.db.query("transactions")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .order("desc")
  .take(200);
} else {
return [];
}

if (args.status) {
txs = txs.filter((t) => t.status === args.status);
}

const result: Array<{
_id: Id<"transactions">;
_creationTime: number;
classId: Id<"classes">;
className: string | undefined;
studentId: Id<"users">;
studentName: string | undefined;
amount: number;
type: string;
status: string;
createdBy: Id<"users">;
createdByName: string | undefined;
verifiedBy: Id<"users"> | undefined;
verifiedAt: number | undefined;
relatedTransactionId: Id<"transactions"> | undefined;
note: string | undefined;
}> = [];

// Batch-fetch all referenced entities upfront to avoid N+1
const txClassIds = [...new Set(txs.map((tx) => tx.classId))] as Id<"classes">[];
const txStudentIds = [...new Set(txs.map((tx) => tx.studentId))] as Id<"users">[];
const txCreatorIds = [...new Set(txs.map((tx) => tx.createdBy))] as Id<"users">[];
const entityMap: Record<string, { name?: string }> = {};
for (const id of txClassIds) {
const doc = await ctx.db.get(id);
if (doc) entityMap[id as string] = { name: doc.name };
}
// Deduplicate user IDs before fetching
const txUserIds = [...new Set([...txStudentIds, ...txCreatorIds] as Id<"users">[])];
for (const id of txUserIds) {
if (id as string in entityMap) continue;
const doc = await ctx.db.get(id);
if (doc) entityMap[id as string] = { name: doc.name };
}

for (const tx of txs) {
result.push({
_id: tx._id,
_creationTime: tx._creationTime,
classId: tx.classId,
className: entityMap[tx.classId as string]?.name,
studentId: tx.studentId,
studentName: entityMap[tx.studentId as string]?.name,
amount: tx.amount,
type: tx.type,
status: tx.status,
createdBy: tx.createdBy,
createdByName: entityMap[tx.createdBy as string]?.name,
verifiedBy: tx.verifiedBy,
verifiedAt: tx.verifiedAt,
relatedTransactionId: tx.relatedTransactionId,
note: tx.note,
});
}

return result;
},
});

// Get pending payments count
export const getPendingCount = query({
args: {},
returns: v.number(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");
if (!user.companyId) return 0;

const allTxs = await ctx.db
.query("transactions")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(1000);
const pending = allTxs.filter((t) => t.status === "pending");
return pending.length;
},
});

// Get students with negative balance (debt)
export const getDebtors = query({
args: {},
returns: v.array(v.object({
studentId: v.id("users"),
studentName: v.optional(v.string()),
classId: v.id("classes"),
className: v.optional(v.string()),
balance: v.number(),
sessionsAttended: v.number(),
totalOwed: v.number(),
totalPaid: v.number(),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}

if (!user.companyId) return [];

// Get all enrollments for this company
// Include withdrawn — students who dropped with unpaid debt must still appear as debtors
const enrollments = await ctx.db.query("enrollments")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(1000);
const eligible = enrollments.filter((e) => e.status === "approved" || e.status === "withdrawn");

const debtors: Array<{
studentId: Id<"users">;
studentName: string | undefined;
classId: Id<"classes">;
className: string | undefined;
balance: number;
sessionsAttended: number;
totalOwed: number;
totalPaid: number;
}> = [];

// Batch-fetch all classes and cancellations upfront to avoid N+1
const debtorClassIds = [...new Set(eligible.map((e) => e.classId))] as Id<"classes">[];
const classCache: Record<string, any> = {};
const cancelledDatesCache: Record<string, Set<string>> = {};
for (const classId of debtorClassIds) {
  const cls = await ctx.db.get(classId);
  if (cls) classCache[classId as string] = cls;
  const cancellations = await ctx.db.query("classCancellations")
    .withIndex("by_class", (q: any) => q.eq("classId", classId))
    .take(500);
  cancelledDatesCache[classId as string] = new Set(cancellations.map((c: any) => c.date));
}

// Batch-fetch all student names upfront
const debtorStudentIds = [...new Set(eligible.map((e) => e.studentId))] as Id<"users">[];
const studentCache: Record<string, string | undefined> = {};
for (const sid of debtorStudentIds) {
  const student = await ctx.db.get(sid);
  studentCache[sid as string] = student?.name;
}

for (const enrollment of eligible) {
// Sum confirmed payments
const txs = await ctx.db
.query("transactions")
.withIndex("by_class_and_student", (q) =>
q.eq("classId", enrollment.classId).eq("studentId", enrollment.studentId)
)
.take(1000);

let totalPaid = 0;
for (const tx of txs) {
if (tx.status === "confirmed") totalPaid += tx.amount;
}

// Use cached class info
const cls = classCache[enrollment.classId as string];
const pricePerClass = cls?.pricePerClass ?? 0;
const billingType = cls?.billingType ?? "per_lesson";
const chargeAbsent = cls?.chargeAbsent ?? false;
const cancelledDates = cancelledDatesCache[enrollment.classId as string] ?? new Set();

// Count sessions
const attendanceRecords = await ctx.db
.query("attendance")
.withIndex("by_student_and_class", (q) =>
q.eq("studentId", enrollment.studentId).eq("classId", enrollment.classId)
)
.take(1000);

const validAttendance = attendanceRecords.filter(
  (a) => !cancelledDates.has(a.date)
);

let sessionsAttended: number;
if (chargeAbsent) {
  sessionsAttended = validAttendance.filter(
    (a) => a.status === "present" || a.status === "late" || a.status === "absent"
  ).length;
} else {
  sessionsAttended = validAttendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
}

let totalOwed: number;
if (billingType === "per_month") {
  const monthlyPrice = cls?.monthlyPrice ?? 0;
  const chargeableAttendance = validAttendance.filter((a: any) =>
    a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")
  );
  const months = new Set(chargeableAttendance.map((a: any) => a.date.substring(0, 7)));
  totalOwed = months.size * monthlyPrice;
} else {
  totalOwed = sessionsAttended * pricePerClass;
}

const balance = totalPaid - totalOwed;

if (balance < 0) {
debtors.push({
studentId: enrollment.studentId,
studentName: studentCache[enrollment.studentId as string],
classId: enrollment.classId,
className: cls?.name,
balance,
sessionsAttended,
totalOwed,
totalPaid,
});
}
}

return debtors;
},
});

// Get total revenue - scoped by company
export const getTotalRevenue = query({
args: {},
returns: v.object({
totalConfirmed: v.number(),
totalPending: v.number(),
}),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (!user.companyId) return { totalConfirmed: 0, totalPending: 0 };

const allTxs = await ctx.db
.query("transactions")
.withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
.take(10000);

let totalConfirmed = 0;
let totalPending = 0;
for (const tx of allTxs) {
  if (tx.status === "confirmed") totalConfirmed += tx.amount;
  else if (tx.status === "pending") totalPending += tx.amount;
}

return { totalConfirmed, totalPending };
},
});

// Get full center financial overview - total lesson charges, payments, and balance
export const getCenterFinancials = query({
args: {},
returns: v.object({
totalLessonCharges: v.number(),
totalCollected: v.number(),
totalPending: v.number(),
outstandingBalance: v.number(),
totalStudentsWithDebt: v.number(),
}),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (!user.companyId) return { totalLessonCharges: 0, totalCollected: 0, totalPending: 0, outstandingBalance: 0, totalStudentsWithDebt: 0 };

// Get all approved enrollments in this company
const enrollments = await ctx.db
  .query("enrollments")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .take(10000);
const approved = enrollments.filter((e) => e.status === "approved");

let totalLessonCharges = 0;
let totalCollected = 0;
let totalPending = 0;
let totalStudentsWithDebt = 0;

// Batch-fetch all classes and cancellations upfront to avoid N+1
const classIdsSet = [...new Set(approved.map((e) => e.classId))] as Id<"classes">[];
const classConfigCache: Record<string, any> = {};
const cfCancelledDatesCache: Record<string, Set<string>> = {};
for (const classId of classIdsSet) {
  const cls = await ctx.db.get(classId);
  if (cls) classConfigCache[classId as string] = cls;
  const cancellations = await ctx.db.query("classCancellations")
    .withIndex("by_class", (q: any) => q.eq("classId", classId))
    .take(500);
  cfCancelledDatesCache[classId as string] = new Set(cancellations.map((c: any) => c.date));
}

for (const enrollment of approved) {
  // Use cached class config
  const cls = classConfigCache[enrollment.classId as string];
  const pricePerClass = cls?.pricePerClass ?? 0;
  const billingType = cls?.billingType ?? "per_lesson";
  const chargeAbsent = cls?.chargeAbsent ?? false;
  const cancelledDates = cfCancelledDatesCache[enrollment.classId as string] ?? new Set();

  // Count attended sessions for this student in this class
  const attendanceRecords = await ctx.db
    .query("attendance")
    .withIndex("by_student_and_class", (q) =>
      q.eq("studentId", enrollment.studentId).eq("classId", enrollment.classId)
    )
    .take(1000);

  // Filter out cancelled dates
  const validAttendance = attendanceRecords.filter(
    (a) => !cancelledDates.has(a.date)
  );

  let sessionsCharged: number;
  if (chargeAbsent) {
    sessionsCharged = validAttendance.filter(
      (a) => a.status === "present" || a.status === "late" || a.status === "absent"
    ).length;
  } else {
    sessionsCharged = validAttendance.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
  }

  let studentOwed: number;
  if (billingType === "per_month") {
    const monthlyPrice = cls?.monthlyPrice ?? 0;
    const chargeableAttendance = validAttendance.filter((a: any) =>
      a.status === "present" || a.status === "late" || (chargeAbsent && a.status === "absent")
    );
    const months = new Set(chargeableAttendance.map((a: any) => a.date.substring(0, 7)));
    studentOwed = months.size * monthlyPrice;
  } else {
    studentOwed = sessionsCharged * pricePerClass;
  }
  totalLessonCharges += studentOwed;

  // Sum confirmed and pending payments for this student in this class
  const txs = await ctx.db
    .query("transactions")
    .withIndex("by_class_and_student", (q) =>
      q.eq("classId", enrollment.classId).eq("studentId", enrollment.studentId)
    )
    .take(1000);

  let studentPaid = 0;
  let studentPending = 0;
  for (const tx of txs) {
    if (tx.status === "confirmed") studentPaid += tx.amount;
    else if (tx.status === "pending") studentPending += tx.amount;
  }

  totalCollected += studentPaid;
  totalPending += studentPending;

  if (studentPaid - studentOwed < 0) {
    totalStudentsWithDebt++;
  }
}

const outstandingBalance = totalLessonCharges - totalCollected;

return {
  totalLessonCharges,
  totalCollected,
  totalPending,
  outstandingBalance,
  totalStudentsWithDebt,
};
},
});