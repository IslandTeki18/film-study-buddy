# Step 6.6 Report — Duplicate Detection

## Result

Implemented duplicate flags in the import preview and a populated Play Log import entry point.

- The import container loads existing Snaps with `api.snaps.listBySourceGame` and memoizes `findLikelyDuplicates(existingSnaps, rows)`.
- Preview waits for the existing-Snaps query before rendering, so the Step 6.7 import action cannot become available before duplicate detection is ready.
- Duplicate query updates refresh duplicate chips and counts without resetting the current included-row selection.
- Matching rows show the applicable `Likely duplicate` chip for Play #, Clip #, or Quarter + Clock and remain included until the coach excludes them.
- The duplicate summary reports the number of matching preview rows, and `Exclude duplicates` removes only matching rows from the current selection.
- Populated Play Logs now show an `Import Hudl CSV` link in the existing header. The empty-state link and current charted-Snap display remain unchanged.

## Files

- `src/features/import/hudl-import.tsx` — existing-Snaps query, memoized duplicate detection, and query loading gate.
- `src/features/import/preview-step.tsx` — duplicate count, chips, and exclusion control.
- `src/features/play-log/play-log.tsx` — populated-game import link.

## Verification

- `npm run typecheck` — passed.
- `npx convex dev --once` — passed; Convex functions ready against the configured development deployment.
- `git diff --check` — passed.

## Limits

The real Hudl fixture is unavailable per the phase ruling, and Step 6.7 does not yet exist, so the import-then-re-import flow could not be run. The controller owns live UI verification after Step 6.7 is implemented.
