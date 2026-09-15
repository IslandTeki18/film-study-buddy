# Step 6.5 Report — Import Preview

## Result

Implemented the Hudl CSV preview table and row inclusion controls.

- Coerced rows are memoized in the wizard for the current CSV and mapping.
- Inclusion defaults to rows without a row-level `specialTeams` or `noPlay` flag whenever coercion changes because the mapping changes.
- Rejected cells remain visible as chips and do not pre-exclude their row.
- Manual checkbox choices persist while moving between Preview and Mapping if the mapping is unchanged.
- Preview lists every row, shows only mapped target columns in `IMPORT_TARGETS` order, and displays play or clip number in the `#` column.
- `Include all` selects every row. `Exclude flagged` removes row-level flagged rows from the current selection.
- Back returns to Mapping for a new mapping and Upload for a remembered mapping. The remembered-mapping notice retains its explicit `Change mapping` action.
- `Import N Snaps` displays the selected count and remains disabled until Step 6.7 wires the import mutation.

## Files

- `src/features/import/preview-step.tsx` — preview table, flags, selection controls, and navigation footer.
- `src/features/import/hudl-import.tsx` — memoized coercion, inclusion state initialization, and Preview wiring.

## Verification

- `npm run typecheck` — passed.
- `npx convex dev --once` — passed; Convex functions ready against the configured development deployment.
- `git diff --check` — passed.
- One-shot Node assertions using `coerceRow` — passed for:
  - a row with rejected `Down: "1st"` remains included;
  - an `ODK = K` row is marked special teams and excluded;
  - a valid row remains included.

## Limits

The real 135-row Hudl fixture is unavailable per the phase ruling, so exact row counts and the named sample row numbers could not be verified. UI interaction was not run by this executor; the controller owns live UI verification. Duplicate chips are intentionally deferred to Step 6.6, and the import mutation/action is intentionally deferred to Step 6.7.
