import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ─── Helpers ──────────────────────────────────────────────────────

function generateLinkCode(): string {
return String(Math.floor(1000 + Math.random() * 9000));
}

function generateWebhookSecret(): string {
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let result = "";
for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
return result;
}

// ─── Multi-language Templates ────────────────────────────────────

type TemplateData = Record<string, string | number | undefined>;

const statusLabels: Record<string, Record<string, string>> = {
  present:  { en: "Present",  ru: "Присутствовал",              uz_latin: "Keldi",       uz_cyrillic: "Келди"       },
  absent:   { en: "Absent",   ru: "Отсутствовал",               uz_latin: "Kelmadi",     uz_cyrillic: "Келмади"     },
  late:     { en: "Late",     ru: "Опоздал",                    uz_latin: "Kech keldi",  uz_cyrillic: "Кеч келди"   },
  excused:  { en: "Excused",  ru: "По уважительной причине",    uz_latin: "Uzrli sabab", uz_cyrillic: "Узрли сабаб" },
};

function statusLabel(status: string | undefined, lang: string): string {
  if (!status) return "—";
  return statusLabels[status]?.[lang] ?? statusLabels[status]?.["uz_latin"] ?? status;
}

const T: Record<string, Record<string, (d: TemplateData) => string>> = {
payment_recorded: {
en: (d) => `✅ Payment Received\nFrom: ${d.studentName}\nClass: ${d.className}\nAmount: ${d.amount}\nStatus: Pending confirmation`,
ru: (d) => `✅ Оплата получена\nОт: ${d.studentName}\nКласс: ${d.className}\nСумма: ${d.amount}\nСтатус: Ожидает подтверждения`,
uz_latin: (d) => `✅ To'lov qabul qilindi\nKim: ${d.studentName}\nSinf: ${d.className}\nSumma: ${d.amount}\nHolat: Tasdiqlash kutilmoqda`,
uz_cyrillic: (d) => `✅ Тўлов қабул қилинди\nКим: ${d.studentName}\nСинф: ${d.className}\nСумма: ${d.amount}\nҲолат: Тасдиқлаш кутилмоқда`,
},
payment_confirmed: {
en: (d) => `✅ Payment Confirmed\nStudent: ${d.studentName}\nClass: ${d.className}\nAmount: ${d.amount}`,
ru: (d) => `✅ Оплата подтверждена\nСтудент: ${d.studentName}\nКласс: ${d.className}\nСумма: ${d.amount}`,
uz_latin: (d) => `✅ To'lov tasdiqlandi\nTalaba: ${d.studentName}\nSinf: ${d.className}\nSumma: ${d.amount}`,
uz_cyrillic: (d) => `✅ Тўлов тасдиқланди\nТалаба: ${d.studentName}\nСинф: ${d.className}\nСумма: ${d.amount}`,
},
attendance_marked: {
en: (d) => `📚 Attendance Recorded\nClass: ${d.className}\nDate: ${d.date}\nStatus: ${statusLabel(d.status as string, "en")}${d.chargeAmount ? `\n💰 Charge: ${d.chargeAmount} UZS` : ''}`,
ru: (d) => `📚 Посещаемость отмечена\nКласс: ${d.className}\nДата: ${d.date}\nСтатус: ${statusLabel(d.status as string, "ru")}${d.chargeAmount ? `\n💰 Начислено: ${d.chargeAmount} UZS` : ''}`,
uz_latin: (d) => `📚 Davomat qayd etildi\nSinf: ${d.className}\nSana: ${d.date}\nHolat: ${statusLabel(d.status as string, "uz_latin")}${d.chargeAmount ? `\n💰 Hisoblandi: ${d.chargeAmount} UZS` : ''}`,
uz_cyrillic: (d) => `📚 Давомат қайд этилди\nСинф: ${d.className}\nСана: ${d.date}\nҲолат: ${statusLabel(d.status as string, "uz_cyrillic")}${d.chargeAmount ? `\n💰 Ҳисобланди: ${d.chargeAmount} UZS` : ''}`,
},
attendance_marked_batch: {
en: (d) => `📚 Attendance Recorded\nClass: ${d.className}\nDate: ${d.date}\nStudents: ${d.count}`,
ru: (d) => `📚 Посещаемость отмечена\nКласс: ${d.className}\nДата: ${d.date}\nСтудентов: ${d.count}`,
uz_latin: (d) => `📚 Davomat qayd etildi\nSinf: ${d.className}\nSana: ${d.date}\nTalabalar: ${d.count}`,
uz_cyrillic: (d) => `📚 Давомат қайд этилди\nСинф: ${d.className}\nСана: ${d.date}\nТалабалар: ${d.count}`,
},
grade_received: {
en: (d) => `✏️ ${d.oldGrade ? 'Grade Updated' : 'New Grade'}\nClass: ${d.className}\nGrade: ${d.grade}${d.oldGrade ? ` (was: ${d.oldGrade})` : ''}${d.period ? `\nPeriod: ${d.period}` : ''}${d.assignmentName ? `\nAssignment: ${d.assignmentName}` : ''}`,
ru: (d) => `✏️ ${d.oldGrade ? 'Оценка изменена' : 'Новая оценка'}\nКласс: ${d.className}\nОценка: ${d.grade}${d.oldGrade ? ` (было: ${d.oldGrade})` : ''}${d.period ? `\nПериод: ${d.period}` : ''}${d.assignmentName ? `\nЗадание: ${d.assignmentName}` : ''}`,
uz_latin: (d) => `✏️ ${d.oldGrade ? "Baho o'zgartirildi" : 'Yangi baho'}\nSinf: ${d.className}\nBaho: ${d.grade}${d.oldGrade ? ` (oldingi: ${d.oldGrade})` : ''}${d.period ? `\nDavr: ${d.period}` : ''}${d.assignmentName ? `\nTopshiriq: ${d.assignmentName}` : ''}`,
uz_cyrillic: (d) => `✏️ ${d.oldGrade ? 'Баҳо ўзгартирилди' : 'Янги баҳо'}\nСинф: ${d.className}\nБаҳо: ${d.grade}${d.oldGrade ? ` (олдинги: ${d.oldGrade})` : ''}${d.period ? `\nДавр: ${d.period}` : ''}${d.assignmentName ? `\nТопшириқ: ${d.assignmentName}` : ''}`,
},
payment_reminder: {
en: (d) => `💰 Payment Reminder\nStudent: ${d.studentName}\nOutstanding: ${d.amount}\nPlease arrange payment.`,
ru: (d) => `💰 Напоминание об оплате\nСтудент: ${d.studentName}\nЗадолженность: ${d.amount}\nПожалуйста, произведите оплату.`,
uz_latin: (d) => `💰 To'lov eslatmasi\nTalaba: ${d.studentName}\nQarzdorlik: ${d.amount}\nIltimos, to'lovni amalga oshiring.`,
uz_cyrillic: (d) => `💰 Тўлов эслатмаси\nТалаба: ${d.studentName}\nҚарздорлик: ${d.amount}\nИлтимос, тўловни амалга оширинг.`,
},
class_cancelled: {
en: (d) => `⚠️ Class Cancelled\nClass: ${d.className}\nDate: ${d.date}\nReason: ${d.reason || 'Teacher absent'}`,
ru: (d) => `⚠️ Занятие отменено\nКласс: ${d.className}\nДата: ${d.date}\nПричина: ${d.reason || 'Преподаватель отсутствует'}`,
uz_latin: (d) => `⚠️ Dars bekor qilindi\nSinf: ${d.className}\nSana: ${d.date}\nSabab: ${d.reason || "O'qituvchi kelmadi"}`,
uz_cyrillic: (d) => `⚠️ Дарс бекор қилинди\nСинф: ${d.className}\nСана: ${d.date}\nСабаб: ${d.reason || 'Ўқитувчи келмади'}`,
},
student_enrolled: {
en: (d) => `📖 Enrolled in Class\nClass: ${d.className}\nStudent: ${d.studentName}`,
ru: (d) => `📖 Зачисление в класс\nКласс: ${d.className}\nУченик: ${d.studentName}`,
uz_latin: (d) => `📖 Sinfga yozildi\nSinf: ${d.className}\nO'quvchi: ${d.studentName}`,
uz_cyrillic: (d) => `📖 Синфга ёзилди\nСинф: ${d.className}\nЎқувчи: ${d.studentName}`,
},
student_unenrolled: {
en: (d) => `📤 Removed from Class\nClass: ${d.className}`,
ru: (d) => `📤 Отчислен из класса\nКласс: ${d.className}`,
uz_latin: (d) => `📤 Sinfdan chiqarildi\nSinf: ${d.className}`,
uz_cyrillic: (d) => `📤 Синфдан чиқарилди\nСинф: ${d.className}`,
},
enrollment_approved: {
en: (d) => `✅ Enrollment Approved\nClass: ${d.className}`,
ru: (d) => `✅ Заявка одобрена\nКласс: ${d.className}`,
uz_latin: (d) => `✅ Ariza tasdiqlandi\nSinf: ${d.className}`,
uz_cyrillic: (d) => `✅ Ариза тасдиқланди\nСинф: ${d.className}`,
},
enrollment_rejected: {
en: (d) => `❌ Enrollment Rejected\nClass: ${d.className}`,
ru: (d) => `❌ Заявка отклонена\nКласс: ${d.className}`,
uz_latin: (d) => `❌ Ariza rad etildi\nSinf: ${d.className}`,
uz_cyrillic: (d) => `❌ Ариза рад этилди\nСинф: ${d.className}`,
},
teacher_payment: {
en: (d) => `💵 Payment Received\nAmount: ${d.amount}\nNote: ${d.note || '-'}`,
ru: (d) => `💵 Выплата получена\nСумма: ${d.amount}\nПримечание: ${d.note || '-'}`,
uz_latin: (d) => `💵 To'lov olindi\nSumma: ${d.amount}\nIzoh: ${d.note || '-'}`,
uz_cyrillic: (d) => `💵 Тўлов олинди\nСумма: ${d.amount}\nИзоҳ: ${d.note || '-'}`,
},
payment_reversed: {
en: (d) => `↩️ Payment Reversed\nAmount: ${d.amount}\nClass: ${d.className}`,
ru: (d) => `↩️ Оплата отменена\nСумма: ${d.amount}\nКласс: ${d.className}`,
uz_latin: (d) => `↩️ To'lov bekor qilindi\nSumma: ${d.amount}\nSinf: ${d.className}`,
uz_cyrillic: (d) => `↩️ Тўлов бекор қилинди\nСумма: ${d.amount}\nСинф: ${d.className}`,
},
};

