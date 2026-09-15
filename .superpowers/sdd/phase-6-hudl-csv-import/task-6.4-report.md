# Task 6.4 report — Remembered mappings

Status: complete on `main`; remembered-mapping fixture and UI verification are delegated to the controller.

## Changes

- Added `hudlImport:getRememberedMapping` with an exact `by_signature` lookup and `null` for no saved mapping.
- Added `hudlImport:rememberMapping` and exported its shared upsert helper for the Step 6.7 commit path. Saves reject unknown targets, duplicate target assignments, and mappings without Play # or Clip #.
- Queried by the normalized header signature after parsing and showed a loading skeleton while the result was pending.
- Reconciled stored keys to current CSV headers by normalized spelling. A valid complete mapping skips to Preview; stale headers, unknown targets, duplicate assignments, and missing required mappings return to the mapping screen with `autoMap`.
- Initialized each parsed file once, so reactive query updates cannot replace a mapping the coach is editing.
- Added the remembered-mapping Preview notice and Change mapping action, preserved `?step=preview`, and reset a reloaded Preview URL to Upload with the Decision D8 re-pick message.

## Verification

- `npm run typecheck` — passed.
- `npx convex dev --once` — passed against `grandiose-orca-608`; Convex reported functions ready and regenerated the API declaration.
- `git diff --check` — passed.

## Limits

- Per the task handoff, no mapping fixture was created and no backend mutation or UI walkthrough was run. The controller owns those checks after this commit.
- Preview rows and import commit behavior remain intentionally absent until Steps 6.5 and 6.7. `rememberMapping` is therefore exposed but is not yet called by the wizard.

Commit: recorded after report creation in the task handoff.
