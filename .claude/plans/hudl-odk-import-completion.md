# Hudl ODK Import — completion report

Implemented on `main` with one commit per reviewable step. The supplied untracked plan remains
unchanged and excluded from commits. No dependencies or migrations were added.

## Per-task changes and evidence

| Task | Commit | Changes and verification |
| --- | --- | --- |
| 1 | `9b316f1` | Registered ODK as an optional Core Snap field and schema value. Registry test and `npm run typecheck` passed. |
| 2–3 | `87c6483` | Mapped/coerced ODK into `core`, added the preview unit filter, and moved the special-teams chip to `core.odk`. Typecheck and all tests passed. |
| 4 | `db14043` | Upgraded legacy remembered mappings by claiming one recognized ODK header. Typecheck and all tests passed. |
| 5 | `aa252bd` | Added ODK to the Core Snap Data glossary. |
| 6 fix | `8304f03` | Added ODK to the explicit Opponent Data grouping catalog after manual verification exposed that it does not derive directly from `CORE_FIELDS`. Typecheck and all tests passed. |
| Final review | `c104784` | Reset hidden stale filters when ODK is unmapped and made duplicate ODK aliases prefer `ODK`, then `O/D/K`, then `UNIT`. Added focused regressions; all tests passed. |

## Verification commands and results

- `npm run build`: passed strict TypeScript, all 21 tests, and Electron/Vite production builds.
- `git diff --check ce0ce7b..HEAD`: passed.
- `npx convex dev --once`: blocked because the configured account cannot access the selected
  Convex project; no project configuration was changed.
- Electron with `/private/tmp/hudl-odk-import.csv`: verified ODK appears after Clock in the Play
  Log, maps automatically, and stays visible in all five preview rows. `All rows` checked O/D and
  invalid-X rows while excluding K; the K chip and invalid-X chip were correct. O, D, and K filters
  selected exactly rows 1+4, 2, and 3. A manual row-5 override remained checked until the filter
  changed.
- No Snaps were imported into the user's Source Game. Persistence/provenance, re-imported legacy
  mapping, live ODK grouping results, and an existing saved View still need a manual pass after an
  authorized Convex push.

## Files outside the plan's likely-change table

| File | Reason |
| --- | --- |
| `convex/domain/aggregate.ts` | Opponent Data uses an explicit core grouping allowlist; adding `odk` was required for acceptance criterion 1. |
| `convex/domain/coreFields.test.ts` | Guards ODK registry position and select options. |
| `convex/domain/csvMapping.test.ts` | Guards header aliases, case-insensitive coercion, and the special-teams flag. |
| `convex/domain/aggregate.test.ts` | Guards ODK availability as an Opponent Data Grouping Field. |

## Decisions and tradeoffs

- The filter is native, session-only UI state and changes only the included checkbox set; rows are
  never hidden and manually checking a row remains possible.
- Invalid ODK values reuse the existing select rejection path instead of adding special validation.
- Auto and remembered mappings prefer `ODK`, then `O/D/K`, then `UNIT`, preserving unique targets
  regardless of CSV column order.
- `String(row.core.odk)` is used only at the chip boundary because the existing `SnapCore` model
  intentionally exposes the broad `CoreValue` union; no unrelated keyed-type refactor was added.

## What to test after the Convex push

1. Import the fixture with Offense selected and confirm two Snaps store `core.odk: "O"` with
   Imported provenance in Play Log and Play Detail.
2. Edit ODK in Play Detail and confirm O/D/K choices and Coach Edited provenance.
3. Group Opponent Data by ODK and confirm the imported Snaps appear under O.
4. Re-import the fixture and confirm remembered ODK mapping plus duplicate chips.
5. Open a Play Log View saved before this change and confirm it reconciles without error.
