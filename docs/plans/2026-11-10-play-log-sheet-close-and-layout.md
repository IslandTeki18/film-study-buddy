play-log-sheet-close-and-layout
Context

* src/index.css:94-103: `.app-drag-region` sets `-webkit-app-region: drag`; `no-drag` applies only to button/a/select/input inside it
* src/components/workspace-header.tsx:27: workspace header carries `app-drag-region`; occupies the window top strip
* electron/main.ts:61: `titleBarStyle: 'hiddenInset'` on macOS
* src/components/ui/dialog.tsx: native `<dialog>` via `showModal`; base for Sheet
* src/components/ui/sheet.tsx: full-height right-edge Dialog; sticky header with Close renders at window top, over the workspace header's drag strip
* src/features/play-log/play-log.tsx:149-160: Charting tab = flex-wrap row: `<section>` (ChartedSnaps + ThisWeek, `flex-[1_1_560px]`) beside `<aside aria-label="Player notes">` (ChartingAside, `flex-[1_1_300px]`, `bg-card`)
* src/features/play-log/play-log.tsx:162-190: Sheet hosting SnapPalette or embedded PlayDetail; `closeSheet` flushes PendingFieldEdits (works; do not change)
* src/features/play-log/charting-aside.tsx: "Note a player" panel; self-contained
* src/features/play-log/this-week.tsx: root `<section className="mt-[26px] …">`
* src/features/play-log/charted-snaps.tsx:161-196: one `<li>` card per Snap; line 1 = checkbox, #clip link, Play Type Chip + Formation button, `Imported` Meta, `x/y charted`, Must Review ★, RowActions; line 2 = Play Concept · D&D · Field Zone · Personnel · Result
* src/features/play-log/charted-snaps.tsx:46: `workspaceId` prop already passed, currently unused
* convex/notes.ts:13: `listCellNotesBySourceGame({ sourceGameId })` → live Cell Notes with `snapId`
* convex/notes.ts:65: `listQuickNotes({ sourceGameId })` → live Quick Notes with optional `snapId`
* convex/diagrams.ts:186: `listByWorkspace({ workspaceId })` → live Play Diagrams with `attachedSnaps[].snapId`
* src/features/play-log/play-detail.tsx:49-50: existing client use of `listQuickNotes` filtered by `snapId`

Decisions

* Close bug root cause is the Electron drag region swallowing clicks on the Sheet header; not edit-related; `closeSheet`, Dialog, Sheet, PendingFieldEdits logic unchanged
* Fix: every `dialog` element gets `-webkit-app-region: no-drag` in src/index.css (Electron subtracts no-drag rects from drag rects regardless of stacking)
* Charting tab becomes a single full-width column, order: ChartedSnaps → ThisWeek → ChartingAside
* ChartingAside content unchanged; only its placement and wrapper change
* Charted snaps cards gain indicators only: Cell Note count, Quick Note count, Play Diagram presence
* Indicator text: muted mono, line 1, placed immediately before the `Imported` Meta; segments joined by ` · `; segment omitted when zero/absent; whole element omitted when all absent
* Indicator wording: `1 Cell Note` / `N Cell Notes`, `1 Quick Note` / `N Quick Notes`, `Play Diagram`
* Indicators computed client-side in ChartedSnaps from the three existing queries; no Convex changes
* While any of the three queries is `undefined`, render no indicators for that query's segment (no skeleton)
* Indicator element is non-interactive; card click behavior unchanged
* Quick Notes without `snapId` are ignored

Out of scope

* New Core Snap Data or Template Analysis values on cards
* Player Note indicators
* Converting Charted snaps to a table / LOG_GRID
* Changes to `max-h-[640px]` list scroll, filters, selection, delete, RowActions
* Sheet header overlapping macOS traffic lights on narrow windows
* src/features/review/review-queue.tsx, src/features/preview/charting-preview.tsx
* Convex schema, queries, mutations

Steps
1. Make dialogs no-drag in Electron