function renderTemplate(eventType: string, lang: string, data: TemplateData): string {
const templates = T[eventType];
if (!templates) return `Notification: ${eventType}`;
return (templates[lang] || templates["uz_latin"])(data);
}

const langLabels: Record<string, string> = {
en: "🇬🇧 English",
ru: "🇷🇺 Русский",
uz_latin: "🇺🇿 O'zbekcha",
uz_cyrillic: "🇺🇿 Ўзбекча",
};

const langConfirm: Record<string, string> = {
en: "✅ Language set to English",
ru: "✅ Язык установлен: русский",
uz_latin: "✅ Til tanlandi: o'zbekcha",
uz_cyrillic: "✅ Тил танланди: ўзбекча",
};

// ─── Bot conversation messages ───────────────────────────────────

const BOT_MSG: Record<string, Record<string, string>> = {
welcome: {
en: "👋 Welcome to the Learning Center!\nLet's get you registered.",
ru: "👋 Добро пожаловать в учебный центр!\nДавайте вас зарегистрируем.",
uz_latin: "👋 O'quv markaziga xush kelibsiz!\nKeling, ro'yxatdan o'tamiz.",
uz_cyrillic: "👋 Ўқув марказига хуш келибсиз!\nКелинг, рўйхатдан ўтамиз.",
},
ask_phone: {
en: "📱 Please share your phone number using the button below.",
ru: "📱 Пожалуйста, поделитесь номером телефона кнопкой ниже.",
uz_latin: "📱 Iltimos, telefon raqamingizni pastdagi tugma orqali yuboring.",
uz_cyrillic: "📱 Илтимос, телефон рақамингизни пастдаги тугма орқали юборинг.",
},
ask_parent_name: {
en: "👤 Please enter the parent's full name:",
ru: "👤 Введите ФИО родителя:",
uz_latin: "👤 Ota-ona to'liq ismini kiriting:",
uz_cyrillic: "👤 Ота-она тўлиқ исмини киритинг:",
},
ask_student_name: {
en: "🎓 Please enter the student's full name:",
ru: "🎓 Введите ФИО ученика:",
uz_latin: "🎓 O'quvchi to'liq ismini kiriting:",
uz_cyrillic: "🎓 Ўқувчи тўлиқ исмини киритинг:",
},
ask_subject: {
en: "📚 Select the subject:",
ru: "📚 Выберите предмет:",
uz_latin: "📚 Fanni tanlang:",
uz_cyrillic: "📚 Фанни танланг:",
},
ask_class: {
en: "📖 Select the class:",
ru: "📖 Выберите класс:",
uz_latin: "📖 Sinfni tanlang:",
uz_cyrillic: "📖 Синфни танланг:",
},
submitted: {
en: "✅ Your registration request has been submitted!\nAn administrator will review it shortly.\nYou will receive a notification once approved.",
ru: "✅ Ваша заявка на регистрацию отправлена!\nАдминистратор рассмотрит её в ближайшее время.\nВы получите уведомление после одобрения.",
uz_latin: "✅ Ro'yxatdan o'tish so'rovi yuborildi!\nAdministrator tez orada ko'rib chiqadi.\nTasdiqlangandan so'ng xabar olasiz.",
uz_cyrillic: "✅ Рўйхатдан ўтиш сўрови юборилди!\nАдминистратор тез орада кўриб чиқади.\nТасдиқлангандан сўнг хабар оласиз.",
},
approved: {
en: "🎉 Your registration has been approved! Welcome to the center.\nYou will now receive notifications about attendance, grades, and payments.",
ru: "🎉 Ваша регистрация одобрена! Добро пожаловать в центр.\nТеперь вы будете получать уведомления о посещаемости, оценках и оплате.",
uz_latin: "🎉 Ro'yxatdan o'tish tasdiqlandi! Markazga xush kelibsiz.\nEndi davomat, baholar va to'lovlar haqida xabar olasiz.",
uz_cyrillic: "🎉 Рўйхатдан ўтиш тасдиқланди! Марказга хуш келибсиз.\nЭнди давомат, баҳолар ва тўловлар ҳақида хабар оласиз.",
},
rejected: {
en: "❌ Your registration request was not approved.\nPlease contact the center for more information.",
ru: "❌ Ваша заявка не была одобрена.\nПожалуйста, свяжитесь с центром для уточнения.",
uz_latin: "❌ Ro'yxatdan o'tish so'rovi rad etildi.\nIltimos, markaz bilan bog'laning.",
uz_cyrillic: "❌ Рўйхатдан ўтиш сўрови рад этилди.\nИлтимос, марказ билан боғланинг.",
},
already_linked: {
en: "✅ Your account is already linked!\n\nCommands:\n/balance - 💰 Balance\n/courses - 📖 Courses\n/grades - ✏️ Grades\n/language - 🌐 Language\n/stop - 🔓 Disconnect",
ru: "✅ Ваш аккаунт уже привязан!\n\nКоманды:\n/balance - 💰 Баланс\n/courses - 📖 Курсы\n/grades - ✏️ Оценки\n/language - 🌐 Язык\n/stop - 🔓 Отключить",
uz_latin: "✅ Akkauntingiz allaqachon ulangan!\n\nBuyruqlar:\n/balance - 💰 Balans\n/courses - 📖 Kurslar\n/grades - ✏️ Baholar\n/language - 🌐 Til\n/stop - 🔓 Uzish",
uz_cyrillic: "✅ Аккаунтингиз аллақачон уланган!\n\nБуйруқлар:\n/balance - 💰 Баланс\n/courses - 📖 Курслар\n/grades - ✏️ Баҳолар\n/language - 🌐 Тил\n/stop - 🔓 Узиш",
},
pending_exists: {
en: "⏳ Your registration is being reviewed. Please wait for admin approval.",
ru: "⏳ Ваша заявка на рассмотрении. Пожалуйста, ожидайте одобрения.",
uz_latin: "⏳ Arizangiz ko'rib chiqilmoqda. Iltimos, tasdiqlashni kuting.",
uz_cyrillic: "⏳ Аризангиз кўриб чиқилмоқда. Илтимос, тасдиқлашни кутинг.",
},
choose_language: {
en: "🌐 Choose your language:",
ru: "🌐 Выберите язык:",
uz_latin: "🌐 Tilni tanlang:",
uz_cyrillic: "🌐 Тилни танланг:",
},
invalid_code: {
en: "⚠️ Invalid or expired code. Send /start to register.",
ru: "⚠️ Неверный или просроченный код. Отправьте /start для регистрации.",
uz_latin: "⚠️ Noto'g'ri yoki muddati o'tgan kod. Ro'yxatdan o'tish uchun /start yuboring.",
uz_cyrillic: "⚠️ Нотўғри ёки муддати ўтган код. Рўйхатдан ўтиш учун /start юборинг.",
},
account_linked: {
en: "✅ Account linked! Use /start to see commands.",
ru: "✅ Аккаунт привязан! Используйте /start для просмотра команд.",
uz_latin: "✅ Akkaunt ulandi! Buyruqlarni ko'rish uchun /start yuboring.",
uz_cyrillic: "✅ Аккаунт уланди! Буйруқларни кўриш учун /start юборинг.",
},
send_start: {
en: "Send /start to begin.",
ru: "Отправьте /start чтобы начать.",
uz_latin: "/start yuboring.",
uz_cyrillic: "/start юборинг.",
},
choose_language_short: {
en: "🌐 Choose language:",
ru: "🌐 Выберите язык:",
uz_latin: "🌐 Tilni tanlang:",
uz_cyrillic: "🌐 Тилни танланг:",
},
share_phone: {
en: "📱 Share Phone Number",
ru: "📱 Поделиться номером",
uz_latin: "📱 Telefon raqamni yuborish",
uz_cyrillic: "📱 Телефон рақамни юбориш",
},
};

