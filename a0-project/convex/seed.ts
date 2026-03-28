import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const clearAll = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "super_admin") throw new Error("Insufficient permissions: super_admin required");
    const tables = [
      "attendance", "attendanceHistory", "attendanceUnlocks", "auditLogs",
      "classes", "enrollments", "grades", "gradeHistory", "inviteCodes",
      "leaderboardPeriods", "notificationLogs", "rooms", "scheduleSlots", "teacherPayments",
      "telegramLinkCodes", "telegramLinks", "transactions",
    ] as const;
    let total = 0;
    for (const t of tables) {
      const docs = await ctx.db.query(t).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        total++;
      }
    }
    return `Cleared ${total} documents. Users and companies preserved.`;
  },
});

// WARNING: This seed function is for DEV/TESTING only.
// Seeded entities use the super admin's companyId for multi-tenant compatibility.
export const run = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const callingUser = await ctx.db.get(userId);
    if (!callingUser || callingUser.role !== "super_admin") throw new Error("Insufficient permissions: super_admin required");
    // Check if already seeded (avoid duplicates)
    const existing = await ctx.db.query("users").withIndex("email", (q: any) => q.eq("email", "teacher1@iqro.test")).first();
    if (existing) return "Already seeded. Skipping.";

    // Find super admin to use as approver
    const superAdmin = await ctx.db.query("users").withIndex("email", (q: any) => q.eq("email", "a.mirzaliev90@gmail.com")).first();
    const approverId = superAdmin?._id;
    if (!approverId) return "Super admin not found. Register first.";

    const seedCompanyId = superAdmin?.companyId;
    if (!seedCompanyId) {
      return "No company found for super admin. Create a company first, then run seed.";
    }

    // Create 2 teachers
    const teacher1Id = await ctx.db.insert("users", {
      name: "Alisher Karimov",
      email: "teacher1@iqro.test",
      role: "teacher",
      language: "ru",
      isActive: true,
    });

    const teacher2Id = await ctx.db.insert("users", {
      name: "Dilnoza Rahimova",
      email: "teacher2@iqro.test",
      role: "teacher",
      language: "uz_latin",
      isActive: true,
    });

    // Create 4 students
    const student1Id = await ctx.db.insert("users", {
      name: "Sardor Aliyev",
      email: "student1@iqro.test",
      role: "student_parent",
      language: "ru",
      isActive: true,
    });

    const student2Id = await ctx.db.insert("users", {
      name: "Madina Yusupova",
      email: "student2@iqro.test",
      role: "student_parent",
      language: "uz_latin",
      isActive: true,
    });

    const student3Id = await ctx.db.insert("users", {
      name: "Bobur Toshmatov",
      email: "student3@iqro.test",
      role: "student_parent",
      language: "uz_cyrillic",
      isActive: true,
    });

    const student4Id = await ctx.db.insert("users", {
      name: "Kamola Nazarova",
      email: "student4@iqro.test",
      role: "student_parent",
      language: "en",
      isActive: true,
    });

    // Create 3 rooms
    const room1Id = await ctx.db.insert("rooms", {
      name: "Room 1",
      capacity: 20,
      isActive: true,
      companyId: seedCompanyId,
    });

    const room2Id = await ctx.db.insert("rooms", {
      name: "Room 2",
      capacity: 15,
      isActive: true,
      companyId: seedCompanyId,
    });

    const room3Id = await ctx.db.insert("rooms", {
      name: "Room 3",
      capacity: 25,
      isActive: true,
      companyId: seedCompanyId,
    });

    // Create 2 sample classes
    const class1Id = await ctx.db.insert("classes", {
      name: "Arabic Basics",
      subjectName: "Arabic Language",
      teacherId: teacher1Id,
      roomId: room1Id,
      gradingSystem: "a_f",
      pricePerClass: 50000,
      scheduleDays: [
        { dayOfWeek: "monday", startTime: "09:00", endTime: "10:30" },
        { dayOfWeek: "wednesday", startTime: "09:00", endTime: "10:30" },
        { dayOfWeek: "friday", startTime: "09:00", endTime: "10:30" },
      ],
      isActive: true,
      companyId: seedCompanyId,
    });

    const class2Id = await ctx.db.insert("classes", {
      name: "Quran Reading",
      subjectName: "Quran Studies",
      teacherId: teacher2Id,
      roomId: room2Id,
      gradingSystem: "1_5",
      pricePerClass: 60000,
      scheduleDays: [
        { dayOfWeek: "tuesday", startTime: "14:00", endTime: "15:30" },
        { dayOfWeek: "thursday", startTime: "14:00", endTime: "15:30" },
      ],
      isActive: true,
      companyId: seedCompanyId,
    });

    // Enroll students in classes
    // Class 1: all 4 students
    for (const studentId of [student1Id, student2Id, student3Id, student4Id]) {
      await ctx.db.insert("enrollments", {
        studentId,
        classId: class1Id,
        status: "approved",
        approvedBy: approverId,
        approvedAt: Date.now(),
        companyId: seedCompanyId,
      });
    }

    // Class 2: students 1 and 3
    for (const studentId of [student1Id, student3Id]) {
      await ctx.db.insert("enrollments", {
        studentId,
        classId: class2Id,
        status: "approved",
        approvedBy: approverId,
        approvedAt: Date.now(),
        companyId: seedCompanyId,
      });
    }

    // Create schedule slots
    for (const day of ["monday", "wednesday", "friday"]) {
      await ctx.db.insert("scheduleSlots", {
        roomId: room1Id,
        classId: class1Id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "10:30",
        companyId: seedCompanyId,
      });
    }

    for (const day of ["tuesday", "thursday"]) {
      await ctx.db.insert("scheduleSlots", {
        roomId: room2Id,
        classId: class2Id,
        dayOfWeek: day,
        startTime: "14:00",
        endTime: "15:30",
        companyId: seedCompanyId,
      });
    }

    // Create leaderboard periods
    await ctx.db.insert("leaderboardPeriods", {
      classId: class1Id,
      periodName: "2025-Q1",
      startDate: "2025-01-01",
      isActive: true,
      companyId: seedCompanyId,
    });

    await ctx.db.insert("leaderboardPeriods", {
      classId: class2Id,
      periodName: "2025-Q1",
      startDate: "2025-01-01",
      isActive: true,
      companyId: seedCompanyId,
    });

    // Log the seed action
    await ctx.db.insert("auditLogs", {
      userId: approverId,
      action: "seed_data",
      entityType: "system",
      details: "Seeded 2 teachers, 4 students, 3 rooms, 2 classes with enrollments",
      timestamp: Date.now(),
      companyId: seedCompanyId,
    });

    return "Seeded: 2 teachers, 4 students, 3 rooms, 2 classes (Arabic Basics MWF 9-10:30, Quran Reading TuTh 14-15:30), enrollments, and schedule slots.";
  },
});