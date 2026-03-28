import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Auth routes MUST be registered for @convex-dev/auth to work
auth.addHttpRoutes(http);

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    if (!secretHeader) return new Response("Forbidden", { status: 403 });

    const tenantId = await ctx.runQuery(internal.telegram.findTenantByWebhookSecret, { secret: secretHeader });
    if (!tenantId) return new Response("Forbidden", { status: 403 });

    let body: any;
    try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

    // Skip stale messages (older than 30 seconds) to prevent replay/flood
    // Note: proper rate limiting would require a dedicated rate limit table
    if (body.message?.date && (Math.floor(Date.now() / 1000) - body.message.date) > 30) {
      return new Response("OK", { status: 200 });
    }

    // Handle callback_query (inline keyboard)
    if (body.callback_query) {
      const chatId = String(body.callback_query.message?.chat?.id || body.callback_query.from?.id);
      const callbackData = body.callback_query.data;
      const callbackQueryId = body.callback_query.id;
      if (chatId && callbackData && callbackQueryId) {
        await ctx.runMutation(internal.telegram.processWebhookMessage, { tenantId, chatId, callbackData, callbackQueryId });
      }
      return new Response("OK", { status: 200 });
    }

    // Handle regular messages
    const message = body.message;
    if (!message || !message.chat) return new Response("OK", { status: 200 });

    // Extract contact phone if shared
    const contactPhone = message.contact?.phone_number || undefined;
    const messageText = message.text || undefined;

    // Process if there's either text or a contact
    if (!messageText && !contactPhone) return new Response("OK", { status: 200 });

    await ctx.runMutation(internal.telegram.processWebhookMessage, {
      tenantId,
      chatId: String(message.chat.id),
      messageText,
      contactPhone,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;