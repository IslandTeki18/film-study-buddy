/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as columnLayouts from "../columnLayouts.js";
import type * as crons from "../crons.js";
import type * as deletions from "../deletions.js";
import type * as diagrams from "../diagrams.js";
import type * as domain_aggregate from "../domain/aggregate.js";
import type * as domain_completeness from "../domain/completeness.js";
import type * as domain_coreFields from "../domain/coreFields.js";
import type * as domain_csvMapping from "../domain/csvMapping.js";
import type * as domain_diagram from "../domain/diagram.js";
import type * as domain_fieldZone from "../domain/fieldZone.js";
import type * as domain_names from "../domain/names.js";
import type * as domain_opponentPlayers from "../domain/opponentPlayers.js";
import type * as domain_playSide from "../domain/playSide.js";
import type * as domain_provenance from "../domain/provenance.js";
import type * as domain_quickNoteTags from "../domain/quickNoteTags.js";
import type * as domain_reportBlocks from "../domain/reportBlocks.js";
import type * as domain_situation from "../domain/situation.js";
import type * as domain_starterTemplates from "../domain/starterTemplates.js";
import type * as domain_templateFields from "../domain/templateFields.js";
import type * as domain_tendencyCategories from "../domain/tendencyCategories.js";
import type * as domain_terminology from "../domain/terminology.js";
import type * as formations from "../formations.js";
import type * as hudlImport from "../hudlImport.js";
import type * as notes from "../notes.js";
import type * as opponentData from "../opponentData.js";
import type * as opponentPlayers from "../opponentPlayers.js";
import type * as reports from "../reports.js";
import type * as seasons from "../seasons.js";
import type * as settings from "../settings.js";
import type * as snaps from "../snaps.js";
import type * as sourceGames from "../sourceGames.js";
import type * as templates from "../templates.js";
import type * as tendencies from "../tendencies.js";
import type * as terminology from "../terminology.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  columnLayouts: typeof columnLayouts;
  crons: typeof crons;
  deletions: typeof deletions;
  diagrams: typeof diagrams;
  "domain/aggregate": typeof domain_aggregate;
  "domain/completeness": typeof domain_completeness;
  "domain/coreFields": typeof domain_coreFields;
  "domain/csvMapping": typeof domain_csvMapping;
  "domain/diagram": typeof domain_diagram;
  "domain/fieldZone": typeof domain_fieldZone;
  "domain/names": typeof domain_names;
  "domain/opponentPlayers": typeof domain_opponentPlayers;
  "domain/playSide": typeof domain_playSide;
  "domain/provenance": typeof domain_provenance;
  "domain/quickNoteTags": typeof domain_quickNoteTags;
  "domain/reportBlocks": typeof domain_reportBlocks;
  "domain/situation": typeof domain_situation;
  "domain/starterTemplates": typeof domain_starterTemplates;
  "domain/templateFields": typeof domain_templateFields;
  "domain/tendencyCategories": typeof domain_tendencyCategories;
  "domain/terminology": typeof domain_terminology;
  formations: typeof formations;
  hudlImport: typeof hudlImport;
  notes: typeof notes;
  opponentData: typeof opponentData;
  opponentPlayers: typeof opponentPlayers;
  reports: typeof reports;
  seasons: typeof seasons;
  settings: typeof settings;
  snaps: typeof snaps;
  sourceGames: typeof sourceGames;
  templates: typeof templates;
  tendencies: typeof tendencies;
  terminology: typeof terminology;
  workspaces: typeof workspaces;
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
