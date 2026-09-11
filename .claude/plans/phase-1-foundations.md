# Plan — Phase 1: Foundations

Execution plan for `.claude/TASKS.md` Phase 1. Terminology is fixed by `ubiquitous-language.md`.
Architecture is fixed by `.claude/BLUEPRINT.md`. This document does not redefine either; it says
what to build, in what order, and how to prove it.

**Audience:** the autonomous coding agent that will execute this. Read §0 and §1 before writing
any code.

---

## 0. Prerequisites and Ground Rules

### 0.1 Read first

1. `.claude/BLUEPRINT.md` §3 (stack), §4 (layout), §5 (data model), §7 (cross-cutting), §8 (screens), §9 (invariants).
2. `ubiquitous-language.md` in full. Every identifier and every user-visible string uses these terms.
3. `.claude/SPEC.md` §15–§22 (Core Snap schema, fixed option lists, field position), §50, §60, §86–§89, §96–§97.
4. `.claude/CLAUDE.md` (conventions).

### 0.2 Non-negotiable constraints

| Constraint | Source | Consequence for this phase |
| --- | --- | --- |
| No new dependencies beyond the four in 1.1 | BLUEPRINT §3 | **No Radix.** See §1.3 — this changes how step 1.10 is built. |
| TypeScript strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` | `tsconfig.json` | Array indexing yields `T | undefined`; optional props must be omitted, not set to `undefined`. |
| kebab-case files and directories in `src/` and `electron/` | CLAUDE.md | `use-autosave.ts`, `app-sidebar.tsx`. |
| **camelCase files and directories under `convex/`** | CLAUDE.md naming exception | Convex rejects the push if any bundled path contains a hyphen: `coreFields.ts`, `fieldZone.ts`, `starterTemplates.ts`, `csvMapping.ts`, `sourceGames.ts`, `opponentData.ts`, `themeSettings/`. It is the file's **presence** that fails, not any import of it, so no import style avoids it. `convex/_generated/` is exempt. |
| `convex/domain/` is pure TypeScript | BLUEPRINT §4, D10 | Zero imports from `convex/`, `convex/_generated/`, `react`, or the DOM. |
| No Save button, anywhere | SPEC §89, Invariant 10 | 1.8 is the only persistence path built here. |
| No test files in this phase | User instruction for this plan | See §0.5. Several TASKS.md *Verify* lines are substituted. |
| Match the existing code's style | Repo | See §0.4. |

### 0.3 Environment status — read this before step 1.5

There is no `.env`, and `convex/_generated/` holds only the stub set generated from the current
empty `defineSchema({})`. `npx convex dev` requires an interactive login and **has not been run.**

Decided handling (confirmed with the project owner):

- Build all ten steps, including 1.5 and 1.6.
- Verify them by `npm run typecheck` only.
- Mark 1.5 and 1.6 `[~]` in `TASKS.md` (implemented, not verified) with a one-line blocker note.
  Do **not** mark them `[x]`.
- Do not attempt to run `npx convex dev`, `convex deploy`, or any interactive Convex command. Do
  not create `.env`.

**This is cheaper than it looks.** `convex/_generated/dataModel.d.ts` derives `DataModel` from
`../schema.js`, so the moment tables land in `convex/schema.ts`, every `ctx.db.query('snaps')` in
`convex/deletions.ts` is fully typed with no regeneration. `convex/_generated/api.d.ts` declares
`api` and `internal` as `AnyApi`, so `internal.deletions.purgeExpired` in `convex/crons.ts`
typechecks loosely. Full static verification of 1.5 and 1.6 is available now; only the runtime
schema push and the soft-delete round-trip are blocked.

### 0.4 Existing patterns to follow (do not invent new ones)

Read these three files before writing anything; they define the house style.

- `src/features/theme-settings/theme.ts` — pure module: a `readonly` tuple of literals, a type
  derived from it (`(typeof X)[number]`), an `is*` type guard, exported constants for anything a
  consumer might need, a header comment stating invariants. **Every `convex/domain/` module in
  1.2–1.4 follows this shape.**
- `src/components/ui/button.tsx` — component style: `cva` for variants, `cn()` from
  `@/lib/utils`, an exported `Props` type that extends the native element's HTML attributes,
  named function export, explicit `: ReactNode` return type. **Every primitive in 1.10 follows
  this shape.**
- `convex/theme_settings/preferences.ts` — Convex function style: an exported validator constant,
  `args:` and `returns:` on every function, JSDoc stating the invariant.

Also observed and to be preserved:

- Explicit return types on all exported functions (`: ReactNode`, `: string`, `: void`).
- `readonly` on every interface property in props types.
- `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Comments explain *why*, never *what*. Deliberate simplifications carry a `ponytail:` prefix.
- Single quotes, no semicolons, 2-space indent, ~96 column soft wrap.

### 0.5 Substituted verification (no test files)

This plan authors no `*.test.ts`. `package.json`'s `test` script stays exactly as it is
(`theme.test.ts` only), so `npm run build` keeps passing unchanged. Three TASKS.md *Verify* lines
that call for unit tests are substituted:

| Step | TASKS.md asks for | This plan substitutes |
| --- | --- | --- |
| 1.2 | unit test asserting fourteen fields and exact option lists | A one-shot `node --experimental-strip-types -e` assertion run from the shell (§1.2 V3), plus a rendered checklist on the scratch route. Nothing is committed. |
| 1.3 | `node --test` over every zone and situation boundary | A one-shot `node --experimental-strip-types -e` boundary table printed to stdout and compared against the table in §1.3 by eye. Nothing is committed. |
| 1.4 | imported by a scratch render; no duplicates | The scratch route renders the lists (unchanged from TASKS.md), and a `sort -u` count check via shell. |

**Flag this to the owner on completion.** Per BLUEPRINT §11, `convex/domain/` unit tests are the
project's stated primary verification strategy, and the pure modules built in 1.2–1.4 are exactly
the ones it names. Those tests are deferred debt, not cancelled work. Record them:

- Add a `ponytail:` comment at the top of `fieldZone.ts`, `situation.ts`, and `provenance.ts`
  naming the deferred test and the upgrade path, e.g.
  `// ponytail: boundary table verified by hand at build time; add node --test coverage per BLUEPRINT §11 before Phase 6 depends on it.`

### 0.6 Not a git repository

`git rev-parse` fails here; there is no version control. **Take no git actions** (no `init`, no
commits). Consequence: there is no rollback. Before modifying any of the four existing files in
§1.7 and §1.10, copy the originals into the scratchpad so a bad edit is recoverable.

### 0.7 Revised execution order

Execute in this order, **not** the numeric order in TASKS.md:

```
1.1  Dependencies
1.2  Core field registry          ─┐
1.3  Derived-value functions       │ convex/domain/ — pure, independent, no Convex needed
1.4  Terminology library          ─┘
1.5  Schema                        ─┐ Convex — 1.6 needs 1.5's tables to typecheck
1.6  Deletion ledger              ─┘
1.10 UI primitives                 ← MOVED UP: 1.8's Undo toast needs the toast primitive
1.7  Router                        ← needs the tabs primitive from 1.10 for the tab strips
1.8  Autosave and undo hooks
1.9  Reorder hook
```

Two reorderings, both forced by real dependencies:

- **1.10 before 1.8.** `use-undoable-mutation` shows the Undo toast (BLUEPRINT §7.2). The toast
  provider is a 1.10 deliverable. Building 1.8 first would mean either a stub toast thrown away
  hours later, or the hook returning a toast descriptor no one renders.
- **1.10 before 1.7.** The workspace and Source Game tab strips (BLUEPRINT §8) are the tabs
  primitive.

Each step is one commit-sized unit that leaves `npm run dev` launching. Do not batch steps.

### 0.8 The scratch route

Steps 1.4, 1.8, 1.9, and 1.10 are verified by hand on a temporary route. Create it once, in 1.10:

- File: `src/routes/scratch-page.tsx`, route path `/scratch`, **not** linked from the sidebar.
- It is a throwaway. It holds every hand-verification surface this phase needs.
- **Delete `src/routes/scratch-page.tsx` and its route entry as the final action of §2.**
  Nothing in Phase 2 may import it.

---

## 1. Steps

Each step below states: what to build, the exact file paths, the acceptance criteria (AC), and
the verification (V). Do not proceed to the next step until every AC and V of the current one
passes.

---

### 1.1 Dependencies

**Build.** Add exactly four packages. Nothing else, at any point in this phase.

```bash
npm install react-router @tanstack/react-table papaparse
npm install --save-dev @types/papaparse
```

Notes for the executing agent:

