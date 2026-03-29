import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
...authTables,

companies: defineTable({
name: v.string(),
inviteCode: v.string(),
ownerId: v.id("users"),
isActive: v.boolean(),
telegramBotToken: v.optional(v.string()),
telegramEnabled: v.optional(v.boolean()),
telegramWebhookSecret: v.optional(v.string()),
telegramBotUsername: v.optional(v.string()),
})
.index("by_inviteCode", ["inviteCode"])
.index("by_owner", ["ownerId"])
.index("by_telegramWebhookSecret", ["telegramWebhookSecret"]),

inviteCodes: defineTable({
  code: v.string(),
  companyId: v.id("companies"),
  createdBy: v.id("users"),
  usedBy: v.optional(v.id("users")),
  role: v.optional(v.union(
    v.literal("teacher"),
    v.literal("student_parent"),
    v.literal("admin"),
  )),
  label: v.optional(v.string()),
  createdAt: v.number(),
  usedAt: v.optional(v.number()),
})
  .index("by_code", ["code"])
  .index("by_company", ["companyId"]),

users: defineTable({
name: v.optional(v.string()),
email: v.optional(v.string()),
emailVerificationTime: v.optional(v.number()),
phone: v.optional(v.string()),
phoneVerificationTime: v.optional(v.number()),
image: v.optional(v.string()),
isAnonymous: v.optional(v.boolean()),
role: v.optional(v.union(
v.literal("super_admin"),
v.literal("admin"),
v.literal("teacher"),
v.literal("student_parent")
)),
language: v.optional(v.union(
v.literal("ru"),
v.literal("uz_latin"),
v.literal("uz_cyrillic"),
v.literal("en")
)),
isActive: v.optional(v.boolean()),
isArchived: v.optional(v.boolean()),
companyId: v.optional(v.id("companies")),
})
.index("email", ["email"])
.index("by_phone", ["phone"])
.index("by_role", ["role"])
.index("by_company", ["companyId"])
.index("by_company_and_role", ["companyId", "role"]),

classes: defineTable({
name: v.string(),
subjectName: v.string(),
teacherId: v.id("users"),
roomId: v.id("rooms"),
gradingSystem: v.union(v.literal("a_f"), v.literal("0_100"), v.literal("1_5")),
billingType: v.optional(v.union(v.literal("per_lesson"), v.literal("per_month"))),
pricePerClass: v.number(),
monthlyPrice: v.optional(v.number()),
chargeAbsent: v.optional(v.boolean()),
teacherSharePercent: v.optional(v.number()),
scheduleDays: v.array(v.object({
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
})),
isActive: v.boolean(),
companyId: v.id("companies"),
})
.index("by_teacher", ["teacherId"])
.index("by_room", ["roomId"])
.index("by_active", ["isActive"])
.index("by_company", ["companyId"]),

enrollments: defineTable({
studentId: v.id("users"),
classId: v.id("classes"),
status: v.union(
v.literal("pending"),
v.literal("approved"),
v.literal("rejected"),
v.literal("withdrawn")
),
approvedBy: v.optional(v.id("users")),
approvedAt: v.optional(v.number()),
companyId: v.id("companies"),
})
.index("by_student", ["studentId"])
.index("by_class", ["classId"])
.index("by_class_and_student", ["classId", "studentId"])
.index("by_status", ["status"])
.index("by_company", ["companyId"]),

transactions: defineTable({
classId: v.id("classes"),
studentId: v.id("users"),
amount: v.number(),
type: v.union(v.literal("payment"), v.literal("reversal"), v.literal("adjustment")),
status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("reversed"), v.literal("reversal")),
createdBy: v.id("users"),
verifiedBy: v.optional(v.id("users")),
verifiedAt: v.optional(v.number()),
relatedTransactionId: v.optional(v.id("transactions")),
note: v.optional(v.string()),
companyId: v.id("companies"),
})
.index("by_class", ["classId"])
.index("by_student", ["studentId"])
.index("by_class_and_student", ["classId", "studentId"])
.index("by_status", ["status"])
.index("by_createdBy", ["createdBy"])
.index("by_company", ["companyId"]),

attendance: defineTable({
classId: v.id("classes"),
studentId: v.id("users"),
date: v.string(),
status: v.union(v.literal("present"), v.literal("absent"), v.literal("late"), v.literal("excused")),
markedBy: v.id("users"),
version: v.number(),
isUnlocked: v.optional(v.boolean()),
unlockedBy: v.optional(v.id("users")),
unlockedAt: v.optional(v.number()),
companyId: v.id("companies"),
})
.index("by_class_and_date", ["classId", "date"])
.index("by_student", ["studentId"])
.index("by_student_and_class", ["studentId", "classId"])
.index("by_company", ["companyId"]),

attendanceHistory: defineTable({
attendanceId: v.id("attendance"),
previousStatus: v.string(),
newStatus: v.string(),
editedBy: v.id("users"),
version: v.number(),
companyId: v.id("companies"),
})
.index("by_attendance", ["attendanceId"])
.index("by_company", ["companyId"]),