function botMsg(key: string, lang: string): string {
return BOT_MSG[key]?.[lang] || BOT_MSG[key]?.["uz_latin"] || key;
}

// ─── Internal Queries ────────────────────────────────────────────

export const getUserForAuth = internalQuery({
args: { userId: v.id("users") },
returns: v.union(v.object({ _id: v.id("users"), role: v.optional(v.string()), companyId: v.optional(v.id("companies")), name: v.optional(v.string()) }), v.null()),
handler: async (ctx, args) => {
const user = await ctx.db.get(args.userId);
if (!user) return null;
return { _id: user._id, role: user.role, companyId: user.companyId, name: user.name };
},
});

export const getCompanyToken = internalQuery({
args: { companyId: v.id("companies") },
returns: v.union(v.object({ token: v.string() }), v.null()),
handler: async (ctx, args) => {
const company = await ctx.db.get(args.companyId);
if (!company || !company.telegramBotToken) return null;
return { token: company.telegramBotToken };
},
});

export const findTenantByWebhookSecret = internalQuery({
args: { secret: v.string() },
returns: v.union(v.id("companies"), v.null()),
handler: async (ctx, args) => {
const company = await ctx.db.query("companies")
.withIndex("by_telegramWebhookSecret", (q: any) => q.eq("telegramWebhookSecret", args.secret))
.first();
if (!company || !company.telegramEnabled) return null;
return company._id;
},
});

