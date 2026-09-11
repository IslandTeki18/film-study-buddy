/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as deletions from "../deletions.js";
import type * as domain_coreFields from "../domain/coreFields.js";
import type * as domain_fieldZone from "../domain/fieldZone.js";
import type * as domain_provenance from "../domain/provenance.js";
import type * as domain_situation from "../domain/situation.js";
import type * as domain_starterTemplates from "../domain/starterTemplates.js";
import type * as domain_templateFields from "../domain/templateFields.js";
import type * as domain_terminology from "../domain/terminology.js";
import type * as theme_settings_preferences from "../theme_settings/preferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  deletions: typeof deletions;
  "domain/coreFields": typeof domain_coreFields;
  "domain/fieldZone": typeof domain_fieldZone;
  "domain/provenance": typeof domain_provenance;
  "domain/situation": typeof domain_situation;
  "domain/starterTemplates": typeof domain_starterTemplates;
  "domain/templateFields": typeof domain_templateFields;
  "domain/terminology": typeof domain_terminology;
  "theme_settings/preferences": typeof theme_settings_preferences;
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
