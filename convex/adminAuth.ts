"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import crypto from "crypto";

// Matches Lucia's Scrypt output format: <salt_hex_32chars>:<hash_hex_128chars>
// Lucia uses: 16 random bytes -> hex string as salt TEXT, password NFKC normalized
// N=16384, r=16, p=1, dkLen=64
function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.randomBytes(16);
  const saltHex = saltBytes.toString("hex"); // 32 char hex string
  // Lucia passes the hex string (as UTF-8 bytes) to scrypt, not the raw bytes
  const normalizedPassword = password.normalize("NFKC");
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      normalizedPassword,
      saltHex, // string salt, same as Lucia's TextEncoder.encode(saltHex)
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err: any, derivedKey: any) => {
        if (err) reject(err);
        else resolve(`${saltHex}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

export const hashAndResetPassword = internalAction({
  args: {
    targetUserId: v.id("users"),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const hashedPassword = await hashPassword(args.newPassword);
    await ctx.runMutation(internal.adminAuthHelpers.updateAccountSecret, {
      targetUserId: args.targetUserId,
      hashedSecret: hashedPassword,
    });
    return null;
  },
});

export const hashAndCreateUser = internalAction({
  args: {
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    hashedPassword: v.optional(v.string()),
    password: v.string(),
    role: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    const hashedPassword = await hashPassword(args.password);
    const userId = await ctx.runMutation(internal.adminAuthHelpers.createUserWithAccount, {
      email: args.email,
      phone: args.phone,
      name: args.name,
      hashedPassword,
      role: args.role,
      companyId: args.companyId,
      createdBy: args.createdBy,
    });
    return userId;
  },
});