grades: defineTable({
classId: v.id("classes"),
studentId: v.id("users"),
value: v.string(),
gradingSystem: v.union(v.literal("a_f"), v.literal("0_100"), v.literal("1_5")),
period: v.string(),
assignmentName: v.optional(v.string()),
createdBy: v.id("users"),
isEdited: v.optional(v.boolean()),
companyId: v.id("companies"),
})
.index("by_class", ["classId"])
.index("by_student", ["studentId"])
.index("by_class_and_student", ["classId", "studentId"])
.index("by_class_and_period", ["classId", "period"])
.index("by_company", ["companyId"]),

gradeHistory: defineTable({
gradeId: v.id("grades"),
previousValue: v.string(),
newValue: v.string(),
editedBy: v.id("users"),
companyId: v.id("companies"),
})
.index("by_grade", ["gradeId"])
.index("by_company", ["companyId"]),

rooms: defineTable({
name: v.string(),
capacity: v.optional(v.number()),
isActive: v.boolean(),
companyId: v.id("companies"),
}).index("by_company", ["companyId"]),

scheduleSlots: defineTable({
roomId: v.id("rooms"),
classId: v.id("classes"),
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
companyId: v.id("companies"),
})
.index("by_room", ["roomId"])
.index("by_room_and_day", ["roomId", "dayOfWeek"])
.index("by_class", ["classId"])
.index("by_company", ["companyId"]),

auditLogs: defineTable({
userId: v.id("users"),
action: v.string(),
entityType: v.string(),
entityId: v.optional(v.string()),
details: v.optional(v.string()),
timestamp: v.number(),
companyId: v.id("companies"),
})
.index("by_user", ["userId"])
.index("by_entityType", ["entityType"])
.index("by_action", ["action"])
.index("by_company", ["companyId"])
.index("by_company_and_entityType", ["companyId", "entityType"]),

leaderboardPeriods: defineTable({
classId: v.id("classes"),
periodName: v.string(),
startDate: v.string(),
endDate: v.optional(v.string()),
isActive: v.boolean(),
companyId: v.id("companies"),
})
.index("by_class", ["classId"])
.index("by_class_and_active", ["classId", "isActive"])
.index("by_company", ["companyId"]),

attendanceUnlocks: defineTable({
classId: v.id("classes"),
date: v.string(),
unlockedBy: v.id("users"),
expiresAt: v.number(),
companyId: v.id("companies"),
})
.index("by_class_and_date", ["classId", "date"])
.index("by_company", ["companyId"]),

classCancellations: defineTable({
classId: v.id("classes"),
date: v.string(),
reason: v.optional(v.string()),
cancelledBy: v.id("users"),
companyId: v.id("companies"),
})
.index("by_class", ["classId"])
.index("by_class_and_date", ["classId", "date"])
.index("by_company", ["companyId"]),

teacherPayments: defineTable({
teacherId: v.id("users"),
amount: v.number(),
note: v.optional(v.string()),
period: v.optional(v.string()), // YYYY-MM format
createdBy: v.id("users"),
companyId: v.id("companies"),
})
.index("by_teacher", ["teacherId"])
.index("by_teacher_and_period", ["teacherId", "period"])
.index("by_company", ["companyId"]),

telegramLinkCodes: defineTable({
userId: v.id("users"),
tenantId: v.id("companies"),
code: v.string(),
expiresAt: v.number(),
usedAt: v.optional(v.number()),
})
.index("by_code_and_tenant", ["code", "tenantId"])
.index("by_user_and_tenant", ["userId", "tenantId"]),

telegramLinks: defineTable({
    userId: v.id("users"),
    tenantId: v.id("companies"),
    chatId: v.string(),
    language: v.optional(v.string()),
    blockedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_and_tenant", ["userId", "tenantId"])
    .index("by_tenant", ["tenantId"])
    .index("by_chat", ["chatId"]),

telegramRegistrations: defineTable({
  tenantId: v.id("companies"),
  chatId: v.string(),
  language: v.optional(v.string()),
  phone: v.optional(v.string()),
  parentName: v.optional(v.string()),
  studentName: v.optional(v.string()),
  subjectName: v.optional(v.string()),
  classId: v.optional(v.id("classes")),
  className: v.optional(v.string()),
  step: v.string(), // awaiting_language, awaiting_phone, awaiting_parent_name, awaiting_student_name, awaiting_subject, awaiting_class, submitted, approved, rejected
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  createdUserId: v.optional(v.id("users")),
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
})
  .index("by_chat", ["chatId"])
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_status", ["tenantId", "status"]),

notificationLogs: defineTable({
userId: v.id("users"),
tenantId: v.id("companies"),
eventType: v.string(),
status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
attempts: v.number(),
lastError: v.optional(v.string()),
sentAt: v.optional(v.number()),
messageText: v.optional(v.string()),
})
.index("by_tenant", ["tenantId"])
.index("by_user_and_tenant", ["userId", "tenantId"])
.index("by_status", ["status"]),

notifications: defineTable({
  companyId: v.id("companies"),
  userId: v.id("users"),
  type: v.string(),
  isRead: v.boolean(),
  data: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
  actorId: v.optional(v.id("users")),
})
  .index("by_user", ["userId"])
  .index("by_user_and_read", ["userId", "isRead"])
  .index("by_company", ["companyId"]),

appMeta: defineTable({
  key: v.string(),
  value: v.string(),
})
  .index("by_key", ["key"]),
});