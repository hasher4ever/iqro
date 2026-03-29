import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { notify, getAdminIds } from "./notifications";

const gradingSystemValidator = v.union(
v.literal("a_f"),
v.literal("0_100"),
v.literal("1_5")
);

// Add a grade
export const addGrade = mutation({
args: {
classId: v.id("classes"),
studentId: v.id("users"),
value: v.string(),
assignmentName: v.optional(v.string()),
period: v.optional(v.string()),
},
returns: v.id("grades"),
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
const year = now.getFullYear();
const quarter = Math.ceil((now.getMonth() + 1) / 3);
const period = args.period || `${year}-Q${quarter}`;

const gradeId = await ctx.db.insert("grades", {
classId: args.classId,
studentId: args.studentId,
value: args.value,
gradingSystem: cls.gradingSystem,
period,
assignmentName: args.assignmentName,
createdBy: userId,
companyId: user.companyId,
});

await ctx.db.insert("auditLogs", {
userId,
action: "add_grade",
entityType: "grade",
entityId: gradeId,
details: JSON.stringify({ value: args.value, classId: args.classId }),
timestamp: Date.now(),
companyId: user.companyId,
});

// Notify student, class teacher (if not actor), and all admins
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [args.studentId, ...adminIds];
  if (cls.teacherId && (cls.teacherId as string) !== (userId as string)) {
    recipients.push(cls.teacherId);
  }
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "grade_added",
    data: { className: cls.name, grade: args.value, period, assignmentName: args.assignmentName, classId: args.classId },
    actorId: userId,
  });
}

return gradeId;
},
});

// Edit a grade
export const editGrade = mutation({
args: {
gradeId: v.id("grades"),
newValue: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "teacher")) {
throw new ConvexError("Insufficient permissions");
}

const grade = await ctx.db.get(args.gradeId);
if (!grade) throw new ConvexError("Grade not found");

const cls = await ctx.db.get(grade.classId);
if (!cls || cls.companyId !== user.companyId) throw new ConvexError("Grade not found");

await ctx.db.insert("gradeHistory", {
gradeId: args.gradeId,
previousValue: grade.value,
newValue: args.newValue,
editedBy: userId,
companyId: user.companyId!,
});

await ctx.db.patch(args.gradeId, {
value: args.newValue,
isEdited: true,
});

// Notify student, class teacher (if not actor), and all admins
if (user.companyId) {
  const adminIds = await getAdminIds(ctx.db, user.companyId);
  const recipients: Id<"users">[] = [grade.studentId, ...adminIds];
  if (cls.teacherId && (cls.teacherId as string) !== (userId as string)) {
    recipients.push(cls.teacherId);
  }
  await notify(ctx, {
    companyId: user.companyId,
    recipientIds: recipients,
    type: "grade_edited",
    data: { className: cls?.name, grade: args.newValue, oldGrade: grade.value, newGrade: args.newValue, period: grade.period, classId: grade.classId },
    actorId: userId,
  });
}

await ctx.db.insert("auditLogs", {
userId,
action: "edit_grade",
entityType: "grade",
entityId: args.gradeId,
details: JSON.stringify({ oldValue: grade.value, newValue: args.newValue }),
timestamp: Date.now(),
companyId: user.companyId,
});

return null;
},
});

