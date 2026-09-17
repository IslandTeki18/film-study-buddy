# Phase 10B — Bulk Snap Removal and Player Notes — completion report

Implemented on `main`, one conventional commit per planned step. The supplied plan remains
unchanged, untracked, and excluded from commits. No dependencies, package scripts, persistent tests,
SPEC changes, or preview-reference changes were added.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 10B.0 | `290d409` | Inserted Phase 10B between Phase 10 and Phase 11 without renumbering. Diff contained only the insertion; typecheck passed. |
| 10B.1 | `4fa6d56` | Added `snaps.removeMany`: deduplicated IDs, live-parent validation, all-or-nothing 500-Snap cap, sequential existing cascades, one deletion batch. Live checks deleted 115 of 230 fixture Snaps and restored exact Snap documents, Cell Note, Quick Note, and single-Snap diagram with Undo. Empty, 501-ID, wrong-game, deleted-Snap, and deleted-game calls rejected without partial changes. |
| 10B.2 | `9b7df60` | Added native row/header checkboxes, indeterminate state, displayed-order Shift range, selection toolbar, optimistic deletion, confirmation, error retention, and Undo. Electron checked checkbox/navigation separation, keyboard Space, must-review select-all, Cancel focus/Escape, counts, and deletion/Undo. A 501-Snap fixture submission verified rollback, error display, and retained selection. Shared Review Queue grid exports and row actions were unchanged. |
| 10B.3 | `480c891` | Added the timestamp-based Select import menu. Two imports through the UI produced exactly two groups. Selecting the second cleared the review filter, excluded manual/duplicated Snaps, and deleted only that import; Undo restored it. Build passed. |
| 10B.4 | `164a336` | Added `opponentPlayers` and `playerNotes`, pure domain constants/normalizers, fourteen-table Undo/purge registration, and Workspace cascade wiring. Schema sync, typecheck, wiring inspection, and normalizer checks passed. |
| 10B.5 | `c20e422` | Added workspace-scoped player/note CRUD with return validators, normalized fields, limits, live Snap resolution, chronological entries, and distinct clip counts. Live checks covered all field limits, cross-Workspace rejection/isolation, preserved whitespace, grade clearing, duplicate traits/links, archived editing, Snap/Source Game link filtering, and note/player/Workspace Undo. Previously deleted notes retained their own deletion batch. |
| 10B.6 | `b43d326` | Replaced the sample Player notes tab with real side/group lists, add-player dialog, autosaved profiles, grades, traits, and player delete/Undo. Reused TagPicker with an optional input length. Electron verified invalid jersey handling, all profile fields, grade/trait/group changes, retained failed drafts and Retry, reload/cross-game persistence, side/Workspace isolation, and restoration of a player's notes. |
| 10B.7 | `1037c84` | Added note create/edit dialogs, removable Snap links, newest-first entries, dates, Play Detail links, and note delete/Undo. Electron checked zero/one/multiple/20 links, disabled linking at 20, editing links/text, reload order, cross-game link preservation, and derived counts after bulk-linked-Snap deletion/Undo. A Snap deleted while the dialog was open produced a recoverable error; its chip stayed removable and text was retained. |
| 10B.8 | `8b8dca4` | Wired the Charting aside to real players by side and the latest Snap. Removed its preview badge and restricted the global preview badge to Charting. Electron verified live chips, palette-created Snap preselection, saved entry, empty game/player cases, and keyboard flows. Final 230 → 115 → 230 → 115/reload walkthrough and light/dark inspection passed. Build passed. |
| 10B.9 | This documentation commit | Updated glossary, BLUEPRINT, TASKS evidence, and this report. Final build/diff checks passed; fixture cleanup and unchanged real data confirmed. |

## Verification commands and results

- `npm run typecheck`: passed for each implementation step.
- `npx convex dev --once`: passed for all backend steps. Generated API contains the domain
  module and `opponentPlayers`; the `snaps` module exposes `removeMany`.