export const getActiveClassesForTenant = internalQuery({
args: { tenantId: v.id("companies") },
returns: v.array(v.object({ _id: v.id("classes"), name: v.string(), subjectName: v.string() })),
handler: async (ctx, args) => {
const classes = await ctx.db.query("classes")
.withIndex("by_company", (q: any) => q.eq("companyId", args.tenantId))
.take(200);
return classes
.filter((c: any) => c.isActive)
.map((c: any) => ({ _id: c._id, name: c.name, subjectName: c.subjectName }));
},
});

// ─── Client Queries ──────────────────────────────────────────────

export const getTelegramConfig = query({
args: {},
returns: v.union(v.object({ telegramEnabled: v.boolean(), telegramBotUsername: v.optional(v.string()), hasToken: v.boolean() }), v.null()),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return null;
const user = await ctx.db.get(userId);
if (!user || !user.companyId || user.role !== "super_admin") return null;
const company = await ctx.db.get(user.companyId);
if (!company) return null;
return { telegramEnabled: company.telegramEnabled ?? false, telegramBotUsername: company.telegramBotUsername, hasToken: !!company.telegramBotToken };
},
});

export const getLinkedUsersCount = query({
args: {},
returns: v.number(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return 0;
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return 0;
const links = await ctx.db.query("telegramLinks").withIndex("by_tenant", (q: any) => q.eq("tenantId", user.companyId!)).take(100);
return links.filter((l: any) => !l.blockedAt).length;
},
});

export const getNotificationLogs = query({
args: { limit: v.optional(v.number()) },
returns: v.array(v.object({ _id: v.id("notificationLogs"), _creationTime: v.number(), userName: v.optional(v.string()), eventType: v.string(), status: v.string(), attempts: v.number(), lastError: v.optional(v.string()), sentAt: v.optional(v.number()) })),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId || (user.role !== "super_admin" && user.role !== "admin")) return [];
const logs = await ctx.db.query("notificationLogs").withIndex("by_tenant", (q: any) => q.eq("tenantId", user.companyId!)).order("desc").take(args.limit ?? 50);
const result: any[] = [];
for (const log of logs) {
const u = await ctx.db.get(log.userId);
result.push({ _id: log._id, _creationTime: log._creationTime, userName: u?.name, eventType: log.eventType, status: log.status, attempts: log.attempts, lastError: log.lastError, sentAt: log.sentAt });
}
return result;
},
});

export const getTelegramLinkStatus = query({
args: {},
returns: v.union(v.object({ linked: v.boolean(), blocked: v.boolean(), telegramEnabled: v.boolean(), botUsername: v.optional(v.string()) }), v.null()),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return null;
const user = await ctx.db.get(userId);
if (!user || !user.companyId) return null;
const company = await ctx.db.get(user.companyId);
if (!company) return null;
if (!company.telegramEnabled) return { linked: false, blocked: false, telegramEnabled: false };
const link = await ctx.db.query("telegramLinks").withIndex("by_user_and_tenant", (q: any) => q.eq("userId", userId).eq("tenantId", user.companyId!)).first();
return { linked: !!link, blocked: !!link?.blockedAt, telegramEnabled: true, botUsername: company.telegramBotUsername };
},
});

// ─── Telegram Registration Requests (Admin) ─────────────────────

export const listRegistrationRequests = query({
args: { status: v.optional(v.string()) },
returns: v.array(v.object({
_id: v.id("telegramRegistrations"),
_creationTime: v.number(),
chatId: v.string(),
language: v.optional(v.string()),
phone: v.optional(v.string()),
parentName: v.optional(v.string()),
studentName: v.optional(v.string()),
subjectName: v.optional(v.string()),
className: v.optional(v.string()),
classId: v.optional(v.id("classes")),
step: v.string(),
status: v.string(),
reviewedBy: v.optional(v.id("users")),
reviewedAt: v.optional(v.number()),
})),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId || (user.role !== "super_admin" && user.role !== "admin")) return [];

let reqs;
if (args.status) {
reqs = await ctx.db.query("telegramRegistrations")
.withIndex("by_tenant_and_status", (q: any) => q.eq("tenantId", user.companyId!).eq("status", args.status!))
.order("desc").take(100);
} else {
reqs = await ctx.db.query("telegramRegistrations")
.withIndex("by_tenant", (q: any) => q.eq("tenantId", user.companyId!))
.order("desc").take(100);
}

return reqs.map((r: any) => ({
_id: r._id,
_creationTime: r._creationTime,
chatId: r.chatId,
language: r.language,
phone: r.phone,
parentName: r.parentName,
studentName: r.studentName,
subjectName: r.subjectName,
className: r.className,
classId: r.classId,
step: r.step,
status: r.status,
reviewedBy: r.reviewedBy,
reviewedAt: r.reviewedAt,
}));
},
});

export const getPendingRegistrationCount = query({
args: {},
returns: v.number(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) return 0;
const user = await ctx.db.get(userId);
if (!user || !user.companyId || (user.role !== "super_admin" && user.role !== "admin")) return 0;
const reqs = await ctx.db.query("telegramRegistrations")
.withIndex("by_tenant_and_status", (q: any) => q.eq("tenantId", user.companyId!).eq("status", "pending"))
.take(100);
return reqs.filter((r: any) => r.step === "submitted").length;
},
});

