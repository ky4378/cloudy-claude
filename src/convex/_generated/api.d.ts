/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as admin from "../admin.js";
import type * as adminInternal from "../adminInternal.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as billing from "../billing.js";
import type * as businessMedia from "../businessMedia.js";
import type * as businesses from "../businesses.js";
import type * as coach from "../coach.js";
import type * as currency from "../currency.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as instagram from "../instagram.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_competitors from "../lib/competitors.js";
import type * as lib_focus from "../lib/focus.js";
import type * as lib_fx from "../lib/fx.js";
import type * as lib_insights from "../lib/insights.js";
import type * as lib_planGen from "../lib/planGen.js";
import type * as lib_planLimits from "../lib/planLimits.js";
import type * as lib_research from "../lib/research.js";
import type * as lib_strategy from "../lib/strategy.js";
import type * as lib_voice from "../lib/voice.js";
import type * as plan from "../plan.js";
import type * as stripe from "../stripe.js";
import type * as stripeStatus from "../stripeStatus.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as supabase from "../supabase.js";
import type * as supabaseStatus from "../supabaseStatus.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  admin: typeof admin;
  adminInternal: typeof adminInternal;
  ai: typeof ai;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  billing: typeof billing;
  businessMedia: typeof businessMedia;
  businesses: typeof businesses;
  coach: typeof coach;
  currency: typeof currency;
  feedback: typeof feedback;
  http: typeof http;
  instagram: typeof instagram;
  "lib/ai": typeof lib_ai;
  "lib/competitors": typeof lib_competitors;
  "lib/focus": typeof lib_focus;
  "lib/fx": typeof lib_fx;
  "lib/insights": typeof lib_insights;
  "lib/planGen": typeof lib_planGen;
  "lib/planLimits": typeof lib_planLimits;
  "lib/research": typeof lib_research;
  "lib/strategy": typeof lib_strategy;
  "lib/voice": typeof lib_voice;
  plan: typeof plan;
  stripe: typeof stripe;
  stripeStatus: typeof stripeStatus;
  stripeWebhook: typeof stripeWebhook;
  supabase: typeof supabase;
  supabaseStatus: typeof supabaseStatus;
  users: typeof users;
  waitlist: typeof waitlist;
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
