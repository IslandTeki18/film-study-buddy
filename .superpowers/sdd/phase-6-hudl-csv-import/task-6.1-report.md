# Step 6.1 — CSV mapping module report

Status: complete on `main`.

## Changes

- Added `convex/domain/csvMapping.ts`, a pure TypeScript module whose only imports are
  `coreFields.ts` and `fieldZone.ts`.
- Added the import-target catalog, required target group, normalized header signatures,
  exact alias mapping, ODK detection, per-target coercion, row coercion and flagging, and
  likely-duplicate detection.
- Used a local structural `SnapCore` type derived from `CoreFieldKey` and `CoreValue`; the
  module has no Convex runtime or generated-model import.
- Normalized both row and saved-mapping headers during coercion. Duplicate normalized CSV
  headers are left unmapped, and duplicate normalized saved-mapping headers are ignored.
- Regenerated `convex/_generated/api.d.ts` through the required Convex development push.

## Verification

- `node --experimental-strip-types /tmp/task-6.1-check.ts` — passed. The scratch assertions
  cover the exact 19-column sample header mapping, all eight specified unmapped headers, ODK
  discovery, changed signatures, ambiguous normalized headers, dirty numeric and Yard Line
  cells, case-insensitive aliases/options, special-teams/no-play/null flagging, canonical
  imported strings, zero preservation, blank duplicate exclusion, and duplicate precedence.
- `npm run typecheck` — passed with strict TypeScript settings.
- `npx convex dev --once` — passed against the configured development deployment; Convex
  reported functions ready. The initial sandboxed attempt failed at DNS authorization, then
  the approved network-enabled retry succeeded.

## Limits and concerns

- Verification is synthetic because the real Hudl CSV is unavailable, per the phase ruling.
- The explicit no-play rule requires Down, Distance, and Play Type all to be absent. A row with
  Down and Distance but no Play Type is therefore not flagged, resolving the inconsistent
  example in favor of the phase ruling.
- Signed Yard Line follows the approved assumption: `-1..-49` is own territory, `1..49` is
  opponent territory, `50` is midfield; `0`, `-50`, and values beyond midfield are rejected.
- Scratch assertions remain in `/tmp/task-6.1-check.ts`; no persistent test file or dependency
  was added, as required by this phase.

Commit: recorded after report creation in the task handoff.
