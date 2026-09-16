# Phase 9 Opponent Data and Tendencies — completion report

Implemented on `main` in one commit per plan step. The supplied untracked plan remains unchanged
and excluded from commits. No schema, dependency, package script, or new persistent test changes.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 9.1 | `7f6aca9` | Pure grouping catalog, extraction, distinct Snap aggregation, deterministic sorting, and number formatters. Typecheck and one-off Node checks passed for Formation, Formation + Play Concept, blank groups, absent yards, and zero inputs. |
| 9.2 | `70b9e93` | Live included-game scope and grouping catalog query. Convex sync/typecheck passed. Live fixture query returned seven core fields plus one merged Coverage and Pressure; Short Text, Long Text, and Number were absent, including after excluding Game B. |
| 9.3 | `f817948` | Reactive Opponent Data screen, persisted game checkboxes, two grouping controls, results, overlap note, and loading/empty/not-found states. Sync/typecheck, live tables, and Electron fixture checks passed. Source Games reflected scope changes. |
| 9.4 | `c1f8f5d` | Derived Down and Distance Situation and Field Zone, using existing domain helpers. Sync/typecheck and both Electron fixture tables passed. |
| 9.5 | `9cdd673` | Default category vocabulary, server-recomputed frozen snapshot creation, shared snapshot/category components, and row creation dialog. Sync/typecheck passed. Keyboard-opened Electron dialog created the expected row; live checks verified immutability after new games and source edits, and rejected invalid row/key/category/title requests. |
| 9.6 | `db6d1b9` | Validated updates/custom categories, workspace diagram query, and autosaving tendency cards. Sync/typecheck and Electron checks passed for persisted text, retained failed draft/Retry/recovery, canonical category spelling, diagram attach/clear/delete/Undo, and report inclusion. |
| 9.7 | `ca2930a` | Grouped Tendencies screen, optimistic delete/Undo, real route, and removed unused preview. Category changes wait for text saves to prevent remounting a failed draft. Sync/typecheck, category order, exact record restoration, Overview counts, empty state, and failed-draft guard passed. |

## Verification commands and results

- `npm run typecheck`: passed before every implementation commit and at the final gate.
- `npx convex dev --once`: passed for each backend step and at the final gate. Generated API
  includes `opponentData` and `tendencies`.
- `npm run build`: passed strict TypeScript, all 15 existing tests, and Electron/Vite production
  compilation. The pre-existing `preload config is missing` warning remains.
- `git diff --check`: passed. Interpretive-word scan over both features and shared tendency
  components found no matches.
- `npx convex run opponentData:listGroupingFields` and temporary `/tmp/p9-backend.mjs` modes
  `fields`, `tables`, `freeze`, and `edges`: passed against the isolated fixture.
- Additional one-off Node checks passed for distinct Cartesian combinations, normalized name/type
  merging, checkbox false versus unset, malformed stored values, and canonical categories.
- Electron walkthroughs used temporary CDP scripts under `/tmp/p9-*.mjs`, with the app launched via
  `npm run dev -- --remote-debugging-port=9338`. No verification scripts were added to the repo.
- Final keyboard-only pass succeeded: Workspace tab strip → game toggle → both grouping selects
  → create → Tendencies tab → edit → delete → Undo, without mouse input. Native type-ahead changed
  both grouping selections, and command-select-all replaced the prefilled title.
- Light/dark spot checks passed for both screens. Screenshots were inspected at
  `/tmp/p9-data-{light,dark}.png` and `/tmp/p9-tendencies-{light,dark}.png`; theme was restored.
- Persistent tests excluded by approved plan; aggregation and snapshot behavior were verified by
  live queries over the §7 fixture, plus one-off Node checks and Electron walkthroughs.

The initial UI script needed waits for database connection/reload completion and a selector scoped
to the tendency card (the Workspace menu also has a Delete button). These were verification-harness
corrections; no Workspace was deleted by those checks. Native select type-ahead is used for keyboard
selection because CDP arrow events do not operate macOS popup menus reliably.

## Decisions and assumptions