export const approveRegistration = mutation({
args: { registrationId: v.id("telegramRegistrations") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId || (user.role !== "super_admin" && user.role !== "admin")) {
throw new Error("Not authorized");
}

const reg = await ctx.db.get(args.registrationId);
if (!reg || reg.status !== "pending" || reg.step !== "submitted") {
throw new Error("Invalid registration");
}

// Create user in the system
const email = `tg_${reg.chatId}@telegram.local`;
const newUserId = await ctx.db.insert("users", {
name: reg.studentName || reg.parentName || "Telegram User",
email,
role: "student_parent",
isActive: true,
isArchived: false,
companyId: user.companyId,
phone: reg.phone,
language: (reg.language as any) || "uz_latin",
});

// Create telegram link
await ctx.db.insert("telegramLinks", {
userId: newUserId,
tenantId: user.companyId,
chatId: reg.chatId,
language: reg.language,
createdAt: Date.now(),
});

// Auto-enroll in selected class if classId is set
if (reg.classId) {
const cls = await ctx.db.get(reg.classId);
if (cls && cls.isActive) {
await ctx.db.insert("enrollments", {
studentId: newUserId,
classId: reg.classId,
status: "approved",
approvedBy: userId,
approvedAt: Date.now(),
companyId: user.companyId,
});
}
}

// Update registration
await ctx.db.patch(args.registrationId, {
status: "approved",
step: "approved",
createdUserId: newUserId,
reviewedBy: userId,
reviewedAt: Date.now(),
});

// Notify the user via Telegram
const lang = reg.language || "uz_latin";
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId: user.companyId,
chatId: reg.chatId,
text: botMsg("approved", lang),
});

// Audit log
await ctx.db.insert("auditLogs", {
userId,
action: "approve_telegram_registration",
entityType: "telegramRegistration",
entityId: args.registrationId,
details: JSON.stringify({ studentName: reg.studentName, phone: reg.phone }),
timestamp: Date.now(),
companyId: user.companyId,
});

return null;
},
});

export const rejectRegistration = mutation({
args: { registrationId: v.id("telegramRegistrations") },
returns: v.null(),
handler: async (ctx, args) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId || (user.role !== "super_admin" && user.role !== "admin")) {
throw new Error("Not authorized");
}

const reg = await ctx.db.get(args.registrationId);
if (!reg || reg.status !== "pending") throw new Error("Invalid registration");

await ctx.db.patch(args.registrationId, {
status: "rejected",
step: "rejected",
reviewedBy: userId,
reviewedAt: Date.now(),
});

const lang = reg.language || "uz_latin";
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId: reg.tenantId,
chatId: reg.chatId,
text: botMsg("rejected", lang),
});

return null;
},
});

// ─── User Mutations ──────────────────────────────────────────────

export const generateTelegramLinkCode = mutation({
args: {},
returns: v.object({ code: v.string(), expiresAt: v.number(), botUsername: v.optional(v.string()) }),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) throw new Error("No company");
const company = await ctx.db.get(user.companyId);
if (!company || !company.telegramEnabled || !company.telegramBotToken) throw new Error("Telegram not enabled");
let code = generateLinkCode();
let existing = await ctx.db.query("telegramLinkCodes").withIndex("by_code_and_tenant", (q: any) => q.eq("code", code).eq("tenantId", user.companyId!)).first();
let attempts = 0;
while (existing && !existing.usedAt && existing.expiresAt > Date.now() && attempts < 10) {
code = generateLinkCode();
existing = await ctx.db.query("telegramLinkCodes").withIndex("by_code_and_tenant", (q: any) => q.eq("code", code).eq("tenantId", user.companyId!)).first();
attempts++;
}
const expiresAt = Date.now() + 10 * 60 * 1000;
await ctx.db.insert("telegramLinkCodes", { userId, tenantId: user.companyId, code, expiresAt });
return { code, expiresAt, botUsername: company.telegramBotUsername };
},
});

export const unlinkTelegram = mutation({
args: {},
returns: v.null(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || !user.companyId) throw new Error("No company");
const link = await ctx.db.query("telegramLinks").withIndex("by_user_and_tenant", (q: any) => q.eq("userId", userId).eq("tenantId", user.companyId!)).first();
if (link) await ctx.db.delete(link._id);
return null;
},
});

export const disableTelegram = mutation({
args: {},
returns: v.null(),
handler: async (ctx) => {
const userId = await auth.getUserId(ctx);
if (!userId) throw new Error("Not authenticated");
const user = await ctx.db.get(userId);
if (!user || user.role !== "super_admin" || !user.companyId) throw new Error("Not authorized");
const company = await ctx.db.get(user.companyId);
if (!company) throw new Error("Company not found");
// Schedule webhook removal before clearing the token
if (company.telegramBotToken) {
await ctx.scheduler.runAfter(0, internal.telegram.removeWebhook, { botToken: company.telegramBotToken });
}
await ctx.db.patch(user.companyId, {
telegramEnabled: false,
telegramBotToken: undefined,
telegramBotUsername: undefined,
telegramWebhookSecret: undefined,
});
return null;
},
});

// ─── Webhook Message Processing ──────────────────────────────────