- The package is `react-router` (v7), **not** `react-router-dom`. v7 exports `HashRouter`,
  `createHashRouter`, `RouterProvider`, `NavLink`, `Outlet`, `useParams` from `react-router`
  directly. If a v6-era instinct reaches for `react-router-dom`, it is wrong here.
- `papaparse` is installed now but not imported until Phase 6. Do not write import code for it.
- `@tanstack/react-table` is installed now but not imported until Phase 4. Same.
- Do not add `@radix-ui/*`. See §1.3 below and §0.2.

**Files changed:** `package.json`, `package-lock.json`.

**AC**
1. `package.json` dependencies gain exactly `react-router`, `@tanstack/react-table`, `papaparse`.
2. devDependencies gain exactly `@types/papaparse`.
3. No other dependency is added or removed. No version of an existing dependency changes.

**V**
1. `npm run typecheck` — clean.
2. `npm test` — passes (still the six theme assertions).
3. `npm run dev` — the window opens, the sidebar renders, the theme toggle works.
4. `git`-free diff check: `npm ls --depth=0` lists no package absent from `package.json`.

---

### 1.2 Core field registry — `convex/domain/coreFields.ts`

**Build.** The single authoritative registry of the fourteen Core Snap fields (SPEC §15). This
module is imported by the Play Log column model (4.3), every cell editor (4.5), CSV mapping
(6.1), Opponent Data grouping (9.2), and the Convex schema validators (1.5). It has one job: be
the only place these fourteen fields are described.

Module shape (follow `theme.ts`):

```ts
/** Fixed option lists. SPEC §16–§18. Order is the display order in every picker. */
export const HASHES = ['Left', 'Middle', 'Right'] as const
export const PLAY_TYPES = ['Run','Pass','RPO','Play Action','Screen','Draw','QB Run','Special / Trick','Other'] as const
export const DIRECTIONS = ['Left','Right','Middle','Field','Boundary','Strong','Weak','N/A'] as const

export type Hash = (typeof HASHES)[number]
export type PlayType = (typeof PLAY_TYPES)[number]
export type Direction = (typeof DIRECTIONS)[number]

/** How a cell renders and edits. Cell editors in 4.5 switch exhaustively on this. */
export type CoreFieldInput =
  | { readonly kind: 'shortText' }
  | { readonly kind: 'number' }
  | { readonly kind: 'select'; readonly options: readonly string[] }   // fixed, closed
  | { readonly kind: 'terminology'; readonly list: TerminologyList }   // open, extendable inline
  | { readonly kind: 'fieldPosition' }                                 // structured, SPEC §22

export interface CoreField {
  readonly key: CoreFieldKey
  readonly label: string          // the ubiquitous-language name, verbatim
  readonly input: CoreFieldInput
}

export const CORE_FIELDS: readonly CoreField[] = [ /* fourteen entries, charting order */ ]
export type CoreFieldKey = 'clipNumber' | 'quarter' | /* … */ | 'yards'

export function isCoreFieldKey(value: unknown): value is CoreFieldKey
export function getCoreField(key: CoreFieldKey): CoreField
/** The single canonical string form of a core value. Used by display, provenance, CSV, reports. */
export function formatCoreValue(key: CoreFieldKey, value: unknown): string
```

The fourteen entries, in charting order. `key` must match `snaps.core` in BLUEPRINT §5.4 exactly;
`label` must match `ubiquitous-language.md` / SPEC §15 exactly.

| # | key | label | input |
| --- | --- | --- | --- |
| 1 | `clipNumber` | Source / Clip # | shortText |
| 2 | `quarter` | Quarter | number |
| 3 | `clock` | Clock | shortText |
| 4 | `down` | Down | number |
| 5 | `distance` | Distance | number |
| 6 | `yardLine` | Yard Line | fieldPosition |
| 7 | `hash` | Hash | select — `HASHES` |
| 8 | `personnel` | Personnel | shortText |
| 9 | `formation` | Formation | terminology — `formations` |
| 10 | `motion` | Motion | terminology — `motions` |
| 11 | `playType` | Play Type | select — `PLAY_TYPES` |
| 12 | `playConcept` | Play Concept | terminology — `playConcepts` |
| 13 | `direction` | Direction | select — `DIRECTIONS` |
| 14 | `yards` | Yards Gained / Lost | number |

Decisions the executing agent must apply, not re-litigate:

- **`playNumber` is not a registry entry.** BLUEPRINT §5.4 stores `playNumber` on `snaps.core`,
  but SPEC §15 lists fourteen fields and `playNumber` is not one of them; it is a Hudl Reference
  value (SPEC §95) used by duplicate detection (6.6). Keep it on the schema, keep it out of the
  registry. This is what makes TASKS.md 4.3's "ten-field template yields twenty-four columns"
  true: 14 + 10.
- **`clock` is `shortText`, not a parsed duration.** SPEC §95 wants it only as a Hudl lookup
  value. No `mm:ss` validation in V1.
- **`personnel` is `shortText`.** SPEC §97 forbids package management.
- **`quarter` and `down` are plain `number`.** Do not enforce an upper bound in this module;
  overtime exists and the spec sets no ceiling. Range guards, where wanted, belong to the cell
  editor in Phase 4.
- **`select` vs `terminology` is a real distinction, not a synonym.** `select` is closed: SPEC
  §16–§18 fix those three lists and the coach cannot extend them. `terminology` is open: SPEC
  §20–§21 require inline creation (built in 4.9). Encoding this in the registry now is what
  makes 4.9 a rendering change rather than a data-model change.
- `formatCoreValue` for `yardLine` produces `OWN 35`, `50`, `OPP 22` (SPEC §22). Import the
  formatter from `fieldZone.ts` (1.3) rather than duplicating the logic. For `undefined` or
  `null` it returns `''`, never `'undefined'` and never `'—'` (the em-dash placeholder is a
  presentation choice, not a data one).

**Also required in this step** — the shared-import path. `convex/domain/` is imported from both
`convex/` and `src/`, and `src/` has an `@/*` alias but no way to reach `convex/`. Add a
`@convex/*` alias so 50 later files do not carry `../../../convex/domain/...`:

- `tsconfig.json` → `"paths": { "@/*": ["src/*"], "@convex/*": ["convex/*"] }`
- `electron.vite.config.ts` → renderer `resolve.alias` gains
  `'@convex': resolve(__dirname, 'convex')`

Both must change together or the renderer build resolves what `tsc` accepts, or vice versa.

**Files changed:** `convex/domain/coreFields.ts` (new), `tsconfig.json`, `electron.vite.config.ts`.

**AC**
1. `CORE_FIELDS.length === 14`.
2. Keys are exactly the fourteen in the table, and every key exists on `snaps.core` in BLUEPRINT §5.4.
3. `HASHES`, `PLAY_TYPES`, `DIRECTIONS` match SPEC §16, §17, §18 verbatim, in spec order, including `Special / Trick` and `N/A` with their exact spacing and punctuation.
4. No import from `convex/_generated`, `convex/server`, `convex/values`, `react`, or any DOM global.
5. `getCoreField` is total over `CoreFieldKey` (no `undefined` return, no non-null assertion — build a `Record<CoreFieldKey, CoreField>` lookup or narrow properly under `noUncheckedIndexedAccess`).
6. `import { CORE_FIELDS } from '@convex/domain/core-fields'` resolves from a file under `src/`.

**V**
1. `npm run typecheck` — clean.
2. `npm run dev` — window still opens (proves the Vite alias resolves).
3. One-shot assertion, nothing committed:
   ```bash
   node --experimental-strip-types -e "
   import('./convex/domain/coreFields.ts').then(m => {
     const assert = require('node:assert/strict')
     assert.equal(m.CORE_FIELDS.length, 14)
     assert.deepEqual(m.HASHES, ['Left','Middle','Right'])
     assert.deepEqual(m.PLAY_TYPES, ['Run','Pass','RPO','Play Action','Screen','Draw','QB Run','Special / Trick','Other'])
     assert.deepEqual(m.DIRECTIONS, ['Left','Right','Middle','Field','Boundary','Strong','Weak','N/A'])
     console.log('core-fields OK', m.CORE_FIELDS.map(f => f.key).join(','))
   })"
   ```
   Paste the printed key list into the completion report.

---

### 1.3 Derived-value functions — `fieldZone.ts`, `situation.ts`, `provenance.ts`

**Build.** Three pure modules in `convex/domain/`. BLUEPRINT D10: derived values are **never
stored**. One implementation serves both server aggregation and client display, which is the
whole point — do not let a second copy of any of this logic appear in `src/`.

#### `convex/domain/fieldZone.ts`