- `npm run build`: passed after 10B.3, 10B.8, and the final documentation changes. Includes
  strict TypeScript, all **15 existing tests**, and Electron/Vite production builds.
  Final output: `/tmp/p10b-final-build.log`.
- `git diff --check`: passed. No `preview/charting-preview` or `PLAYERS` imports remain under
  `src/features/play-log`.
- `node /tmp/p10b-check.mjs seed`, `bulk`, `selection`, `imports`, `players`, `cards`, `retry`,
  `notes`, `note-errors`, `aside`, `walkthrough`, `visuals`, `inspect-players`, and `cleanup`:
  passed. These temporary checks use the existing Convex client and Electron CDP; they are
  outside the repository. No persistent test files or package scripts were introduced.
- `npx convex run deletions:listRecent '{}'`: captured in `/tmp/p10b-deletions.json`; exactly
  one active `snaps` receipt labelled `115 Snaps` remained after the final walkthrough,
  batch `fead3028-af8c-4931-b756-fa1f370a02ab`.
- Electron ran with `npm run dev -- --remote-debugging-port=9338`. The running renderer used
  port 5174 because 5173 was already occupied. Real mouse/keyboard events and temporary DOM
  input events exercised the existing app; no production verification hooks were added.
- Keyboard checks covered Space selection, import menu navigation, Tab to bulk confirmation,
  Cancel focus, Escape, creating a player, and creating an aside note. Both themes were
  visually inspected for cards and note/bulk dialogs in `/tmp/p10b-*.png`.
- Normalizer command output (`node --experimental-strip-types --input-type=module -e ...`):

```text
7 7
00 00
123 Jersey # must be 1–2 digits
a Jersey # must be 1–2 digits
[ 'Fast', 'Strong' ]
Trait must be at most 30 characters
```

The initial sandboxed Convex call failed on network access; the authorized network-enabled
retry and subsequent syncs passed. Temporary UI harness corrections handled the actual native
Season select, asynchronous route loading, retained Charting/Player notes tab state, and hidden
menu items. Failed automation attempts were corrected and rerun, not counted as verification.

## Decisions, assumptions, and tradeoffs

- **A3 verified; exact `createdAt` grouping shipped.** Fixture Game A's two eight-Snap imports
  had timestamps `1789602195850` and `1789602199983`; Fixture Game B's two 115-Snap imports had
  timestamps `1789602204435` and `1789602208575`. Every Snap in each import shared its timestamp
  and had `imported` set. Manually created and duplicated Snaps were excluded. No fallback
  heuristic or schema field was needed. If imports span mutations later, add `importBatchId`.
- **A2/R2:** 500 distinct Snaps per request; validation precedes all writes. Existing cascade
  scans are retained for the smallest change. The annotated 230-Snap fixture passed. Hoist
  repeated Quick Note/diagram loads if heavily annotated games hit Convex read limits.
- **R3 remains accepted:** deleting multiple Snaps attached to one shared Play Diagram can
  detach an attachment before deleting the diagram; Undo restores the diagram with only its
  remaining attachment. This existing behavior was deliberately not changed. The verified
  annotation restoration case used a single-Snap diagram.
- **A4/A5:** local selection is intersected with live query rows; the header changes only shown
  rows, and Select import clears the must-review filter. Selection persists through mutation
  failure; it is cleared on successful deletion. Source Game navigation remounts the state.
- **A7–A11:** QB/RB/WR/OL and DL/LB/DB are the fixed offense/defense groups; no special teams.
  Jersey requires one or two digits, including `0`/`00`, with no uniqueness constraint;
  position is required free text up to 12 characters and name is optional. Grades A/B/C can
  be cleared. The approved profile, trait, and note limits are enforced on the server.
