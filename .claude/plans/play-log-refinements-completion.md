# Play Log Refinements — completion report

Implemented on `main`, with separate commits for each task and a review-fix commit.
The supplied untracked plan remains unchanged and excluded from commits. No new dependencies,
Git push, merge, or pull request. Convex development deployment completed successfully.

## Per-task changes and evidence

| Task | Commit | Changes and verification |
| --- | --- | --- |
| 1 | `b49b952` | Added the shared Play Type/Section side rule with whole-word, case-insensitive matching and fail-open handling. Persistent domain test covers side mappings, neutral/combined names, unset and unknown values, including inherited object keys. Typecheck and tests passed. |
| 2 | `6ef1367` | Added the eleven approved Personnel built-ins, Terminology list/schema union, Core field picker, and Hudl harvesting. Typecheck/tests and Convex deployment passed. Backend import retained `11` and harvested it; Electron showed eleven built-ins plus imported `11` and persisted inline additions. |
| 3 | `68c8fb7` | Filtered palette columns, summary, and create payload by draft Play Type. Filtered server carry-forward and optimistic/next-draft carry-forward to prevent hidden analysis from returning. Domain/palette tests, backend mutation checks, and both Electron layouts passed. |
| 4 | `7fd5f97` | Filtered Play Detail Sections and added Remove note. Added autosave discard/wait support to prevent a queued or in-flight save from resurrecting a deleted note. Typecheck/tests passed; Electron removed saved, pending, and never-saved note blocks. |
| 5 | `6b487d1` | Added per-field Autosave through existing Core/Analysis mutations, shared normalization, native selects, and blur/Enter text/number/Yard Line inputs. Preserved provenance, Restore original, overtime Quarter input, and historical terminology values. Full build and SSR checks passed. |
| Review fixes | `97a0339` | Kept editable drafts in the Detail wrapper, synchronized restored values, displayed historical multi-select selections, disabled note edits during removal, and used shared types without unsafe casts. Independent re-review, build, SSR, and focused Electron regressions passed. |
| Generated API | `918e68d` | Committed Convex-generated registration of the new domain module. Final typecheck and development deployment passed after removing temporary verification code. |

## Verification commands and results

- `npm run build`: passed strict TypeScript, all nine tests, and Electron/Vite production compilation.
  The existing missing-preload warning remains.
- `node src/features/play-log/snap-palette.check.mjs`: passed existing rendering checks plus
  historical single/multi-select values and Quarter's existing 1–9 range.
- `npx convex dev --once`: passed, including the final deployment after fixture cleanup.
- `git diff --check`: passed.
- `npm run dev -- --remoteDebuggingPort 9222`: launched the app for Electron checks.
- Backend checks confirmed both carried-forward and explicitly supplied hidden Pass analysis
  were absent from new Run Snaps. Hudl import preserved and harvested Personnel `11`.
  Invalid Distance and Yard Line updates rejected without changing stored values.
- Electron palette checks covered Run/Pass/RPO filtering, restoring hidden draft values when
  switching back before save, hidden-value omission on save, both layouts, the summary,
  Personnel built-ins/imported values, and inline additions available on the next Snap.
- Electron Detail checks covered Formation selection, Yards on blur, Quarter 9 on Enter,
  imported Down provenance/restore, Run/Pass Section changes, Rating 3, Checkbox Yes,
  invalid Distance/Yard Line toasts with retained corrections, corrected values saving,
  empty/pending Cell Note removal, and persistence after reload.
- Focused Electron regression checks verified that restoring an imported numeric field
  survives a later untouched focus/blur, unsaved text survives a reactive parent update,
  and historical multi-select options remain visible. Keeping a removed option while adding
  another triggers validation without changing data; explicitly replacing it succeeds.
- Final backend reads confirmed palette and Detail writes and unchanged settings.

UI scripts used real Electron pointer/keyboard input plus DOM change events for native selects.
This does not claim manual native-dropdown or Windows/Linux verification. Scratch verification
scripts are under `/tmp/plr-*`; the Electron protocol helper was reused from `/tmp/p6-cdp.mjs`.
The automated persistent tests cover pure rules and rendering; interaction checks were run
against the temporary live fixture and are documented here.

## Decisions and deviations

| Decision | Reason and tradeoff |
| --- | --- |
| Keep approved Section-name filtering and Play Type mapping | Renaming a Section without Run/Pass intentionally shows it for all Play Types. Unknown and unset Play Types fail open. No template-editor setting added. |
| Extend task 3 to `convex/snaps.ts` | The plan excluded this file, but its existing carry-forward would reinsert hidden analysis after the client filtered the payload, violating AC2. A small filter at creation fixes both carried and supplied values. Existing Snap analysis remains intact when changing Play Type in Detail. |
| Extend `useAutosave` with discard/wait | Directly deleting a note while its timer or in-flight save remained active could recreate it. Existing consumers retain their behavior; only note removal uses the new operation. |
| Reject invalid Yard Line edits | AC9 requires preserving saved data. The sample hook's conversion of invalid values to clearing was therefore not used. Clearing the side explicitly still clears the field. |
| Use a controlled draft wrapper for Detail inputs | The sample ref-only wrapper could not drive the structured Yard Line controls or safely reconcile Restore original. GroupInput remains unchanged except for its export. |
| Preserve Quarter 1–9 and historical options | Detail uses the existing numeric Quarter input. Imported free-text terminology and removed Template options remain visible. Shared validation stays authoritative. |
| Add focused persistent checks | Registered the domain test in the existing test command and extended existing palette/SSR checks; no framework or dependency added. |
| Keep the supplied plan untracked | It was user-provided content present before this task; commits contain only implementation, tests, generated output, and this report. |

## Fixtures and cleanup

Verification used a separate Season/Workspace, a newly installed Defensive Line starter,
and a fixture Source Game with additional test fields. Existing games and templates were untouched.

- Season: `k17c3bp4mfz35sf163rg83en2d8ee0wc`
- Workspace: `kx74bnv8fk9c5j6edzpy6f8cv58efbsn`
- Template: `m979sek5x0awhh4aq4cxgrf28d8ee9f0`
- Source Game: `k9755vp9pcxz1dzn3b0p18vp358ee7sg`

The fixture hierarchy was soft-deleted through existing mutations, then a temporary internal
cleanup mutation removed only those deletion batches, newly added Personnel terminology,
and the unique verification mapping. The cleanup module was never committed and was removed
from disk and the development deployment. Queries confirmed game/template absence, mapping
absence, and terminology/settings exactly matching their pre-verification snapshots.

## What to test when reviewing

1. In a real Defensive Line Source Game, switch Run/Pass/RPO in both palette layouts and save;
   verify only applicable analysis is recorded and existing carry-forward remains useful.
2. Add/select Personnel and inspect an imported Snap with free-text Personnel.
3. Edit Core and Template fields in Detail, try an invalid number/Yard Line, reload, and restore
   an imported number; focusing/blurring afterward must leave the restored value unchanged.
4. Remove a saved, unsaved, and actively edited Cell Note; each should remain absent.
5. Before cross-platform release, check native select/multi-select keyboard behavior and focus
   transitions on the supported operating systems.