export const processWebhookMessage = internalMutation({
args: {
tenantId: v.id("companies"),
chatId: v.string(),
messageText: v.optional(v.string()),
contactPhone: v.optional(v.string()),
callbackData: v.optional(v.string()),
callbackQueryId: v.optional(v.string()),
},
returns: v.object({ action: v.string(), userId: v.optional(v.id("users")) }),
handler: async (ctx, args) => {
const { tenantId, chatId, callbackData, callbackQueryId, contactPhone } = args;

// ── Check if user is already linked ──
const existingLink = await ctx.db.query("telegramLinks")
.withIndex("by_chat", (q: any) => q.eq("chatId", chatId))
.first();

// ── Check if there's an active registration ──
const existingReg = await ctx.db.query("telegramRegistrations")
.withIndex("by_chat", (q: any) => q.eq("chatId", chatId))
.first();

// ── Handle callback queries (inline buttons) ──
if (callbackData && callbackQueryId) {
// Language selection for linked users
if (callbackData.startsWith("lang:") && existingLink && existingLink.tenantId === tenantId) {
const newLang = callbackData.replace("lang:", "");
await ctx.db.patch(existingLink._id, { language: newLang });
await ctx.scheduler.runAfter(0, internal.telegram.answerCallbackAndSend, {
tenantId, chatId, callbackQueryId,
text: langConfirm[newLang] || langConfirm["uz_latin"],
});
return { action: "language_changed" };
}

// Start choice: "I have a code" or "Register new"
if (callbackData === "start_choice:code") {
await ctx.scheduler.runAfter(0, internal.telegram.answerCallback, { tenantId, callbackQueryId });
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: "🔑 Send your 4-digit code from the app:\n\n🔑 Отправьте 4-значный код из приложения:\n\n🔑 Ilovadagi 4 raqamli kodni yuboring:",
});
return { action: "awaiting_code" };
}
if (callbackData === "start_choice:register") {
// Delete old registration if exists
const oldReg = await ctx.db.query("telegramRegistrations")
.withIndex("by_chat", (q: any) => q.eq("chatId", chatId))
.first();
if (oldReg) await ctx.db.delete(oldReg._id);
// Create new registration
await ctx.db.insert("telegramRegistrations", {
tenantId,
chatId,
step: "awaiting_language",
status: "pending",
});
await ctx.scheduler.runAfter(0, internal.telegram.answerCallback, { tenantId, callbackQueryId });
await ctx.scheduler.runAfter(0, internal.telegram.sendRegistrationLanguageKeyboard, { tenantId, chatId });
return { action: "reg_started" };
}

// Registration flow: language selection
if (callbackData.startsWith("reg_lang:") && existingReg && existingReg.step === "awaiting_language") {
const lang = callbackData.replace("reg_lang:", "");
await ctx.db.patch(existingReg._id, { language: lang, step: "awaiting_phone" });
await ctx.scheduler.runAfter(0, internal.telegram.answerCallback, { tenantId, callbackQueryId });
await ctx.scheduler.runAfter(0, internal.telegram.sendPhoneRequest, {
tenantId, chatId, text: botMsg("ask_phone", lang), language: lang,
});
return { action: "reg_lang_set" };
}

// Registration flow: subject selection
if (callbackData.startsWith("reg_subject:") && existingReg && existingReg.step === "awaiting_subject") {
const subjectName = callbackData.replace("reg_subject:", "");
const lang = existingReg.language || "uz_latin";
await ctx.db.patch(existingReg._id, { subjectName, step: "awaiting_class" });
await ctx.scheduler.runAfter(0, internal.telegram.answerCallback, { tenantId, callbackQueryId });
// Send class selection for this subject
await ctx.scheduler.runAfter(0, internal.telegram.sendClassSelection, {
tenantId, chatId, subjectName, text: botMsg("ask_class", lang),
});
return { action: "reg_subject_set" };
}

// Registration flow: class selection
if (callbackData.startsWith("reg_class:") && existingReg && existingReg.step === "awaiting_class") {
const classId = callbackData.replace("reg_class:", "") as Id<"classes">;
const lang = existingReg.language || "uz_latin";
const cls = await ctx.db.get(classId);
await ctx.db.patch(existingReg._id, {
classId,
className: cls?.name,
step: "submitted",
});
await ctx.scheduler.runAfter(0, internal.telegram.answerCallback, { tenantId, callbackQueryId });
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("submitted", lang),
});
return { action: "reg_submitted" };
}

return { action: "unknown_callback" };
}

// ── Handle phone contact sharing ──
if (contactPhone && existingReg && existingReg.step === "awaiting_phone") {
const lang = existingReg.language || "uz_latin";
await ctx.db.patch(existingReg._id, { phone: contactPhone, step: "awaiting_parent_name" });
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("ask_parent_name", lang),
});
return { action: "reg_phone_received" };
}

// ── Handle text messages ──
const text = (args.messageText || "").trim();
if (!text) return { action: "no_text" };

// ── LINKED USER: handle commands ──
if (existingLink && existingLink.tenantId === tenantId) {
if (text.startsWith("/")) {
const command = text.split(" ")[0].split("@")[0].toLowerCase();
const lang = existingLink.language || "uz_latin";

switch (command) {
case "/start":
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("already_linked", lang),
});
return { action: "start" };
case "/language":
await ctx.scheduler.runAfter(0, internal.telegram.sendLanguageKeyboard, { tenantId, chatId, language: lang });
return { action: "language_menu" };
case "/balance":
await ctx.scheduler.runAfter(0, internal.telegram.handleBalanceCommand, {
tenantId, userId: existingLink.userId, chatId, language: lang,
});
return { action: "balance" };
case "/courses":
await ctx.scheduler.runAfter(0, internal.telegram.handleCoursesCommand, {
tenantId, userId: existingLink.userId, chatId, language: lang,
});
return { action: "courses" };
case "/grades":
await ctx.scheduler.runAfter(0, internal.telegram.handleGradesCommand, {
tenantId, userId: existingLink.userId, chatId, language: lang,
});
return { action: "grades" };
case "/stop":
case "/unlink":
await ctx.db.delete(existingLink._id);
const unlinkMsg: Record<string, string> = {
en: "🔓 Account disconnected. Send /start to reconnect.",
ru: "🔓 Аккаунт отключён. Отправьте /start для повторного подключения.",
uz_latin: "🔓 Akkaunt uzildi. Qayta ulash uchun /start yuboring.",
uz_cyrillic: "🔓 Аккаунт узилди. Қайта улаш учун /start юборинг.",
};
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: unlinkMsg[lang] || unlinkMsg["uz_latin"],
});
return { action: "unlinked" };
default:
return { action: "unknown_command" };
}
}
return { action: "ignored" };
}

// ── UNLINKED USER: registration flow ──

// /start: Ask user if they have a link code or want to register
if (text.startsWith("/start") || text === "/start") {
// Check for existing pending registration
if (existingReg && existingReg.status === "pending" && existingReg.step === "submitted") {
const lang = existingReg.language || "uz_latin";
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("pending_exists", lang),
});
return { action: "pending_exists" };
}

// Delete old rejected/approved registration if exists
if (existingReg) {
await ctx.db.delete(existingReg._id);
}

// Show choice: link existing account or register new
await ctx.scheduler.runAfter(0, internal.telegram.sendStartChoiceKeyboard, { tenantId, chatId });
return { action: "start_choice" };
}

// 4-digit code linking (legacy support for app users)
if (/^\d{4}$/.test(text)) {
const code = text;
const linkCode = await ctx.db.query("telegramLinkCodes")
.withIndex("by_code_and_tenant", (q: any) => q.eq("code", code).eq("tenantId", tenantId))
.first();

if (!linkCode || linkCode.expiresAt < Date.now() || linkCode.usedAt) {
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("invalid_code", "uz_latin"),
});
return { action: "invalid_code" };
}

await ctx.db.patch(linkCode._id, { usedAt: Date.now() });
await ctx.db.insert("telegramLinks", {
userId: linkCode.userId,
tenantId,
chatId,
language: "uz_latin",
createdAt: Date.now(),
});

await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("account_linked", "uz_latin"),
});
return { action: "linked", userId: linkCode.userId };
}

// ── Registration conversation steps (text input) ──
if (existingReg && existingReg.status === "pending") {
const lang = existingReg.language || "uz_latin";

if (existingReg.step === "awaiting_parent_name") {
await ctx.db.patch(existingReg._id, { parentName: text, step: "awaiting_student_name" });
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("ask_student_name", lang),
});
return { action: "reg_parent_name" };
}