```ts
export interface YardLine { readonly side: 'own' | 'mid' | 'opp'; readonly yard: number }
export const FIELD_ZONES = ['Backed Up','Own Territory','Midfield','Plus Territory','Red Zone','Goal Line'] as const
export type FieldZone = (typeof FIELD_ZONES)[number]

/** SPEC §22: the editor cannot express an invalid spot. Used by the 4.7 input guard. */
export function isValidYardLine(value: unknown): value is YardLine
export function fieldZoneOf(line: YardLine): FieldZone
export function formatYardLine(line: YardLine): string   // 'OWN 35' | '50' | 'OPP 22'
export function parseYardLine(text: string): YardLine | null  // for CSV coercion in 6.1
```

Validity rules (SPEC §22, and the failure-mode row in BLUEPRINT §10):

- `side: 'own'` → `yard` an integer in `[1, 49]`.
- `side: 'mid'` → `yard === 50` exactly.
- `side: 'opp'` → `yard` an integer in `[1, 49]`.
- Everything else is invalid: `OPP 0`, `OWN 0`, `OWN 60`, `OPP 50`, `2.5`, `NaN`.

Zone boundaries. **SPEC §22 fixes the six zone names but states no numeric boundaries.** These
are an assumption (see §3, A1). Express them as one exported, editable table so retuning is a
one-line change, and put the assumption in the module header comment:

| Zone | Range |
| --- | --- |
| Backed Up | `own 1`–`own 10` |
| Own Territory | `own 11`–`own 39` |
| Midfield | `own 40`–`own 49`, `mid 50`, `opp 40`–`opp 49` |
| Plus Territory | `opp 39`–`opp 21` |
| Red Zone | `opp 20`–`opp 6` |
| Goal Line | `opp 5`–`opp 1` |

`fieldZoneOf` takes a `YardLine` the type system already guarantees is valid, so it returns
`FieldZone`, not `FieldZone | null`. Validation happens at the boundary via `isValidYardLine`.
Implement it over a single monotonic scalar (`own N → N`, `mid 50 → 50`, `opp N → 100 - N`) rather
than a branch per side; one number line, six thresholds, no duplicated arithmetic.

#### `convex/domain/situation.ts`

```ts
export const DOWN_DISTANCE_SITUATIONS = [
  '1st Down','2nd & Short','2nd & Medium','2nd & Long',
  '3rd & Short','3rd & Medium','3rd & Long',
  '4th & Short','4th & Medium','4th & Long',
] as const
export type DownDistanceSituation = (typeof DOWN_DISTANCE_SITUATIONS)[number]

/** null when down or distance is missing — a Snap with no down has no situation, not a default. */
export function downDistanceSituationOf(down: number | undefined, distance: number | undefined): DownDistanceSituation | null
```

Buckets. **SPEC §60 lists the ten group names but no yardage thresholds.** Assumption (§3, A2),
again as one exported table:

- `down === 1` → `1st Down`, whatever the distance. (SPEC §60 lists no `1st & Short/Medium/Long`.)
- `down` 2, 3, or 4 → `Short` when `distance <= 3`, `Medium` when `4 <= distance <= 6`, `Long`
  when `distance >= 7`.
- `down` outside 1–4, or either argument `undefined` → `null`.
- `distance === 0` → `Short` (goal-to-go with the line on the goal line).

#### `convex/domain/provenance.ts`

```ts
export const PROVENANCE_STATES = ['Imported','Coach Entered','Coach Edited'] as const
export type Provenance = (typeof PROVENANCE_STATES)[number]

export function provenanceOf(
  imported: Readonly<Record<string, string>> | undefined,
  key: CoreFieldKey,
  currentValue: unknown,
): Provenance
```

Rules, straight from BLUEPRINT §5.4 / §7.3:

- `key` absent from `imported` (or `imported` itself `undefined`) → `Coach Entered`.
- `key` present and the original equals the current value → `Imported`.
- `key` present and unequal → `Coach Edited`. Restore is then a copy of `imported[key]` back onto
  the core value; provide `restoredValueFor(imported, key)` returning `string | null` so 4.10 has
  no branching of its own.

Equality is compared on the **canonical string form**: `formatCoreValue(key, currentValue)` vs
the stored `imported[key]`. This is an assumption (§3, A3) and needs the module header comment —
Hudl gives strings, the Snap holds typed values, and comparing `"35"` to `35` structurally would
mark every imported numeric cell `Coach Edited` on load. Trim both sides before comparing;
whitespace is not a coach edit. This is the only place `provenance.ts` imports from
`coreFields.ts` — acceptable, both are pure and in the same directory.

**Files changed:** `convex/domain/fieldZone.ts`, `convex/domain/situation.ts`,
`convex/domain/provenance.ts` (all new).

**AC**
1. All three modules import nothing outside `convex/domain/`. No Convex, no React, no DOM.
2. Zone thresholds and distance buckets each live in exactly one exported constant.
3. Every function is total: no thrown errors on in-type input, no non-null assertions, no `any`.
4. `isValidYardLine` rejects `OPP 0`, `OWN 0`, `OWN 60`, `OPP 50`, non-integers, and `NaN`.
5. Each module's header comment states its assumption (§3, A1–A3) and carries the deferred-test `ponytail:` note from §0.5.

**V**
1. `npm run typecheck` — clean.
2. One-shot boundary table, nothing committed. Print and check against §1.3's tables by eye:
   ```bash
   node --experimental-strip-types -e "
   Promise.all([import('./convex/domain/fieldZone.ts'), import('./convex/domain/situation.ts')])
     .then(([fz, s]) => {
       for (const l of [{side:'own',yard:1},{side:'own',yard:10},{side:'own',yard:11},{side:'own',yard:20},{side:'own',yard:39},{side:'own',yard:40},{side:'mid',yard:50},{side:'opp',yard:40},{side:'opp',yard:39},{side:'opp',yard:21},{side:'opp',yard:20},{side:'opp',yard:6},{side:'opp',yard:5},{side:'opp',yard:1}])
         console.log(fz.formatYardLine(l).padEnd(8), fz.fieldZoneOf(l))
       for (const [d,x] of [[1,10],[2,3],[2,4],[2,6],[2,7],[3,1],[3,5],[3,12],[4,2],[4,5],[4,9]])
         console.log(d+'&'+x, '->', s.downDistanceSituationOf(d,x))
       console.log('invalid ->', [{side:'opp',yard:0},{side:'own',yard:0},{side:'own',yard:60},{side:'opp',yard:50},{side:'own',yard:2.5}].map(fz.isValidYardLine).join(','))
       console.log('missing ->', s.downDistanceSituationOf(undefined,7), s.downDistanceSituationOf(3,undefined))
     })"
   ```
   Required: the fourteen zone lines match the table; `2&3→Short`, `2&4→Medium`, `2&7→Long`;
   the invalid line reads `false,false,false,false,false`; both missing cases print `null`.
3. Provenance, all three states, in the same style: `Coach Entered` for an absent key, `Imported`
   for `{down:'3'}` vs `3`, `Coach Edited` for `{down:'3'}` vs `4`, and `restoredValueFor`
   returning `'3'`.

---

### 1.4 Terminology library — `convex/domain/terminology.ts`

**Build.** The built-in vocabulary that ships with the product (SPEC §19–§21, §96). One module,
readonly string arrays, alphabetically sorted within each list.

```ts
export const FORMATIONS: readonly string[] = [ /* common high-school formations */ ]
export const MOTIONS: readonly string[] = [ /* common motions */ ]
export const PLAY_CONCEPTS: readonly string[] = [ /* SPEC §21's ten, plus common additions */ ]

export type TerminologyList = 'formations' | 'motions' | 'playConcepts'
export function builtInTerminology(list: TerminologyList): readonly string[]
```

Content guidance:

- `PLAY_CONCEPTS` **must** contain SPEC §21's ten verbatim: Inside Zone, Outside Zone, Counter,
  Power, Trap, Duo, Split Zone, Mesh, Flood, Screen. Additions are fine; omissions are not.
- `FORMATIONS` and `MOTIONS`: SPEC §19–§20 say "common football terminology" without enumerating.
  Aim for 15–30 widely recognized entries each at the high-school level. Err toward fewer,
  unambiguous, well-known values — coaches extend inline in 4.9, so a short correct list beats a
  long speculative one, and every wrong entry is vocabulary the coach has to work around.
- **No aliases, no synonym map, no normalization** (SPEC §96, Invariant 11). Two different
  strings are two different values. If the instinct arises to map `Trips Rt` → `Trips Right`,
  that instinct is a spec violation.
- Do **not** re-declare `DIRECTIONS` or `PLAY_TYPES` here even though SPEC §96 lists them as
  terminology areas — they are closed lists owned by `coreFields.ts` (1.2). Re-export from
  `coreFields.ts` if a single import site is wanted; never copy the values.
