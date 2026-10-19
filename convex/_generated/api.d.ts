/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calls from "../calls.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_groups from "../lib/groups.js";
import type * as lib_languages from "../lib/languages.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_linkPreview from "../lib/linkPreview.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as messages from "../messages.js";
import type * as presence from "../presence.js";
import type * as push from "../push.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as translate from "../translate.js";
import type * as translations from "../translations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calls: typeof calls;
  conversations: typeof conversations;
  files: typeof files;
  http: typeof http;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/groups": typeof lib_groups;
  "lib/languages": typeof lib_languages;
  "lib/limits": typeof lib_limits;
  "lib/linkPreview": typeof lib_linkPreview;
  linkPreviews: typeof linkPreviews;
  messages: typeof messages;
  presence: typeof presence;
  push: typeof push;
  pushSubscriptions: typeof pushSubscriptions;
  translate: typeof translate;
  translations: typeof translations;
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

export declare const components: {
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  translationWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"translationWorkpool">;
  pushWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"pushWorkpool">;
};