if (existingReg.step === "awaiting_student_name") {
await ctx.db.patch(existingReg._id, { studentName: text, step: "awaiting_subject" });
// Send subject inline buttons
await ctx.scheduler.runAfter(0, internal.telegram.sendSubjectSelection, {
tenantId, chatId, text: botMsg("ask_subject", lang),
});
return { action: "reg_student_name" };
}

if (existingReg.step === "awaiting_phone") {
// User typed phone manually instead of sharing contact
if (/^\+?\d{9,15}$/.test(text.replace(/[\s\-()]/g, ""))) {
await ctx.db.patch(existingReg._id, { phone: text, step: "awaiting_parent_name" });
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("ask_parent_name", lang),
});
return { action: "reg_phone_manual" };
}
await ctx.scheduler.runAfter(0, internal.telegram.sendPhoneRequest, {
tenantId, chatId, text: botMsg("ask_phone", lang), language: lang,
});
return { action: "reg_phone_retry" };
}
}

// Default: suggest /start
await ctx.scheduler.runAfter(0, internal.telegram.sendSimpleMessage, {
tenantId, chatId, text: botMsg("send_start", "uz_latin"),
});
return { action: "ignored" };
},
});

// ─── Internal Actions (Telegram API calls) ───────────────────────

export const sendSimpleMessage = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), text: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: args.text, parse_mode: "HTML" }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const sendLanguageKeyboard = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), language: v.optional(v.string()) },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const lang = args.language || "uz_latin";
const keyboard = {
inline_keyboard: [
[{ text: "🇷🇺 Русский", callback_data: "lang:ru" }, { text: "🇺🇿 O'zbekcha", callback_data: "lang:uz_latin" }],
[{ text: "🇺🇿 Ўзбекча", callback_data: "lang:uz_cyrillic" }, { text: "🇬🇧 English", callback_data: "lang:en" }],
],
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: botMsg("choose_language_short", lang), reply_markup: keyboard }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const sendRegistrationLanguageKeyboard = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const keyboard = {
inline_keyboard: [
[{ text: "🇷🇺 Русский", callback_data: "reg_lang:ru" }, { text: "🇺🇿 O'zbekcha", callback_data: "reg_lang:uz_latin" }],
[{ text: "🇺🇿 Ўзбекча", callback_data: "reg_lang:uz_cyrillic" }, { text: "🇬🇧 English", callback_data: "reg_lang:en" }],
],
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: args.chatId,
text: "👋 Welcome! / Добро пожаловать! / Xush kelibsiz!\n\n🌐 Choose your language:",
reply_markup: keyboard,
}),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const removeWebhook = internalAction({
args: { botToken: v.string() },
returns: v.null(),
handler: async (_ctx, args) => {
await fetch(`https://api.telegram.org/bot${args.botToken}/deleteWebhook`);
return null;
},
});

export const sendStartChoiceKeyboard = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const keyboard = {
inline_keyboard: [
[{ text: "🔑 I have a code / У меня есть код", callback_data: "start_choice:code" }],
[{ text: "📝 Register new / Зарегистрироваться", callback_data: "start_choice:register" }],
],
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: args.chatId,
text: "👋 Welcome! / Добро пожаловать! / Xush kelibsiz!\n\n" +
"🔑 Already have an account? Tap below to enter your code.\n" +
"📝 New here? Register to get started.\n\n" +
"🔑 Уже есть аккаунт? Нажмите ниже и введите код.\n" +
"📝 Новый пользователь? Зарегистрируйтесь.\n\n" +
"🔑 Akkauntingiz bormi? Kodni kiriting.\n" +
"📝 Yangimisiz? Ro'yxatdan o'ting.",
reply_markup: keyboard,
}),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const sendPhoneRequest = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), text: v.string(), language: v.optional(v.string()) },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const lang = args.language || "uz_latin";
const keyboard = {
keyboard: [[{ text: botMsg("share_phone", lang), request_contact: true }]],
resize_keyboard: true,
one_time_keyboard: true,
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: args.text, reply_markup: keyboard }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const sendSubjectSelection = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), text: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const classes = await ctx.runQuery(internal.telegram.getActiveClassesForTenant, { tenantId: args.tenantId });

// Get unique subjects
const subjects = [...new Set(classes.map((c: any) => c.subjectName))];

const rows = [];
for (let i = 0; i < subjects.length; i += 2) {
const row: any[] = [{ text: subjects[i], callback_data: `reg_subject:${String(subjects[i]).substring(0, 50)}` }];
if (subjects[i + 1]) row.push({ text: subjects[i + 1], callback_data: `reg_subject:${String(subjects[i + 1]).substring(0, 50)}` });
rows.push(row);
}

const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: args.chatId,
text: args.text,
reply_markup: { inline_keyboard: rows },
}),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const sendClassSelection = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), subjectName: v.string(), text: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const classes = await ctx.runQuery(internal.telegram.getActiveClassesForTenant, { tenantId: args.tenantId });

const filtered = classes.filter((c: any) => c.subjectName === args.subjectName);
const rows = [];
for (let i = 0; i < filtered.length; i += 2) {
const row: any[] = [{ text: filtered[i].name, callback_data: `reg_class:${String(filtered[i]._id).substring(0, 50)}` }];
if (filtered[i + 1]) row.push({ text: filtered[i + 1].name, callback_data: `reg_class:${String(filtered[i + 1]._id).substring(0, 50)}` });
rows.push(row);
}

const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: args.chatId,
text: args.text,
reply_markup: { inline_keyboard: rows },
}),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const answerCallback = internalAction({
args: { tenantId: v.id("companies"), callbackQueryId: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/answerCallbackQuery`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ callback_query_id: args.callbackQueryId }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const answerCallbackAndSend = internalAction({
args: { tenantId: v.id("companies"), chatId: v.string(), callbackQueryId: v.string(), text: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const resp1 = await fetch(`https://api.telegram.org/bot${tokenResult.token}/answerCallbackQuery`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ callback_query_id: args.callbackQueryId }),
});
if (!resp1.ok) {
const errText = await resp1.text();
console.error(`Telegram API error: ${resp1.status} ${errText}`);
}
const resp2 = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: args.text }),
});
if (!resp2.ok) {
const errText = await resp2.text();
console.error(`Telegram API error: ${resp2.status} ${errText}`);
}
return null;
},
});

// ─── Existing command handlers ───────────────────────────────────