- This module holds built-ins only. Coach-created Custom Terminology is discovered from existing
  Snap values at query time in Phase 4; nothing here is written to at runtime.

**Files changed:** `convex/domain/terminology.ts` (new), `src/routes/scratch-page.tsx` (a section
rendering the three lists; the file itself is created in 1.10 — if 1.10 has not run yet under a
different ordering, defer only this rendering).

**AC**
1. All ten SPEC §21 concepts are present, spelled exactly as the spec spells them.
2. No list contains a duplicate.
3. Each list is alphabetically sorted (so a human can scan for gaps).
4. No alias, synonym, or normalization function exists in the module.
5. `DIRECTIONS` / `PLAY_TYPES` values are not duplicated from `coreFields.ts`.

**V**
1. `npm run typecheck` — clean.
2. Duplicate check via shell — each pair must print two equal numbers:
   ```bash
   node --experimental-strip-types -e "
   import('./convex/domain/terminology.ts').then(m => {
     for (const k of ['FORMATIONS','MOTIONS','PLAY_CONCEPTS'])
       console.log(k, m[k].length, new Set(m[k]).size, JSON.stringify(m[k]) === JSON.stringify([...m[k]].sort()) ? 'sorted' : 'UNSORTED')
     console.log('spec §21:', ['Inside Zone','Outside Zone','Counter','Power','Trap','Duo','Split Zone','Mesh','Flood','Screen'].filter(c => !m.PLAY_CONCEPTS.includes(c)))
   })"
   ```
   Required: `length === Set.size` on all three, all three `sorted`, and the §21 missing list `[]`.
3. The three lists render on `/scratch` without a runtime error (the TASKS.md scratch-render line).

---

### 1.5 Schema — `convex/schema.ts`

**Build.** Replace the current `defineSchema({})` with every table and index in BLUEPRINT §5.
This is a transcription task, and the blueprint is authoritative down to the field names. Read
BLUEPRINT §5.1–§5.7 line by line and do not improvise field names, types, or index names.

Nineteen tables. Per BLUEPRINT §5, **every table carries `deletedAt: v.optional(v.number())` and
`deleteBatchId: v.optional(v.string())` except those marked hard delete.**

| Table | Blueprint § | Soft delete? | Indexes |
| --- | --- | --- | --- |
| `settings` | 5.1 | hard (singleton) | — |
| `importMappings` | 5.1 | hard | `by_signature` |
| `columnLayouts` | 5.1 | hard | `by_sourceGame` |
| `seasons` | 5.2 | soft | `by_deletedAt` |
| `workspaces` | 5.2 | soft | `by_season`, `by_season_archived` |
| `sourceGames` | 5.2 | soft | `by_workspace` |
| `templates` | 5.3 | soft | — |
| `templateSections` | 5.3 | soft | `by_template` |
| `templateFields` | 5.3 | soft | `by_template`, `by_section` |
| `templateViews` | 5.3 | hard | `by_template` |
| `snaps` | 5.4 | soft | `by_sourceGame` (+ `order`), `by_sourceGame_mustReview` |
| `cellNotes` | 5.4 | soft | `by_snap` |
| `bulkEdits` | 5.4 | hard | — |
| `quickNotes` | 5.5 | soft | `by_sourceGame` |
| `diagrams` | 5.5 | soft | `by_sourceGame`, `by_snap` |
| `tendencyCategories` | 5.6 | hard | — |
| `tendencies` | 5.6 | soft | (add `by_workspace`) |
| `reports` | 5.6 | soft | `by_workspace` |
| `deletions` | 5.7 | hard | `by_batchId`, `by_createdAt` |

Implementation notes:

- Factor the two soft-delete fields into one shared spread so twelve tables cannot drift:
  ```ts
  const softDelete = { deletedAt: v.optional(v.number()), deleteBatchId: v.optional(v.string()) }
  ```
  Spread it into each soft-deletable table. One definition, twelve uses.
- **Keep the domain types and the validators consistent** (CLAUDE.md). Build the closed-list
  validators from the 1.2 constants rather than retyping the strings:
  ```ts
  const hashValidator = v.union(...HASHES.map(h => v.literal(h)))
  ```
  If the spread-union typing fights `v.union`'s tuple signature, fall back to writing the
  literals explicitly **and** add a comment pointing at `coreFields.ts` as the source of truth.
  Do not silently let the two lists diverge.
- `snaps.core` is a `v.object` of fourteen-plus-one optional fields, per BLUEPRINT §5.4 verbatim —
  including `playNumber` (see 1.2), which is stored but not a registry entry.
- `snaps.analysis` is `v.record(v.string(), analysisValueValidator)` where `AnalysisValue` is
  `v.union(v.string(), v.number(), v.boolean(), v.array(v.string()))` (BLUEPRINT D11). Keys are
  `templateFieldId` strings. Export the validator; 2.x and 5.7 both need it.
- `reports.blocks` is the seven-variant discriminated union of BLUEPRINT §5.6, as
  `v.array(v.union(...))` with `type` as the discriminant literal. Transcribe all seven; a
  partial union here becomes a Phase 10 rewrite.
- `settings.themePreference` is declared now per BLUEPRINT §5.1. **Do not touch
  `convex/theme_settings/preferences.ts` and do not migrate the renderer's local-storage theme.**
  TASKS.md 3.1 owns that migration. The field sits unused for now; delete the stale "Theme
  settings need no standalone table" comment from `schema.ts` since it is now false, and replace
  it with a one-line pointer to task 3.1.
- Coordinates in `diagrams` are normalized 0–1 (BLUEPRINT §5.5). Note it in a comment; there is
  no validator for a range.

**Files changed:** `convex/schema.ts` (rewritten).

**AC**
1. All nineteen tables present, named exactly as BLUEPRINT §5 names them.
2. Every field name, type, and optionality matches BLUEPRINT §5. No extra fields, no renames.
3. The soft-delete pair appears on exactly the twelve soft-delete tables and on none of the seven hard-delete tables.
4. Every index in the table above exists, named exactly as listed, with the field order the blueprint gives.
5. Closed-list validators derive from, or are commented as mirroring, the 1.2 constants.
6. `reports.blocks` carries all seven block variants.
7. `convex/theme_settings/preferences.ts` is unmodified.

**V**
1. `npm run typecheck` — clean. **This is a real check, not a formality:** `_generated/dataModel.d.ts` types `DataModel` off `../schema.js`, so a malformed table definition surfaces here.
2. `npm run dev` — the window still opens (the renderer does not import the schema, so this only guards against a syntax error breaking the build graph).
3. `grep -c "defineTable" convex/schema.ts` → `19`.
4. **Blocked:** `npx convex dev` pushing without a validation error. Mark 1.5 `[~]` per §0.3, with the note `blocked: needs npx convex dev (interactive login)`.

---

### 1.6 Deletion ledger — `convex/deletions.ts`, `convex/crons.ts`

**Build.** The soft-delete primitive every later phase calls. BLUEPRINT §7.2, D12, D13; SPEC
§86–§88; Invariant 6.

`convex/deletions.ts`:

```ts
/** Internal helper, not a Convex function. Called by every delete mutation in later phases. */
export async function softDeleteBatch(
  ctx: MutationCtx,
  args: { kind: string; label: string; records: ReadonlyArray<{ table: TableNames; id: GenericId<TableNames> }> },
): Promise<string>   // returns the batchId

export const undo = mutation({ args: { batchId: v.string() }, returns: v.null(), … })
export const listRecent = internalQuery({ … })
export const purgeExpired = internalMutation({ … })
```

`softDeleteBatch` semantics:

1. Mint a `batchId` — use `crypto.randomUUID()`; it is available in the Convex runtime and needs
   no dependency.
2. `ctx.db.patch` each record with `{ deletedAt: now, deleteBatchId: batchId }`.
3. `ctx.db.insert('deletions', { batchId, kind, label, createdAt: now })`.
4. Return `batchId`. Callers hand it to the Undo toast.

The caller collects the hierarchy, not this helper. `softDeleteBatch` does not know that a
Workspace owns Source Games — the cascade lists in BLUEPRINT §7.2 belong to `workspaces.remove`,
`sourceGames.remove`, and so on, built in Phases 2–4. Keeping the helper ignorant of the hierarchy
is what lets one helper serve all eight record kinds. **Do not build a cascade registry here.**

`undo({ batchId })`:

1. Look up the `deletions` row by `by_batchId`. Unknown or already-`undoneAt` → return without
   error (Undo is idempotent; a double-click must not throw).