// Get grades for a student in a class
export const getStudentGrades = query({
args: {
studentId: v.id("users"),
classId: v.optional(v.id("classes")),
},
returns: v.array(v.object({
_id: v.id("grades"),
_creationTime: v.number(),
classId: v.id("classes"),
className: v.optional(v.string()),
value: v.string(),
gradingSystem: gradingSystemValidator,
period: v.string(),
assignmentName: v.optional(v.string()),
isEdited: v.optional(v.boolean()),
})),
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

let grades;
if (args.classId) {
grades = await ctx.db
.query("grades")
.withIndex("by_class_and_student", (q) =>
q.eq("classId", args.classId!).eq("studentId", args.studentId)
)
.order("desc")
.take(200);
} else {
grades = await ctx.db
.query("grades")
.withIndex("by_student", (q) => q.eq("studentId", args.studentId))
.order("desc")
.take(200);
}

const result: Array<{
_id: Id<"grades">;
_creationTime: number;
classId: Id<"classes">;
className: string | undefined;
value: string;
gradingSystem: "a_f" | "0_100" | "1_5";
period: string;
assignmentName: string | undefined;
isEdited: boolean | undefined;
}> = [];

// Batch-fetch all class names upfront
const gradeClassIds = [...new Set(grades.map((g: any) => g.classId))] as Id<"classes">[];
const gradeClassNameMap: Record<string, string | undefined> = {};
for (const cid of gradeClassIds) {
const cls = await ctx.db.get(cid);
gradeClassNameMap[cid as string] = cls?.name;
}

for (const g of grades) {
if (g.companyId !== user.companyId) continue;
result.push({
_id: g._id,
_creationTime: g._creationTime,
classId: g.classId,
className: gradeClassNameMap[g.classId as string],
value: g.value,
gradingSystem: g.gradingSystem,
period: g.period,
assignmentName: g.assignmentName,
isEdited: g.isEdited,
});
}

return result;
},
});

// Get leaderboard for a class
export const getLeaderboard = query({
args: {
classId: v.id("classes"),
period: v.optional(v.string()),
},
returns: v.array(v.object({
studentId: v.id("users"),
studentName: v.optional(v.string()),
averageScore: v.number(),
gradeCount: v.number(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("Not authenticated");

const cls = await ctx.db.get(args.classId);
if (!cls) throw new ConvexError("Class not found");
if (cls.companyId !== user.companyId) throw new ConvexError("Class not found");

const now = new Date();
const year = now.getFullYear();
const quarter = Math.ceil((now.getMonth() + 1) / 3);
const period = args.period || `${year}-Q${quarter}`;

const grades = await ctx.db
.query("grades")
.withIndex("by_class_and_period", (q) =>
q.eq("classId", args.classId).eq("period", period)
)
.take(5000);

// Group by student and compute averages
const studentScores: Record<string, { total: number; count: number }> = {};

for (const g of grades) {
const score = gradeToNumeric(g.value, cls.gradingSystem);
if (score === null) continue;

const key = g.studentId as string;
if (!studentScores[key]) {
studentScores[key] = { total: 0, count: 0 };
}
studentScores[key].total += score;
studentScores[key].count++;
}

const result: Array<{
studentId: Id<"users">;
studentName: string | undefined;
averageScore: number;
gradeCount: number;
}> = [];

// Batch-fetch all student names upfront
const leaderStudentIds = Object.keys(studentScores);
const leaderStudentNameMap: Record<string, string | undefined> = {};
for (const sid of leaderStudentIds) {
const student = await ctx.db.get(sid as Id<"users">);
leaderStudentNameMap[sid] = student?.name;
}

for (const [studentId, data] of Object.entries(studentScores)) {
result.push({
studentId: studentId as Id<"users">,
studentName: leaderStudentNameMap[studentId],
averageScore: Math.round((data.total / data.count) * 100) / 100,
gradeCount: data.count,
});
}

// Sort by average score descending
result.sort((a, b) => b.averageScore - a.averageScore);
return result;
},
});

function gradeToNumeric(value: string, system: string): number | null {
if (system === "0_100") {
const n = parseInt(value, 10);
return isNaN(n) ? null : n;
}
if (system === "1_5") {
const n = parseInt(value, 10);
return isNaN(n) ? null : n;
}
if (system === "a_f") {
const map: Record<string, number> = {
"A": 4, "A+": 4.3, "A-": 3.7,
"B": 3, "B+": 3.3, "B-": 2.7,
"C": 2, "C+": 2.3, "C-": 1.7,
"D": 1, "D+": 1.3, "D-": 0.7,
"F": 0,
};
return map[value.toUpperCase()] ?? null;
}
return null;
}
