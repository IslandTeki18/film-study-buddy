# Phase 5 Play Log Power Features — completion report

Implemented on `main`, one commit per numbered step, followed by this report commit.
The supplied untracked plan remains unchanged and excluded from commits. No dependencies,
package scripts, test files, shared UI primitives, credentials, environment files, or route
registrations changed. No Git push, merge, or pull request was performed.

## Per-step changes and evidence

Every numbered step passed `npm run typecheck` and a Convex development push. Behavior was
verified against an isolated ten-field, 60-Snap Source Game in Electron on macOS. Checkboxes
were marked complete only after their walkthroughs; several were finalized with step 5.12.

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 5.1 | `c4aa4bb` | Persisted Columns menu; shared Template Builder column-key validation; centralized default widths. Hide two columns, reload, and last-visible-column guard passed. Backend rejected duplicate/unknown keys, visibility outside order, and width 10; successive valid saves retained the same layout document id. |
| 5.2 | `80e29c0` | Native header drag, keyboard move menus, pointer and arrow-key resize. Browser drag moved Formation before Down; keyboard move persisted; pointer resize persisted Clip # at 140 px; keyboard width and reload checks passed. Sticky selection/data columns and header retained their coordinates on both scroll axes. The final walkthrough found a shifting drop-target border; `c3f68a1` replaced it with an inset ring and the native drag check passed. |
| 5.3 | `35d00b5` | Reconciled persisted columns, widths, and deleted view ids. Reload with active sort/search preserved layout and selected view while clearing sort/search. Added field appeared unchecked; removed field disappeared; deleted view displayed Custom. |
| 5.4 | `16fa4ff` | Play Log View picker and Save as view creation. Saved Run Study, applied it, and retained it across reload. Template Builder create/rename/reorder and application of its view passed after the shared validator extraction. |
| 5.5 | `2439c65` | Shared displayed-value model and single-column sorting. Three-state cycle, switching columns, numeric order (−2, 9, 10), and blanks last in both directions passed. |
| 5.6 | `e9cfa2b` | Search over visible displayed cells and matching count. Red Zone matched five Snaps; hiding Yard Line removed those matches; clearing search restored all Snaps. New Snap clears search and sort. |
| 5.7 | `96fc311` | Selection checkboxes, selected-count bar, typed confirmation dialog, optimistic bulk mutation, and before-value ledger. Selected 50 filtered Snaps and applied Personnel 11. Backend verified three mixed before-values, rejected Yard Line and a foreign Snap atomically. |
| 5.8 | `88f37ec` | Atomic bulk Undo through the existing toast hook, with optimistic restoration of the affected field. All 50 original blank/10/12 values returned; ledger removal and second-Undo rejection passed. Cancel focus when opening the bulk dialog was corrected during this walkthrough. |
| 5.9 | `fd5a0f2` | Snap query, Must Review, shared Snap cascade, row actions, and Cmd/Ctrl+Enter. Keyboard Detail navigation, Must Review persistence, both stub destinations, Delete confirmation/Cancel focus, and Undo passed. Backend verified one batch across the Snap, Cell Note, Quick Note, and diagram. |
| 5.10 | `83bb656` | Duplicate Core/Template values at a midpoint order and focus the copy. An imported, flagged Snap with all three attachment types duplicated with identical values but no originals, flag, or attachments. UI focused the copy immediately below its source. |
| 5.11 | `ccbb0b3` | Indexed Cell Notes backend, optimistic autosave, note marker, and editor access. Insert/update retained one note id; blank text removed it; invalid keys failed; Delete/Undo restored it. Grid → Detail → grid edits passed, including checkbox and multi-select notes. |
| 5.12 | `c3f68a1` | Play Detail with Core values/provenance, Template Sections, editable Cell Notes, Must Review, and Quick Note/diagram links. All content areas rendered; Restore original changed Down back to its imported value. Final build and production Electron launch passed. |

## Verification commands and limits

- `npm run typecheck`; `npx convex dev --once`; `npm run build`.
  The final build passed TypeScript, all six existing theme tests, and Electron/Vite compilation.
- `npm run dev -- --remoteDebuggingPort 9222` for Electron walkthroughs.
- `npm run preview -- --skipBuild -- --remote-debugging-port=9223` for the production
  `file://` launch. The build rendered the 60-Snap/24-data-column fixture and Play Detail.
  A second one-Snap smoke fixture verified persisted textarea values after correcting a
  temporary assertion that incorrectly looked for textarea content in page text.