2. For every soft-deletable table, query records with `deleteBatchId === batchId` and patch both
   fields back to undefined. Under `exactOptionalPropertyTypes`, removing an optional Convex field
   is `ctx.db.patch(id, { deletedAt: undefined, deleteBatchId: undefined })` — Convex treats
   `undefined` in a patch as field removal. Confirm against the installed Convex 1.45 typings and
   comment the line, because it reads like a bug otherwise.
3. Stamp `undoneAt: Date.now()` on the ledger row.
4. Iterating twelve tables per undo is fine at single-coach scale. Mark it:
   `// ponytail: scans the twelve soft-deletable tables per undo; add a by_deleteBatchId index per table if undo latency shows up.`

`purgeExpired` (internal mutation, cron-driven):

1. `deletions` rows with `createdAt < now - 24h` **and** `undoneAt === undefined`.
2. For each, hard-`delete` every record carrying that `deleteBatchId`, then the ledger row.
3. Also purge `bulkEdits` rows older than 24h (BLUEPRINT §5.4 says the same cron owns them).
4. An undone batch is **never** purged — BLUEPRINT §10's last row. Test the `undoneAt` guard
   before the age guard so the intent is obvious in the code.

`convex/crons.ts`: `crons.daily('purge expired soft deletes', { hourUTC: 8, minuteUTC: 0 }, internal.deletions.purgeExpired, {})`. One cron, nothing else.

**Files changed:** `convex/deletions.ts` (new), `convex/crons.ts` (new).

**AC**
1. `softDeleteBatch` mints one `batchId`, stamps every passed record, writes exactly one `deletions` row, and returns the id.
2. `undo` restores every record in the batch and is idempotent on an unknown or already-undone batch.
3. `purgeExpired` never touches a batch with `undoneAt` set, regardless of age.
4. `purgeExpired` also purges `bulkEdits` older than 24 hours.
5. `crons.ts` registers exactly one daily job.
6. Every Convex function declares `args:` and `returns:` (matching `preferences.ts`).
7. No hierarchy or cascade knowledge lives in `deletions.ts`.
8. The 24-hour window is one named exported constant, not an inline `86400000`.

**V**
1. `npm run typecheck` — clean. `internal.deletions.purgeExpired` resolves via the `AnyApi` stub; `ctx.db.query('snaps')` is fully typed off 1.5's schema.
2. `grep` the file for `86400000` → no bare literal.
3. **Blocked:** the TASKS.md round-trip (soft-delete a seeded row, read it back hidden, undo, read it back present) needs a live deployment. Mark 1.6 `[~]` per §0.3 with the same blocker note. Write the exact round-trip commands into the completion report so the owner can run them in one paste after `npx convex dev`.

---

### 1.10 UI primitives (executed before 1.7 — see §0.7)

**Build.** Eleven primitives in `src/components/ui/`: `dialog`, `dropdown-menu`, `select`,
`checkbox`, `input`, `textarea`, `toast`, `tabs`, `tooltip`, `popover`, `table`.

**Read this before starting — the word "ShadCN" is a trap here.** BLUEPRINT §3 says "ShadCN
components (vendored, not a dependency)" and then fixes the added-dependency list at three
packages. Real ShadCN copy-paste output imports `@radix-ui/react-dialog`, `@radix-ui/react-select`,
and so on — nine or ten Radix packages for this list. **Those are not permitted.** The existing
`src/components/ui/button.tsx` is already the resolution: hand-written, `cva` variants, `cn()`,
native `<button>`, zero Radix. Every primitive here follows that precedent.

So: **native platform element first, a few lines of React second, never a dependency.** Chromium
in Electron 44 supports everything needed.

| Primitive | Built on | Notes |
| --- | --- | --- |
| `dialog` | native `<dialog>` + `showModal()` | Free focus trap, free `Esc`, free backdrop, free top-layer. Do not hand-roll a modal. |
| `popover` | native Popover API (`popover` / `popovertarget`) | Free light-dismiss and top-layer stacking. Used by cell-note popovers in 5.11. |
| `dropdown-menu` | the `popover` primitive + `role="menu"` / `role="menuitem"` | Arrow-key roving tabindex, `Esc` to close, `Enter`/`Space` to activate. |
| `select` | native `<select>` | Free keyboard, typeahead, and platform styling. Phase 4.9's inline terminology creation needs a combobox — that is a Phase 4 concern; do not pre-build it. |
| `checkbox` | native `<input type="checkbox">` | Styled label wrapper. |
| `input` / `textarea` | native | `cva` sizing to match `button.tsx`'s `h-9` / `h-8`. |
| `tabs` | `role="tablist"` buttons + panels | Left/Right arrow navigation, `aria-selected`, `aria-controls`. Serves the 1.7 tab strips. |
| `tooltip` | native `title` attribute | Zero code, correct on keyboard focus, screen-reader-announced. Upgrade only if a design need appears. Mark it `ponytail:`. |
| `table` | styled `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` wrappers | Real table semantics for screen readers (Invariant: 11.3). No `div` grid. Compact density per SPEC §109. |
| `toast` | context + provider + fixed region with `aria-live="polite"` | See below. |

The `toast` primitive is the one with real logic, and 1.8 depends on its shape:

```ts
export interface ToastAction { readonly label: string; readonly onAction: () => void }
export interface ToastOptions {
  readonly message: string
  readonly action?: ToastAction        // the Undo action
  readonly durationMs?: number         // default 8000; Undo needs reading time
}
export function ToastProvider({ children }: { children: ReactNode }): ReactNode
export function useToast(): { readonly show: (options: ToastOptions) => void; readonly dismiss: (id: string) => void }
```

- Mount `ToastProvider` in `src/main.tsx` inside `ThemeProvider`, above `App`.
- The region is `aria-live="polite"` with `role="status"`; the action is a real `<button>`, so
  `Cmd/Ctrl+Z` wiring in 11.1 has something focusable to target.
- One toast visible at a time is enough at this scale. Mark it:
  `// ponytail: one toast at a time; add a stack if two undoable actions ever overlap.`
- Auto-dismiss must be pausable on hover/focus, or an Undo can vanish mid-reach.

Also in this step: create `src/routes/scratch-page.tsx` per §0.8, rendering one instance of each
of the eleven primitives plus the 1.4 terminology lists. It is the verification surface for
1.4, 1.8, 1.9, and this step, and it gets deleted in §2.

**Files changed:** eleven new files under `src/components/ui/`, `src/routes/scratch-page.tsx`
(new), `src/main.tsx` (mount `ToastProvider`).

**AC**
1. Eleven primitives exist, each a named export in its own kebab-case file.
2. **No `@radix-ui/*` import anywhere.** No new dependency was installed.
3. Each follows `button.tsx`: `cva` where it has variants, `cn()`, an exported props type
   extending the native element's HTML attributes, explicit `: ReactNode` return.
4. `dialog` closes on `Esc` and traps focus (inherited from native `<dialog>`).
5. `dropdown-menu` and `tabs` are operable by keyboard alone, with correct ARIA roles.
6. `table` renders real table elements.
7. `toast` announces via `aria-live`, renders its action as a focusable `<button>`, and pauses
   auto-dismiss on hover and on focus.
8. Every primitive is legible in both light and dark themes (they use the `index.css` tokens, not
   literal colors).

**V**
1. `npm run typecheck` — clean.
2. `npm run dev`, navigate to `#/scratch`: each of the eleven renders once, no console error.
3. Keyboard-only pass on `/scratch`: `Tab` reaches every control in visual order with a visible
   focus ring; the dialog opens, traps `Tab`, and closes on `Esc`; the dropdown opens and its
   items move under Up/Down; the tabs switch under Left/Right.
4. Toggle the theme with the sidebar control while `/scratch` is open — every primitive stays legible.
5. `grep -r "@radix-ui" src/ package.json` → no match.

---

### 1.7 Router

**Build.** `HashRouter` with the full twenty-four-route table of BLUEPRINT §8, every screen a
placeholder. BLUEPRINT D15: hash routing is what survives `file://` in the packaged app — do not
substitute `BrowserRouter`.

Structure. Three nested layouts, matching BLUEPRINT §8's closing paragraph and SPEC §108:

