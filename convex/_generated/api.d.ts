/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as adminAuthHelpers from "../adminAuthHelpers.js";
import type * as attendance from "../attendance.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as classes from "../classes.js";
import type * as companies from "../companies.js";
import type * as finances from "../finances.js";
import type * as grades from "../grades.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as telegram from "../telegram.js";
import type * as telegramActions from "../telegramActions.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  adminAuthHelpers: typeof adminAuthHelpers;
  attendance: typeof attendance;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  classes: typeof classes;
  companies: typeof companies;
  finances: typeof finances;
  grades: typeof grades;
  http: typeof http;
  notifications: typeof notifications;
  rooms: typeof rooms;
  seed: typeof seed;
  telegram: typeof telegram;
  telegramActions: typeof telegramActions;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
