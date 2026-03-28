import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

export const list = query({
args: {},
returns: v.array(v.object({
_id: v.id("rooms"),
name: v.string(),
capacity: v.optional(v.number()),
isActive: v.boolean(),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return [];

const rooms = await ctx.db.query("rooms")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .take(50);
return rooms.map((r: any) => ({
_id: r._id,
name: r.name,
capacity: r.capacity,
isActive: r.isActive,
}));
},
});

export const create = mutation({
args: {
name: v.string(),
capacity: v.optional(v.number()),
},
returns: v.id("rooms"),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
throw new ConvexError("Insufficient permissions");
}
if (!user.companyId) throw new ConvexError("No company");
const roomId = await ctx.db.insert("rooms", {
name: args.name,
capacity: args.capacity,
isActive: true,
companyId: user.companyId,
});

await ctx.db.insert("auditLogs", {
userId,
action: "room_created",
entityType: "room",
entityId: roomId,
details: JSON.stringify({ name: args.name, capacity: args.capacity }),
timestamp: Date.now(),
companyId: user.companyId,
});

return roomId;
},
});

export const update = mutation({
args: {
roomId: v.id("rooms"),
name: v.optional(v.string()),
capacity: v.optional(v.number()),
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
const room = await ctx.db.get(args.roomId);
if (!room || room.companyId !== user.companyId) throw new ConvexError("Not found");
const { roomId, ...updates } = args;
const filtered: Record<string, unknown> = {};
for (const [key, val] of Object.entries(updates)) {
if (val !== undefined) filtered[key] = val;
}
await ctx.db.patch(roomId, filtered);

await ctx.db.insert("auditLogs", {
userId,
action: "room_updated",
entityType: "room",
entityId: roomId,
details: JSON.stringify(filtered),
timestamp: Date.now(),
companyId: user.companyId,
});

return null;
},
});

export const getRoomSchedule = query({
args: { roomId: v.id("rooms") },
returns: v.array(v.object({
_id: v.id("scheduleSlots"),
classId: v.id("classes"),
className: v.optional(v.string()),
teacherName: v.optional(v.string()),
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) throw new ConvexError("Not authenticated");
const room = await ctx.db.get(args.roomId);
if (!room || room.companyId !== user.companyId) throw new ConvexError("Not found");

const slots = await ctx.db
.query("scheduleSlots")
.withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
.take(100);

const result: Array<{
_id: Id<"scheduleSlots">;
classId: Id<"classes">;
className: string | undefined;
teacherName: string | undefined;
dayOfWeek: string;
startTime: string;
endTime: string;
}> = [];

for (const slot of slots) {
const cls = await ctx.db.get(slot.classId);
let teacherName: string | undefined;
if (cls) {
const teacher = await ctx.db.get(cls.teacherId);
teacherName = teacher?.name;
}
result.push({
_id: slot._id,
classId: slot.classId,
className: cls?.name,
teacherName,
dayOfWeek: slot.dayOfWeek,
startTime: slot.startTime,
endTime: slot.endTime,
});
}
return result;
},
});

export const getFullSchedule = query({
args: {},
returns: v.array(v.object({
_id: v.id("scheduleSlots"),
roomId: v.id("rooms"),
roomName: v.optional(v.string()),
classId: v.id("classes"),
className: v.optional(v.string()),
subjectName: v.optional(v.string()),
teacherName: v.optional(v.string()),
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
})),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return [];

const slots = await ctx.db.query("scheduleSlots")
  .withIndex("by_company", (q: any) => q.eq("companyId", user.companyId))
  .take(500);

const result: Array<{
_id: Id<"scheduleSlots">;
roomId: Id<"rooms">;
roomName: string | undefined;
classId: Id<"classes">;
className: string | undefined;
subjectName: string | undefined;
teacherName: string | undefined;
dayOfWeek: string;
startTime: string;
endTime: string;
}> = [];

for (const slot of slots) {
const room = await ctx.db.get(slot.roomId);
const cls = await ctx.db.get(slot.classId);
if (!cls || !cls.isActive) continue;
let teacherName: string | undefined;
let subjectName: string | undefined;
if (cls) {
const teacher = await ctx.db.get(cls.teacherId);
teacherName = teacher?.name;
subjectName = cls.subjectName;
}
result.push({
_id: slot._id,
roomId: slot.roomId,
roomName: room?.name,
classId: slot.classId,
className: cls?.name,
subjectName,
teacherName,
dayOfWeek: slot.dayOfWeek,
startTime: slot.startTime,
endTime: slot.endTime,
});
}
return result;
},
});

export const checkConflicts = query({
args: {
roomId: v.id("rooms"),
dayOfWeek: v.string(),
startTime: v.string(),
endTime: v.string(),
excludeClassId: v.optional(v.id("classes")),
},
returns: v.array(v.object({
classId: v.id("classes"),
className: v.optional(v.string()),
startTime: v.string(),
endTime: v.string(),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) throw new ConvexError("Not authenticated");
const room = await ctx.db.get(args.roomId);
if (!room || room.companyId !== user.companyId) throw new ConvexError("Not found");

const slots = await ctx.db
.query("scheduleSlots")
.withIndex("by_room_and_day", (q: any) =>
q.eq("roomId", args.roomId).eq("dayOfWeek", args.dayOfWeek)
)
.take(100);

const conflicts: Array<{
classId: Id<"classes">;
className: string | undefined;
startTime: string;
endTime: string;
}> = [];

for (const slot of slots) {
if (args.excludeClassId && slot.classId === args.excludeClassId) continue;
if (slot.startTime < args.endTime && slot.endTime > args.startTime) {
const cls = await ctx.db.get(slot.classId);
conflicts.push({
classId: slot.classId,
className: cls?.name,
startTime: slot.startTime,
endTime: slot.endTime,
});
}
}

return conflicts;
},
});