- **A12/A13:** existing TagPicker, UI primitives, autosave, toast, and Undo hooks were reused.
  Profile text preserves whitespace; jersey/position normalize. Group changes and deletion
  wait for profile saves to settle, following the existing Tendency pattern so failed drafts
  are not lost by moving a card. Creation/note dialogs use explicit Save as planned.
- **A14/A15:** new links come from the current Source Game; existing cross-game links remain
  visible/removable on edit. Labels use Source Game + Clip, or Snap order when Clip is absent.
  Aside preselection uses `createdId`, otherwise the final ordered Snap, and validates that
  it is still present; a stale ID produces no preselected link.
- **A16/A17:** player deletion cascades through live Player Notes in one batch. Snap deletion
  does not rewrite Player Notes; dead links are omitted at read time and reappear after Undo.
  Stale stored IDs may remain after purge; editing a note replaces links with the selected
  live links. An open dialog retains link metadata so a newly deleted link can still be
  removed after a validation error without losing typed text.
- **A18/A19:** archived Workspaces remain editable. Phase 11 retains its numbering. Reports,
  Opponent Data, preview reference files, single-Snap actions, and the shared Review Queue
  grid are unchanged. Remaining Charting preview tiles retain their badges.

## Deviations and scope choices

1. There is no Season-delete UI in the existing app. Fixture Workspaces were soft-deleted
   through the app; the fixture Season used the existing `seasons.remove` mutation. No
   unrelated Season UI was added. The original active Season was restored through the app.
2. The fixture hierarchy and both pairs of CSV imports used the running app. The additional
   501-Snap limit fixture and empty Source Game used existing backend mutations. Mutation
   checks used `ConvexHttpClient` rather than launching a CLI for every call.
3. The global Play Log preview badge is now shown only on Charting, avoiding a false preview
   label on the persisted Player notes tab. Charting's remaining sample content is unchanged.
4. The note dialog retains selected link metadata while open to support stale-link recovery.
   The persisted shape and server liveness checks remain exactly as planned.

## Fixture cleanup and real-data preservation

Fixture identifiers and the original real-Snap snapshot are in `/tmp/p10b-ids.json`:

- Season `Fixture 10B`: `k179kmtt6aeckg7zkj4p95y7ds8eh3w3`.
- Workspace `Fixture Opponent`: `kx70xdbn80wz1rbty7ycqq537h8eh56f`.
- Workspace `Fixture Other`: `kx774xtgfnmymhax759q38hy2n8ehgnv`.
- Source Game A: `k978taw9shmvdf8a83hghhr5mx8ehcc4`.
- Source Game B: `k972wvfhtg3dphnyp37rvyha9s8ehry5`.
- Other Source Game: `k97dzszbjefwjeyg74dbanw4z18ehckg`.
- The additional empty Source Game is recorded in the same scratch file.

Both fixture Workspaces and the fixture Season were soft-deleted. Follow-up reads returned
null/empty for the Workspaces, Source Games, Snaps, and Player Notes. The fixture Season no
longer appears in `seasons.list`. Descendants and deletion receipts follow the existing purge
lifecycle. No existing Coaching Template was modified. Verification import mappings remain
under the existing remembered-mapping behavior; they contain synthetic CSV headers only.

The real Source Game `k97b7a9kqaxfs1fhxzdx0tvtcx8ecycv` had **232 Snaps before and 232 after**.
The complete Snap query results were byte-equivalent by deep comparison, including IDs,
fields, flags, and timestamps. Its parent Workspace was only read, never selected or mutated.
Cleanup evidence: `/tmp/p10b-cleanup.json`. The coach's duplicate removal remains their action.

## What to recheck when extending this work

Recheck import grouping if imports become multi-mutation, cascade read volume for much more
heavily annotated games, and the accepted shared-diagram Undo limitation if exact attachment
restoration becomes required. Current regression paths are bulk selection/delete/Undo, profile
save/error recovery, Player Note link filtering, and Workspace/player cascade restoration.