```
/ (root layout: AppSidebar + <Outlet/> + the Convex-disconnected banner)
├── index                              → Home                      (#2)
├── seasons/:seasonId                  → Season View               (#3)
│   └── new                            → Create Opponent           (#4, dialog later)
├── w/:workspaceId (workspace layout: tab strip Overview · Source Games · Opponent Data · Tendencies · Reports)
│   ├── index                          → Weekly Opponent Overview  (#5)
│   ├── games                          → Source Games List         (#6)
│   │   ├── new                        → Add Source Game           (#7, dialog later)
│   │   └── :gameId (source-game layout: tab strip Play Log · Quick Notes · Must Review · Play Diagrams)
│   │       ├── index                  → Play Log                  (#10)
│   │       ├── import                 → Hudl CSV Import / Mapping (#8, #9 = step 2)
│   │       ├── snap/:snapId           → Play Detail               (#11)
│   │       ├── notes                  → Quick Notes               (#12)
│   │       ├── review                 → Must Review Queue         (#13)
│   │       └── diagrams               → Play Diagram Gallery      (#14)
│   │           └── :diagramId         → Play Designer             (#15)
│   ├── data                           → Opponent Data             (#16)
│   ├── tendencies                     → Tendencies / Alerts       (#17)
│   └── reports                        → Report List               (#18)
│       └── :reportId                  → Report Builder            (#19)
│           └── preview                → Report Preview            (#20)
├── templates                          → Coaching Templates        (#21)
│   └── :templateId                    → Template Builder          (#22)
├── settings                           → Settings                  (#23)
├── archive                            → Archived Opponents        (#24)
├── welcome                            → First Launch Setup        (#1, outside the root layout — no sidebar)
└── scratch                            → temporary, deleted in §2
```

Notes for the executing agent:

- Screens #4 and #7 are marked `(dialog)` in BLUEPRINT §8. Build them as **real routes with
  placeholders now.** Phases 3.6 and 4.2 convert them to dialogs rendered over their parent.
  Placeholder routes now cost nothing and satisfy the "twenty-four routes reachable by URL"
  verification.
- Screen #1 `/welcome` sits **outside** the root layout — First Launch has no sidebar (SPEC §4).
  Do not add first-launch redirect logic here; TASKS.md 3.2 owns that.
- Report Preview `#20` will need a chrome-free layout for `printToPDF` (BLUEPRINT D6). Nest it as
  shown for now; Phase 10.6 decides whether it leaves the root layout.
- Use `createHashRouter(routes)` + `<RouterProvider>`. Put the route table in
  `src/routes/routes.tsx` (renamed from `routes.ts` — it now holds JSX).
- Every placeholder is a distinct component in its own file under `src/routes/`, named for its
  screen (`play-log-page.tsx`, `template-builder-page.tsx`, …). Each renders its screen name as
  an `<h1>` plus its resolved route params, so the URL-reachability check is visual. One file per
  screen matches BLUEPRINT §4 ("one file per screen"); do not put twenty-four components in one file.
- Add a shared `route-placeholder.tsx` the twenty-four pages compose, so a placeholder page is
  three lines. `home-page.tsx` and `settings-page.tsx` already exist — keep them, restyle their
  bodies only if needed.

**Modifying existing files** (copy the originals to the scratchpad first, per §0.6):

- `src/routes/routes.ts` → `routes.tsx`: the two-item `ROUTES` array becomes the sidebar nav
  list (Home, Templates, Archive, Settings — BLUEPRINT §8) plus the router's route table. Keep
  the `ROUTES`-as-`const`-with-`satisfies` pattern for the nav list; it is good and the sidebar
  already consumes it.
- `src/components/app-sidebar.tsx`: replace the `activeRoute`/`onNavigate` props with
  `NavLink`. `NavLink`'s `isActive` replaces the `activeRoute === id` comparisons, including
  `aria-current="page"` (which `NavLink` sets itself — remove the manual one). The props
  interface becomes empty; delete it rather than leaving `AppSidebarProps` as `{}`.
- `src/app.tsx`: the two-screen `useState` router goes away. `App` becomes the root layout
  element: sidebar, the `isConvexConfigured` banner (keep it verbatim — BLUEPRINT §10 requires
  it and 11.2 refines it), and `<Outlet/>`. **Delete the now-false `ponytail:` comment** that
  says a router is unnecessary.
- `src/main.tsx`: `<App/>` becomes `<RouterProvider router={router}/>`. `ToastProvider` from
  1.10 stays mounted above it. Keep `withConvex`, `ErrorBoundary`, and `ThemeProvider` exactly as
  they are — the null-client degradation in `convex-client.ts` is deliberate and BLUEPRINT §10
  depends on it.
- `ErrorBoundary` currently wraps the whole tree. BLUEPRINT §7.6 wants it per route. Add it to
  the root layout around `<Outlet/>` **in addition** to the existing top-level one; a route error
  should not blank the sidebar. Leave the outer one in place.

**Files changed:** `src/routes/routes.tsx` (renamed + rewritten), twenty-two new
`src/routes/*-page.tsx` placeholders, `src/routes/route-placeholder.tsx` (new),
`src/routes/home-page.tsx`, `src/routes/settings-page.tsx`, `src/components/app-sidebar.tsx`,
`src/app.tsx`, `src/main.tsx`.

**AC**
1. All twenty-four BLUEPRINT §8 screens have a route, at the exact paths §8 lists.
2. `createHashRouter` is used; no `BrowserRouter`, no `createBrowserRouter`.
3. Sidebar carries exactly Home, Templates, Archive, Settings, using `NavLink`.
4. The workspace tab strip (Overview, Source Games, Opponent Data, Tendencies, Reports) renders on every `/w/:workspaceId/*` route.
5. The Source Game tab strip (Play Log, Quick Notes, Must Review, Play Diagrams) renders on every `/w/:workspaceId/games/:gameId/*` route.
6. `/welcome` renders without the sidebar.
7. Every placeholder shows its screen name and its resolved params.
8. The `isConvexConfigured` banner still renders when `VITE_CONVEX_URL` is unset (it currently is — so it must be visible on launch).
9. `ErrorBoundary` wraps `<Outlet/>` as well as the app root.
10. No dead code left behind: no unused `RouteId`, no orphaned `onNavigate`. `noUnusedLocals` will catch most of this; check the rest by eye.

**V**
1. `npm run typecheck` — clean.
2. `npm run dev`. Type each of the twenty-four hash URLs into the address bar via the dev tools console (`location.hash = '#/w/x/games/y/diagrams/z'`) and confirm each renders its named placeholder, not a 404 and not a blank pane. Record the twenty-four in the completion report.
3. Click every sidebar item and every tab in both tab strips; each navigates and shows an active state.
4. Deep-link check: reload the window on `#/w/x/games/y/snap/z`; the route restores (this is the `file://` survival property D15 exists for).
5. `npm run build` — clean, then confirm the packaged renderer still routes (`out/renderer/index.html` loads under `file://`).

---

### 1.8 Autosave and undo hooks — `src/lib/db/`

**Build.** The two hooks that make BLUEPRINT §7.1 and §7.2 real. SPEC §89, Invariant 10: there is
no Save button, so these hooks are the entire persistence story for routine work.

#### `src/lib/db/use-autosave.ts`

```ts
export interface AutosaveOptions { readonly delayMs?: number }   // default 400
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'error'

export function useAutosave<T>(
  value: T,
  save: (next: T) => Promise<void>,
  options?: AutosaveOptions,
): {
  readonly draft: T
  readonly setDraft: (next: T) => void
  readonly flush: () => void       // for Enter / Tab / blur — commit now, skip the debounce
  readonly status: AutosaveStatus
}
```

Behavior (BLUEPRINT §7.1):

- Holds a local draft so typing never round-trips.
- Debounces `save` by `delayMs` (400 default).
- **Flushes on blur, on unmount, and on `beforeunload`.** Unmount flush is the one that gets
  forgotten and the one that loses a coach's last cell edit when they navigate away mid-type.
- `flush()` is exposed so the Play Log's Enter/Tab/blur commits bypass the debounce entirely
  (BLUEPRINT §7.1 draws exactly this distinction: cells flush immediately, long text debounces).
- When `value` changes from outside (Convex reactivity, another window — BLUEPRINT §10's
  "two windows editing one Snap" row) **and no local edit is pending**, adopt the incoming value.
  If an edit *is* pending, keep the draft; do not stomp what the coach is typing.
- A rejected `save` sets `status: 'error'` and **keeps the draft**. CLAUDE.md: surface failures
  without silently discarding user data. Never swallow the rejection, never reset to the server
  value on failure.
- Takes `save` as a plain function, so the hook imports nothing from Convex. That keeps it
  testable and, right now, verifiable with no deployment.

#### `src/lib/db/use-undoable-mutation.ts`

```ts
export function useUndoableMutation<TArgs>(
  run: (args: TArgs) => Promise<string>,           // resolves to the batchId
  undo: (args: { batchId: string }) => Promise<void>,
  describe: (args: TArgs) => string,               // 'Deleted Week 3 — Central' → the toast message
): (args: TArgs) => Promise<void>
```