| ID | Final choice and tradeoff |
| --- | --- |
| D1 | Frequency and Percentage share the stored fraction `frequency`; display is a whole percent. |
| D2 | Games to Include reuses the persisted `sourceGames.included` flag; absent means included. |
| D3 | Multi-value fields contribute once per distinct value/combination; denominator is distinct Snaps in scope. The overlap note explains totals above 100%. |
| D4 | Template fields merge by whitespace-normalized, lowercase name plus type. |
| A1 | Core order is Personnel, Formation, Motion, Play Type, Play Concept, Direction, Hash. |
| A2 | Structured template types are select, multiSelect, checkbox, rating, and tags. |
| A3 | Checkboxes show Yes/No, rating shows its number, and absent or invalid values show `(none)`. |
| A4 | Template identity trims/collapses whitespace and lowercases; the first original label in newest-game/template order wins. |
| A5 | First-level groups sort by distinct Snap count, then value; second-level rows sort by count, then value. `(none)` is last on count ties, matching §7.2 (not forced below larger groups). |
| A6 | Average yards includes only finite, present yards, stays unrounded in storage, and displays one decimal; absent average displays `—`. |
| A7 | Formation/None are transient defaults and reset on remount. |
| A8 | Aggregation reads included games server-side instead of accepting client game IDs. |
| A9 | Unknown/unavailable or duplicate grouping keys return null; the UI reconciles unavailable selections. |
| A10 | Each snapshot stores one row, display labels, and included live game IDs. |
| A11 | Creation recomputes the selected row server-side, rejects absent rows, and accepts no client statistics. |
| A12 | Nine default categories are constants; custom rows use `isDefault: false`, case-insensitive matching, defaults first. |
| A13 | Creation collects title, category, and optional explanation. Title is prefilled from values (capped at 80); category is Formation for a first Formation grouping, otherwise Run Game; reports default on. |
| A14 | Titles/categories use 1–80 characters; explanation is trimmed and at most 2000. |
| A15 | Diagram choices cover all live games in the Workspace, including excluded games. Removed attachments display `Play Diagram removed`; the shared SVG respects hidden sides. |
| A16 | Default category order, alphabetical customs, then unknown categories; newest first inside each section. |
| A17 | Delete has no confirmation; the existing single-use Undo toast restores the record. |

The planned full Snap scan is retained for V1 and marked with the denormalized-counter upgrade
path. `templateTree` already filters deleted sections/fields; the new loader checks template liveness.
A deleted template removes its analysis fields without removing its games' Core Snaps.
`charting-preview.tsx` remains unchanged because Play Log imports `PlayerNotes` from it;
`tendencies-preview.tsx` had no remaining consumers and was removed.

Category selection is disabled while a card's title/explanation is unsaved. This small guard avoids
losing a failed text draft when moving the card between category sections. The error remains visible
with Retry, and correcting the text re-enables category changes. Diagram/report controls retain the
server value on failure. Creation freezes the selected grouping context while its dialog is open.

## Fixture and cleanup

The seed used §7.1 exactly, with an additional empty Long Text field to verify its exclusion.
All §7.2 expected aggregate tables matched; no expected values were changed.
IDs were recorded in `/tmp/p9-ids.json`:

- Season: `k1770aacjdba9cwj451rbta4xn8ehp7z`.
- Workspace: `kx7eaxz3t9wcg7z8gjysxdfq2s8eg7kx`.
- Template T1: `m97fmkt8mexky7nkjjerrn16118egsg9`.
- Template T2: `m975mjxy7q3jjsfxynxfwrwy5h8ehd37`.
- Game A: `k977vqxdz3nmf7q5sz1ea2war18eh8c6`.
- Game B: `k975wykw6k9pf7m57v9w16vs0d8ehvaf`.

Temporary Game C, the empty-state Workspace, and the cross-workspace diagram fixture were
soft-deleted through existing APIs. A1's Formation and both inclusion flags were restored after checks.

Final cleanup via `node /tmp/p9-backend.mjs cleanup` passed: `workspaces.remove`, `seasons.remove`,
and both `templates.remove` calls soft-deleted the fixture hierarchy. Follow-up queries returned
null for its Workspace, both Source Games, and both Templates, and empty tendency/grouping lists.
Descendants and deletion receipts follow the existing purge lifecycle.

One custom category remains intentionally: **`P9 Blitz Looks`** (`isDefault: false`) in
`tendencyCategories`. The plan excludes a category-delete API; remove this verification row from
the Convex dashboard if desired. Case-insensitive duplicate creation returned the same spelling.

## Follow-up

Phase 10 can reuse `TendencySnapshot`, `formatFrequency`, and `formatAvgYards`. Recheck snapshot
immutability when changing aggregation or report code; recheck draft retention when changing
category grouping or autosave. No Phase 10 functionality was added.
