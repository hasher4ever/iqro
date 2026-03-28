import { action } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// ─── Public action: Setup bot (authenticated) ─────────────────────

export const setupBotPublic = action({
  args: {
    botToken: v.string(),
    siteUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    botUsername: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const user = await ctx.runQuery(internal.telegram.getUserForAuth, { userId });
    if (!user || user.role !== "super_admin") {
      return { success: false, error: "Not authorized" };
    }

    // 1. Validate token
    const meResp = await fetch(`https://api.telegram.org/bot${args.botToken}/getMe`);
    if (!meResp.ok) {
      return { success: false, error: "Invalid bot token" };
    }
    const meData = await meResp.json();
    const botUsername = meData.result?.username;

    // 2. Generate webhook secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let webhookSecret = '';
    for (let i = 0; i < 48; i++) {
      webhookSecret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 3. Set webhook
    const webhookUrl = `${args.siteUrl}/telegram/webhook`;
    const whResp = await fetch(`https://api.telegram.org/bot${args.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
      }),
    });
    if (!whResp.ok) {
      return { success: false, error: "Failed to set webhook" };
    }

    // 4. Register bot commands menu
    await fetch(`https://api.telegram.org/bot${args.botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "language", description: "🌐 Change language / Сменить язык / Tilni o'zgartirish" },
          { command: "balance", description: "💰 My balance / Мой баланс / Mening balansim" },
          { command: "courses", description: "📖 My courses / Мои курсы / Mening fanlarim" },
          { command: "grades", description: "✏️ My grades / Мои оценки / Mening baholarim" },
        ],
      }),
    });

    // 5. Save config
    await ctx.runMutation(internal.telegram.saveBotConfig, {
      companyId: user.companyId!,
      botToken: args.botToken,
      webhookSecret,
      botUsername: botUsername || "",
    });

    return { success: true, botUsername };
  },
});

// ─── Public action: Send manual payment reminder ──────────────────

export const sendPaymentReminderPublic = action({
  args: {
    studentId: v.id("users"),
    amount: v.number(),
    studentName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const user = await ctx.runQuery(internal.telegram.getUserForAuth, { userId });
    if (!user || !user.companyId) return { success: false, error: "No company" };
    if (user.role !== "super_admin" && user.role !== "admin") {
      return { success: false, error: "Insufficient permissions" };
    }

    await ctx.runAction(internal.telegram.sendPaymentReminder, {
      tenantId: user.companyId,
      studentId: args.studentId,
      amount: args.amount,
      studentName: args.studentName,
    });

    return { success: true };
  },
});