- Runs the mutation, takes the returned `batchId`, and shows a toast (1.10's `useToast`) with a
  single `Undo` action wired to `undo({ batchId })`.
- One Undo action per toast (SPEC §88, `ubiquitous-language.md`: Undo is *the single reversal*).
  No undo stack, no history.
- Same shape serves bulk edits via `snaps.undoBulkUpdate` (BLUEPRINT §7.2) — which is why `undo`
  is a parameter rather than a hardcoded `deletions.undo` reference.
- A failed undo shows an error toast and does not silently no-op.

Also create `src/lib/db/index.ts` re-exporting both, so later features have one import path.

**Files changed:** `src/lib/db/use-autosave.ts`, `src/lib/db/use-undoable-mutation.ts`,
`src/lib/db/index.ts` (all new), `src/routes/scratch-page.tsx` (verification surfaces).

**AC**
1. `useAutosave` debounces at 400 ms by default and flushes on blur, unmount, and `beforeunload`.
2. `flush()` commits immediately, bypassing the debounce.
3. An external `value` change is adopted only when no local edit is pending.
4. A rejected save yields `status: 'error'` and preserves the draft. No `catch {}` that drops the error.
5. `use-autosave.ts` imports nothing from `convex/`.
6. `useUndoableMutation` shows exactly one toast with exactly one `Undo` action.
7. No Save button appears anywhere on the scratch route or in either hook's API.

**V**
1. `npm run typecheck` — clean.
2. On `/scratch`, wire a throwaway text field to `useAutosave` with a `save` that writes to
   `localStorage` under a scratch key. Type, wait, reload the window: the value survives with no
   Save button. This is the TASKS.md 1.8 verification, run against local storage rather than
   Convex — note the substitution in the completion report.
3. Type and immediately reload without pausing: the `beforeunload` flush preserves the text.
4. Type and immediately navigate to another scratch tab: the unmount flush preserves the text.
5. Point `save` at a function that rejects: `status` becomes `'error'`, the typed text is still on
   screen, and the console carries the rejection.
6. Wire a throwaway `useUndoableMutation` (both callbacks local no-ops returning a fake batch id):
   the toast appears, `Undo` fires the undo callback once, and the toast is reachable by `Tab`.

---

### 1.9 Reorder hook — `src/lib/reorder.ts`

**Build.** The one reordering mechanism for template sections, template fields, Play Log column
headers, and Report blocks (BLUEPRINT §7.4; SPEC §23, §34, §80). D9: native HTML5 drag-and-drop
plus keyboard buttons, **no drag-and-drop library** — and that is also the accessibility
requirement (11.3: "keyboard paths for every drag interaction"), not just a size preference.

```ts
export interface ReorderOptions {
  readonly itemCount: number
  readonly onReorder: (fromIndex: number, toIndex: number) => void
  readonly label: (index: number) => string        // for the aria-live announcement
}

export function useReorder(options: ReorderOptions): {
  /** Spread onto the draggable row/header/handle. */
  readonly getItemProps: (index: number) => {
    readonly draggable: true
    readonly onDragStart: (e: DragEvent) => void
    readonly onDragOver: (e: DragEvent) => void
    readonly onDragEnd: () => void
    readonly onDrop: (e: DragEvent) => void
    readonly 'aria-grabbed'?: boolean
  }
  readonly moveUp: (index: number) => void
  readonly moveDown: (index: number) => void
  readonly canMoveUp: (index: number) => boolean
  readonly canMoveDown: (index: number) => boolean
  readonly dragOverIndex: number | null            // for the drop-indicator style
  /** Render this once per list; announces every move. */
  readonly announcement: string
}
```

Notes:

- `onDragOver` must `preventDefault()` or the browser refuses the drop. This is the single most
  common HTML5 DnD mistake; get it right once here and no later phase re-learns it.
- The hook owns index math only; the caller owns persistence. Persisting a reorder writes new
  `order` values or a new array in one mutation (BLUEPRINT §7.4) — that is Phase 2's job, not
  this hook's.
- `moveUp`/`moveDown` render as real `<button>`s in the consuming component, with accessible
  names like `Move Run Game up`. First item's `moveUp` and last item's `moveDown` are `disabled`
  via `canMoveUp`/`canMoveDown`.
- `announcement` feeds an `aria-live="polite"` node so a screen-reader user hears
  `Run Game moved to position 2 of 5`. Without it, keyboard reordering is silent and unusable.
- Pure aside from `useState`/`useCallback`. No DOM measurement, no `getBoundingClientRect`, no
  animation.

**Files changed:** `src/lib/reorder.ts` (new), `src/routes/scratch-page.tsx` (verification surface).

**AC**
1. Reorder works by mouse drag and by `moveUp`/`moveDown` alone.
2. `onDragOver` calls `preventDefault()`.
3. `canMoveUp(0)` is `false`; `canMoveDown(itemCount - 1)` is `false`.
4. Every move produces a new `announcement` naming the item and its new position.
5. No drag-and-drop dependency was added.
6. The hook does not persist anything and knows nothing about Convex.

**V**
1. `npm run typecheck` — clean.
2. On `/scratch`, a throwaway five-item list: drag item 4 above item 2 with the mouse; the order changes and a drop indicator was visible during the drag.
3. Reorder the same list to reverse order using **only** the keyboard — `Tab` to a Move button, `Enter`, repeat. Never touch the mouse.
4. Confirm the first item's Move-up and the last item's Move-down are disabled and skipped by `Tab`.
5. Confirm the `aria-live` node's text changes on every move (visible in the DOM inspector).

---

## 2. Phase Close-Out

Run in order, after 1.9 passes.

1. **Delete the scratch route.** Remove `src/routes/scratch-page.tsx` and its entry in
   `routes.tsx`. Remove any scratch `localStorage` key it wrote. `grep -r "scratch" src/` → no
   match. Nothing in Phase 2 may depend on it.
2. `npm run typecheck` — clean.
3. `npm test` — passes, unchanged (`theme.test.ts` only).
4. `npm run build` — clean.
5. `npm run dev` — the window opens on Home, the sidebar navigates, the Convex-unconfigured
   banner is visible, and the theme toggle still works.
6. **Update `.claude/TASKS.md`.** Mark 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10 as `[x]` **only**
   where the V steps above actually ran and passed. Mark 1.5 and 1.6 `[~]` with a trailing note:
   `blocked on npx convex dev`. Per the TASKS.md legend, `[x]` requires the Verify line to have
   run — do not mark a step `[x]` on the strength of a typecheck alone.
7. **Write the completion report** containing:
   - The printed output of every one-shot verification in 1.2, 1.3, 1.4.
   - The list of twenty-four hash URLs confirmed reachable.
   - The exact `npx convex dev` follow-up commands for the blocked 1.5 and 1.6 verifications, in
     one pasteable block.
   - Every deviation from this plan, with its reason.
   - The deferred `convex/domain/` unit tests (§0.5) as named debt.
8. **Do not start Phase 2.** Stop and report.

---

## 3. Assumptions

Each of these is a decision the spec does not make. They are recorded in the relevant module's
header comment as well as here, and each is a one-constant change to revise.

| # | Assumption | Where | Why it is needed | Risk if wrong |
| --- | --- | --- | --- | --- |
| A1 | Field Zone boundaries are Backed Up `own 1–10`, Own Territory `own 11–39`, Midfield `own 40 – opp 40`, Plus Territory `opp 39–21`, Red Zone `opp 20–6`, Goal Line `opp 5–1` | `fieldZone.ts` | SPEC §22 fixes the six names and forbids coach configuration, but states no numbers | Low. One exported table; every consumer is derived, nothing is stored (D10), so a revision is instantly global with no migration |
| A2 | Distance buckets are Short `≤ 3`, Medium `4–6`, Long `≥ 7`, on downs 2–4; down 1 is always `1st Down` | `situation.ts` | SPEC §60 names ten groups, no thresholds | Low. Same reasoning as A1 |
| A3 | Provenance equality compares the canonical display string, trimmed, not the typed value | `provenance.ts` | Hudl exports strings, Snaps hold typed values; a structural compare would mark every imported numeric cell `Coach Edited` on load | Medium. A formatting change in `formatCoreValue` silently reclassifies provenance. Mitigated by keeping one formatter (1.2) |
| A4 | `playNumber` is on `snaps.core` but not in `CORE_FIELDS` | `coreFields.ts`, `schema.ts` | SPEC §15 lists fourteen fields without it; SPEC §95 makes it a Hudl Reference; TASKS.md 4.3's 24-column count requires exactly fourteen core columns | Low. If the owner wants it as a Play Log column, add one registry entry |
| A5 | Down 1 has no Short/Medium/Long split | `situation.ts` | SPEC §60's list has one `1st Down` entry and nine split entries | Low |
| A6 | `distance === 0` classifies as `Short` | `situation.ts` | Goal-to-go on the goal line has to land somewhere | Low |
| A7 | `clock` and `personnel` are unvalidated short text | `coreFields.ts` | SPEC §95 wants clock only as a Hudl lookup; SPEC §97 forbids personnel package management | Low |
| A8 | `quarter` and `down` carry no upper bound in the registry | `coreFields.ts` | Overtime exists; the spec sets no ceiling. Range guards, if wanted, belong to the Phase 4 cell editor | Low |
| A9 | The daily purge cron runs at 08:00 UTC | `crons.ts` | D13 says daily; no hour is specified. Chosen to fall outside typical US evening film-study hours | Low |
| A10 | Screens #4 and #7 ship as placeholder routes now, becoming dialogs in Phases 3.6 / 4.2 | `routes.tsx` | BLUEPRINT §8 marks them `(dialog)` but §8's verification wants twenty-four reachable routes | Low |
| A11 | Built-in `FORMATIONS` and `MOTIONS` hold 15–30 common high-school entries each | `terminology.ts` | SPEC §19–§20 say "common terminology" and enumerate nothing | Medium. Content judgment, not architecture. Coaches extend inline (4.9), and there are no aliases (§96), so a thin list is safe and a wrong entry is only clutter. Worth an owner review of the final lists |

---

## 4. Risks

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | **"ShadCN" in BLUEPRINT §3 cannot be satisfied literally.** Real ShadCN output needs ~10 `@radix-ui/*` packages; §3 caps added dependencies at three and says "vendored, not a dependency" | Step 1.10 is a different, larger job than "copy from ui.shadcn.com" | Native-element-first primitives in `button.tsx`'s existing style. `<dialog>` and the Popover API cover the genuinely hard parts (focus trap, top layer, light dismiss) for free. **Raise this with the owner in the completion report**; it is a blueprint ambiguity, not an implementation choice |
| R2 | 1.5 and 1.6 ship unverified at runtime | A schema or index error surfaces in Phase 2 instead of now | The `dataModel.d.ts`-from-`schema.ts` derivation makes `typecheck` a genuine structural check. Blocked verifications are written as pasteable commands in the completion report so they run the moment the owner logs in |
| R3 | **No version control** (§0.6) | A bad edit to `app.tsx`, `main.tsx`, `app-sidebar.tsx`, or `routes.ts` is unrecoverable | Copy those four to the scratchpad before 1.7. Also worth telling the owner plainly: `git init` before Phase 2 |
| R4 | 1.7 rewrites four working Phase 0 files | The theme feature, the Convex-null degradation, or the drag region breaks | AC 8 and V 5 of 1.7 test exactly those. `withConvex`, `ErrorBoundary`, `ThemeProvider`, and the `.app-drag-region` header are explicitly out of scope for edits |
| R5 | `exactOptionalPropertyTypes` vs Convex optional fields, specifically clearing a field with `patch(id, { deletedAt: undefined })` in `deletions.undo` | Undo silently fails to restore, which breaks Invariant 6 | Confirm the semantics against the installed Convex 1.45 typings during 1.6 and comment the line. Flag it as the highest-value item in the blocked round-trip verification |
| R6 | Convex 1.45 typing of `v.union(...arr.map(v.literal))` from a spread | 1.5's derive-validators-from-constants approach may not typecheck | Documented fallback in 1.5: write the literals explicitly plus a source-of-truth comment. Do not let the lists diverge silently |
| R7 | Deferred `convex/domain/` unit tests | BLUEPRINT §11 names these exact modules as the project's primary verification, and Phase 6 (CSV coercion) and Phase 9 (aggregation) build directly on them | Per the user's instruction for this plan. Recorded as `ponytail:` debt in each module and named in the completion report. **Recommend writing them before Phase 6** |
| R8 | Native `<select>` cannot express Phase 4.9's inline terminology creation | A combobox is needed later | Deliberately out of scope here. The `select`/`terminology` distinction in `CORE_FIELDS` (1.2) already carries the information Phase 4.9 needs, so it becomes a rendering change, not a data-model change |
| R9 | `noUncheckedIndexedAccess` makes registry lookups `T | undefined` | Tempting non-null assertions (`!`) spread through the codebase | 1.2 AC 5 requires a total `Record<CoreFieldKey, CoreField>` lookup. Get it right in the first module and every later phase copies the pattern |
| R10 | Scratch route left behind | Dead code, and a `/scratch` route in a shipped app | §2 step 1 deletes it, with a `grep` gate |

---

## 5. Files Likely to Change

**New — `convex/` (7)**

```
convex/domain/coreFields.ts        1.2
convex/domain/fieldZone.ts         1.3
convex/domain/situation.ts          1.3
convex/domain/provenance.ts         1.3
convex/domain/terminology.ts        1.4
convex/deletions.ts                 1.6
convex/crons.ts                     1.6
```

**New — `src/` (36)**

```
src/components/ui/dialog.tsx         checkbox.tsx  input.tsx     textarea.tsx
src/components/ui/dropdown-menu.tsx  select.tsx    toast.tsx     tabs.tsx
src/components/ui/tooltip.tsx        popover.tsx   table.tsx                     1.10  (11)
src/routes/scratch-page.tsx                                                      1.10  (temporary)
src/routes/route-placeholder.tsx                                                 1.7
src/routes/*-page.tsx               22 screen placeholders                       1.7
src/lib/db/use-autosave.ts  use-undoable-mutation.ts  index.ts                   1.8   (3)
src/lib/reorder.ts                                                               1.9
```

**Modified — existing (8)**

```
package.json / package-lock.json    1.1   four dependencies
tsconfig.json                       1.2   @convex/* path alias
electron.vite.config.ts             1.2   @convex renderer alias
convex/schema.ts                    1.5   rewritten: empty → 19 tables
src/main.tsx                        1.10  mount ToastProvider
                                    1.7   RouterProvider replaces <App/>
src/app.tsx                         1.7   root layout: sidebar + banner + <Outlet/> + ErrorBoundary
src/components/app-sidebar.tsx      1.7   NavLink; props removed; four nav items
src/routes/routes.ts → routes.tsx   1.7   renamed; nav list + 24-route table
src/routes/home-page.tsx            1.7   placeholder body
src/routes/settings-page.tsx        1.7   placeholder body
.claude/TASKS.md                    §2    checkboxes and blocker notes
```

**Explicitly not touched**

```
electron/main.ts                              no IPC until Phase 10.7 (printToPDF)
convex/theme_settings/preferences.ts          TASKS.md 3.1 owns the settings migration
src/features/theme-settings/*                 Phase 0, complete and verified
src/components/error-boundary.tsx             wrapped in a second place, not edited
src/components/ui/button.tsx                  the style precedent — read it, don't change it
src/lib/utils.ts, src/index.css, src/index.html
.env                                          not created; see §0.3
```

**Never created in this phase**

```
convex/domain/starterTemplates.ts   2.1
convex/domain/aggregate.ts           9.1
convex/domain/csvMapping.ts         6.1
src/lib/shortcuts.ts                 11.1
src/features/*                       Phase 2+
electron/preload.ts                  10.7
```

---

## 6. Definition of Done

Phase 1 is complete when all of the following hold:

1. `npm run typecheck` clean.
2. `npm test` passes, unchanged.
3. `npm run build` clean; the packaged renderer loads and routes under `file://`.
4. `npm run dev` opens on Home; the sidebar navigates; the Convex-unconfigured banner shows; the theme toggle works.
5. All twenty-four BLUEPRINT §8 routes are reachable by URL and by click; each renders its named placeholder.
6. `CORE_FIELDS` holds fourteen fields; the three fixed option lists match SPEC §16–§18 verbatim.
7. Every Field Zone and Down-and-Distance boundary in §1.3's tables produces the stated value.
8. All three provenance states resolve correctly, and `restoredValueFor` returns the original.
9. `convex/schema.ts` defines nineteen tables with every BLUEPRINT §5 index.
10. `deletions.ts` and `crons.ts` typecheck against the real schema; the round-trip verification is written up as blocked.
11. `useAutosave` persists with no Save button and survives a reload; `useUndoableMutation` shows one toast with one Undo.
12. A five-item list reorders by mouse **and** by keyboard alone, with an `aria-live` announcement on every move.
13. Eleven UI primitives render, are keyboard-operable, and are legible in both themes.
14. No dependency outside the four in 1.1 was added. No `@radix-ui/*` anywhere.
15. The scratch route is deleted; `grep -r "scratch" src/` finds nothing.
16. `TASKS.md` reflects reality: `[x]` only where a Verify line ran and passed, `[~]` on 1.5 and 1.6.
17. The completion report exists, with the blocked-verification commands, the deviations, and the deferred-test debt.