- Public backend checks used `ConvexHttpClient` with the deployed validators and handlers,
  equivalent to `npx convex run columnLayouts:save '<args>'`, `columnLayouts:get`,
  `snaps:bulkUpdate`, `snaps:undoBulkUpdate`, `snaps:duplicate`, `snaps:remove`,
  `snaps:setMustReview`, `notes:setCellNote`, `notes:listCellNotes`, and `deletions:undo`.
- Temporary internal `p5Verification:seed`, `inspect`, and `teardown` functions were called
  through `npx convex run`. They seeded imported originals and linked future-phase data,
  inspected ledger contents, and hard-deleted only the dedicated fixture hierarchies.
  The module was removed locally and from the deployment after verification.
- `npx convex run deletions:purgeExpired '{}'` removed the backdated fixture bulk edit.
  A read-only guard first confirmed zero eligible non-fixture records.
- Regression: full 24-column Enter/Tab charting covered all 14 Core fields, structured Yard
  Line, and all eight Template Field types. Final Tab exited without creating a Snap.
  Enter never created a Snap; Tab/Shift+Tab wrapped; New Snap preserved Carry-Forward and focus.
- Native select values were driven with DOM change events; other interactions used CDP
  keyboard/pointer events. Header dragging used the browser's native drag start and CDP drop
  events. This is not a claim of manual OS-native popup or Windows/Linux verification.

Temporary scripts and screenshots are under `/tmp/p5-*`, not in the repository.

## Assumptions and tradeoffs

1. Yard Line remains excluded from bulk edit; the existing before-value schema is unchanged.
2. Cell Notes now carry `sourceGameId` and `by_sourceGame`; schema deployment succeeded with
   no legacy Cell Note migration needed.
3. Duplicate Snap uses midpoint ordering. Renumber if floating-point spacing or equal orders
   become a practical issue.
4. Duplicated values are Coach Entered; `imported` is never copied.
5. New Snap clears sort/search. Duplicate Snap also clears them so its focus target is visible.
6. A selected view is a label, not a lock. Subsequent column edits retain its id; Save as view
   captures the current layout as a new view.
7. New fields start hidden in persisted layouts; fresh layouts show the catalog. Removal and
   Undo retain existing field identity and recoverable analysis values.
8. Cmd/Ctrl+Enter opens Play Detail. F2 opens every cell editor, including checkboxes, and
   Alt+N focuses the Cell Note without changing normal Tab charting or Enter checkbox toggles.
9. Quick Notes and Play Diagram are links until Phases 7/8. Play Detail values are read-only;
   routine charting stays in the Play Log.

The layout hook omits the proposed unused default-width callback: the table already resolves
widths through `defaultWidth`. The step-specific 5.8 instructions correctly noted that bulk
purge already existed; no `bulkEdits` index or `deletions.ts` change was needed despite the
broader file inventory mentioning them. Shared UI primitives needed no additional props.

New deliberate ceilings: 200 Snaps per bulk transaction (chunk if write limits appear),
32 px selection offset (use a CSS variable if resized), per-Snap scans of a game's Quick Notes
(add `by_snap` if cascade volume warrants it), midpoint order, and read-only Detail values.
The existing no-virtualization and fixed-scroller-offset ceilings remain.

## Fixtures and cleanup

Main fixture ids:

- Season `k178ytm08gynq98w1ywv8dcz6n8eddrm`
- Workspace `kx7dh8zea6x4a3bdqgsskph46h8ec42z`
- Template `m976ebsjam7mh24yhbs7zgq9r18ec9mp`
- Source Game `k978985n38zxnayzm9vrj2t0fd8ec736`

The secondary production smoke Source Game was `k978tmhxn1k42acfgssg1wgx9s8ed5x5`, under
Season `k175m5nzpe689bbhwv67ev9pzx8edxtj`. Full ids were recorded in `/tmp/p5-ids.json` and
`/tmp/p5-smoke-ids.json`.

Both hierarchies were hard-deleted, including all fixture Snaps, Cell Notes, Quick Notes,
diagrams, layouts, bulk edits, template fields/sections/views, and still-linked deletion
batches. Completed Undo ledger receipts retain the existing application's behavior of
preserving undone batches; cleanup did not guess ownership of historical unlinked receipts.
Queries confirmed the removed content was absent. First-launch and active-Season settings
matched `/tmp/p5-settings-before.json` before and after cleanup. Real Seasons were untouched.

## Deferred scope and manual follow-up

Quick Note popup, diagram editing/preview, Cmd/Ctrl+R, Cmd/Ctrl+F, and `countIncomplete` remain
with their planned later phases. Before cross-platform release, manually smoke-test native
select popups and keyboard shortcuts on each supported operating system. For coach review,
focus on column drag/resize, 50-Snap bulk Undo, and Cell Note editing between the grid and Detail.