export const handleBalanceCommand = internalAction({
args: { tenantId: v.id("companies"), userId: v.id("users"), chatId: v.string(), language: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const msg: Record<string, string> = {
en: "💰 Use the app to view your full balance.",
ru: "💰 Используйте приложение для просмотра баланса.",
uz_latin: "💰 Balansni ko'rish uchun ilovadan foydalaning.",
uz_cyrillic: "💰 Балансни кўриш учун иловадан фойдаланинг.",
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: msg[args.language] || msg["uz_latin"] }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const handleCoursesCommand = internalAction({
args: { tenantId: v.id("companies"), userId: v.id("users"), chatId: v.string(), language: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const msg: Record<string, string> = {
en: "📖 Use the app to view your courses.",
ru: "📖 Используйте приложение для просмотра курсов.",
uz_latin: "📖 Kurslarni ko'rish uchun ilovadan foydalaning.",
uz_cyrillic: "📖 Курсларни кўриш учун иловадан фойдаланинг.",
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: msg[args.language] || msg["uz_latin"] }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

export const handleGradesCommand = internalAction({
args: { tenantId: v.id("companies"), userId: v.id("users"), chatId: v.string(), language: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const msg: Record<string, string> = {
en: "✏️ Use the app to view your grades.",
ru: "✏️ Используйте приложение для просмотра оценок.",
uz_latin: "✏️ Baholarni ko'rish uchun ilovadan foydalaning.",
uz_cyrillic: "✏️ Баҳоларни кўриш учун иловадан фойдаланинг.",
};
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: args.chatId, text: msg[args.language] || msg["uz_latin"] }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});

// ─── Dispatch notification via Telegram ──────────────────────────

export const dispatchNotification = internalAction({
args: { tenantId: v.id("companies"), userId: v.id("users"), eventType: v.string(), data: v.any(), attempt: v.optional(v.number()) },
returns: v.null(),
handler: async (ctx, args) => {
const attempt = args.attempt ?? 1;
const link = await ctx.runQuery(internal.telegram.findUserLink, { tenantId: args.tenantId, userId: args.userId });
if (!link) return null;
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const lang = link.language || "uz_latin";
const messageText = renderTemplate(args.eventType, lang, args.data);
if (attempt === 1) {
await ctx.runMutation(internal.telegram.insertNotificationLog, {
userId: args.userId, tenantId: args.tenantId, eventType: args.eventType, messageText,
});
}
try {
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: link.chatId, text: messageText, parse_mode: "HTML" }),
});
const ok = resp.ok;
await ctx.runMutation(internal.telegram.updateNotificationLog, {
tenantId: args.tenantId, userId: args.userId, eventType: args.eventType,
status: ok ? "sent" : "failed",
error: ok ? undefined : `HTTP ${resp.status}`,
attempts: attempt,
});
if (!ok && attempt < 3) {
  await ctx.scheduler.runAfter(30000, internal.telegram.dispatchNotification, {
    tenantId: args.tenantId, userId: args.userId, eventType: args.eventType,
    data: args.data, attempt: attempt + 1,
  });
}
} catch (e: any) {
await ctx.runMutation(internal.telegram.updateNotificationLog, {
tenantId: args.tenantId, userId: args.userId, eventType: args.eventType,
status: "failed", error: e?.message,
attempts: attempt,
});
if (attempt < 3) {
  await ctx.scheduler.runAfter(30000, internal.telegram.dispatchNotification, {
    tenantId: args.tenantId, userId: args.userId, eventType: args.eventType,
    data: args.data, attempt: attempt + 1,
  });
}
}
return null;
},
});

export const findUserLink = internalQuery({
args: { tenantId: v.id("companies"), userId: v.id("users") },
returns: v.union(v.object({ chatId: v.string(), language: v.optional(v.string()) }), v.null()),
handler: async (ctx, args) => {
const link = await ctx.db.query("telegramLinks")
.withIndex("by_user_and_tenant", (q: any) => q.eq("userId", args.userId).eq("tenantId", args.tenantId))
.first();
if (!link || link.blockedAt) return null;
return { chatId: link.chatId, language: link.language };
},
});

export const insertNotificationLog = internalMutation({
args: { userId: v.id("users"), tenantId: v.id("companies"), eventType: v.string(), messageText: v.string() },
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.insert("notificationLogs", {
userId: args.userId, tenantId: args.tenantId, eventType: args.eventType,
status: "pending", attempts: 1, messageText: args.messageText,
});
return null;
},
});

export const updateNotificationLog = internalMutation({
args: { tenantId: v.id("companies"), userId: v.id("users"), eventType: v.string(), status: v.string(), error: v.optional(v.string()), attempts: v.optional(v.number()) },
returns: v.null(),
handler: async (ctx, args) => {
const log = await ctx.db.query("notificationLogs")
.withIndex("by_user_and_tenant", (q: any) => q.eq("userId", args.userId).eq("tenantId", args.tenantId))
.order("desc").first();
if (log) {
await ctx.db.patch(log._id, {
status: args.status as any,
lastError: args.error,
sentAt: args.status === "sent" ? Date.now() : undefined,
...(args.attempts !== undefined ? { attempts: args.attempts } : {}),
});
}
return null;
},
});

// ─── Missing internal functions (called from telegramActions.ts) ─

export const saveBotConfig = internalMutation({
args: {
companyId: v.id("companies"),
botToken: v.string(),
webhookSecret: v.string(),
botUsername: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.companyId, {
telegramBotToken: args.botToken,
telegramWebhookSecret: args.webhookSecret,
telegramBotUsername: args.botUsername,
telegramEnabled: true,
});
return null;
},
});

export const sendPaymentReminder = internalAction({
args: {
tenantId: v.id("companies"),
studentId: v.id("users"),
amount: v.number(),
studentName: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
const link = await ctx.runQuery(internal.telegram.findUserLink, { tenantId: args.tenantId, userId: args.studentId });
if (!link) return null;
const tokenResult = await ctx.runQuery(internal.telegram.getCompanyToken, { companyId: args.tenantId });
if (!tokenResult) return null;
const lang = link.language || "uz_latin";
const messageText = renderTemplate("payment_reminder", lang, {
studentName: args.studentName,
amount: args.amount,
});
const resp = await fetch(`https://api.telegram.org/bot${tokenResult.token}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ chat_id: link.chatId, text: messageText, parse_mode: "HTML" }),
});
if (!resp.ok) {
const errText = await resp.text();
console.error(`Telegram API error: ${resp.status} ${errText}`);
}
return null;
},
});