* src/index.css: modify — add a rule after the `.app-drag-region …` no-drag block: `dialog` → `-webkit-app-region: no-drag`; extend the existing comment by one line
* follow: src/index.css:98-103
* done: `npm run dev` (Electron) → open a Source Game Play Log → click a Snap card → click sheet Close → sheet closes; repeat after editing a Core Snap Data field → closes; window drag still works from the workspace header when no dialog is open

2. Make the Charting tab a single full-width column

* src/features/play-log/play-log.tsx: modify — replace the Charting-tab flex row (lines 149-160) with one full-width `<section>` (keep `bg-background px-5 pt-4 pb-6`, drop `flex-[1_1_560px]`, drop the `gap-px bg-border` row wrapper); children in order: ChartedSnaps, ThisWeek, then `<aside aria-label="Note a player" className="mt-[26px]">` wrapping ChartingAside with identical props; remove the old `<aside>` and its `bg-card`/flex classes
* follow: src/features/play-log/this-week.tsx (`mt-[26px]` section spacing)
* done: `npm run typecheck` passes; Play Log Charting tab shows Charted snaps spanning the full content width, This week below it, Note a player below This week; Player notes tab unchanged

3. Add note and Play Diagram indicators to Charted snaps cards

* src/features/play-log/charted-snaps.tsx: modify — destructure `workspaceId`; add `useQuery` for `api.notes.listCellNotesBySourceGame({ sourceGameId })`, `api.notes.listQuickNotes({ sourceGameId })`, `api.diagrams.listByWorkspace({ workspaceId })`; derive `Map<Id<'snaps'>, number>` for Cell Note counts, `Map<Id<'snaps'>, number>` for Quick Note counts (skip notes without `snapId`), `Set<Id<'snaps'>>` from every diagram's `attachedSnaps[].snapId`; add a small local `indicatorText(snapId): string` returning the joined segments per Decisions; in each card's line 1, before the `Imported` Meta, render `<Meta className="text-[10px]">` with that text only when non-empty
* follow: src/features/play-log/charted-snaps.tsx:24-30 (`downDistance` / `resultText` local helpers), src/features/play-log/charted-snaps.tsx:190 (`Imported` Meta styling), src/features/play-log/play-detail.tsx:49-51 (Quick Note `snapId` filter)
* done: `npm run typecheck` passes; a Snap with 2 Cell Notes, 1 Quick Note and an attached Play Diagram shows `2 Cell Notes · 1 Quick Note · Play Diagram` on line 1; a Snap with none shows no indicator; adding a Cell Note in the sheet updates the count without reload

Verify

* `npm run typecheck` → exit 0
* `npm run build` → exit 0
* `npm run dev` → Electron: open Play Detail sheet from a Charted snaps card, edit Clock, click Close → sheet closes, value persisted
* Electron: open sheet, press Esc → sheet closes
* Electron: open "Chart a snap" sheet, click Close → closes; draft retained on reopen
* Electron: drag window by the workspace header with no dialog open → window moves
* Electron: open a centered Dialog (Finish study session with incomplete Snaps) → buttons clickable
* Play Log Charting tab → single full-width column: Charted snaps, This week, Note a player
* Note a player jersey button → Player Note dialog opens, links latest Snap (unchanged behavior)
* Card for a Snap with Cell Notes / Quick Notes / Play Diagram → counted indicator text on line 1, before `Imported`
* Card for a Snap with none → no indicator text
* Charted snaps filters (Needs charting, Show must review only), selection, row actions → unchanged

## Execution notes

* Step 1 (`e1aa7d7`) applied Electron's no-drag rule to native dialogs so their controls can receive clicks over the workspace header.
* Step 2 (`6994992`) stacked Charted snaps, This week, and Note a player in one full-width section, preserving the existing top margin and panel props.
* Step 3 (`16425fe`) added per-Snap Cell Note counts, linked Quick Note counts, and Play Diagram presence before `Imported`. Each segment appears independently as its query resolves.
* All three steps followed the approved scope. Typecheck passed at baseline and after each step. The project has no lint script, so `npm run lint` exited 1 at baseline and after each step.
* The production build passed, including its automated tests. The Electron interactions and visual checks above remain for the separate manual verification pass.
