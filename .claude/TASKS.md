# film-study-buddy — Tasks

Dependency-ordered build of the V1 in `.claude/SPEC.md`, following `.claude/BLUEPRINT.md`.
Work phases in order. Inside a phase, work steps in order. Each step is one commit-sized unit
that leaves the app running.

Legend: `[ ]` not started · `[~]` implemented, not verified · `[x]` verified.
A step is `[x]` only when its **Verify** line has actually been run and passed.

---

## Phase 0 — Scaffold (done)

- [x] Create film-study-buddy with a standalone application and strict TypeScript configuration.
- [x] Initialize Electron/Vite/React/TS/Tailwind/ShadCN and the Convex directory.
- [x] Document required environment variables in `.env.example` without committing secrets.
- [x] Theme Settings: light/dark/system resolution, pre-render initialization, provider, hook,
      accessible toggle, OS appearance listener, local persistence.
- [x] Desktop sidebar layout wired to the theme feature.
- [~] Provision the Convex deployment. **Blocked on you**: run `npx convex dev` (interactive
      login), copy the printed URL into `.env` as `VITE_CONVEX_URL`. Regenerates
      `convex/_generated`. Nothing in Phase 1 onward can be verified until this is done.

---

## Phase 1 — Foundations

Everything later depends on these primitives. Build them once, correctly.

Verification evidence, assumptions, and live backend follow-up commands:
[Phase 1 completion report](plans/phase-1-completion.md). The temporary scratch route was removed.

- [x] **1.1 Dependencies.** Add `react-router`, `@tanstack/react-table`, `papaparse`,
      `@types/papaparse`. No others.
      *Verify:* `npm run typecheck` clean; app still launches.
- [x] **1.2 Core field registry.** `convex/domain/coreFields.ts`: the fourteen Core Snap fields
      as one exported array — key, label, input type, fixed options for Hash, Play Type, and
      Direction (SPEC §15–§18).
      *Verify:* one-shot Node assertions passed for fourteen fields and exact option lists;
      rendered checklist passed (approved plan §0.5 substitutes persistent tests).
- [x] **1.3 Derived-value functions.** `fieldZone.ts`, `situation.ts`, `provenance.ts` — pure,
      no imports from Convex.
      *Verify:* one-shot Node assertions passed for zone boundaries, all down/distance buckets,
      invalid inputs and all provenance states (approved plan §0.5). Persistent tests deferred.
- [x] **1.4 Terminology library.** `convex/domain/terminology.ts`: built-in Formations, Motions,
      Play Concepts (SPEC §19–§21, §96).
      *Verify:* imported by a scratch render; no duplicates in any list.
- [x] **1.5 Schema.** `convex/schema.ts` with every table and index from BLUEPRINT §5.
      *Verify:* typecheck and structural checks passed; live push and round trip passed.
- [x] **1.6 Deletion ledger.** `convex/deletions.ts`: `softDeleteBatch` helper (mints a batch id,
      stamps records, writes the ledger row), `undo`, `purgeExpired`. `convex/crons.ts` runs
      the purge daily.
      *Verify:* live push and round trip passed: hidden, restored, repeated Undo; fixtures removed.
- [x] **1.7 Router.** `HashRouter` with the full route table from BLUEPRINT §8, every screen a
      placeholder. Sidebar navigates; the workspace and source-game tab strips render.
      *Verify:* every one of the twenty-four routes reachable by URL and by click.
- [x] **1.8 Autosave and undo hooks.** `src/lib/db/use-autosave.ts` (debounce, flush on blur and
      unmount) and `use-undoable-mutation.ts` (runs a mutation, shows the Undo toast).
      *Verify:* a throwaway text field persists without a Save button and survives a reload.
- [x] **1.9 Reorder hook.** `src/lib/reorder.ts`: native drag handle props plus Move up / Move
      down buttons.
      *Verify:* a throwaway list reorders by mouse and by keyboard alone.
- [x] **1.10 UI primitives.** Vendor the ShadCN components the build needs: dialog, dropdown,
      select, checkbox, input, textarea, toast, tabs, tooltip, popover, table.
      *Verify:* typecheck clean; each renders once on a scratch route.

---

## Phase 2 — Coaching Templates

Templates gate first launch and Source Games, so they come first.

Implementation, verification, and final CLI follow-up: [Phase 2 report](plans/phase-2-completion.md).

- [x] **2.1 Starter template data.** `convex/domain/starterTemplates.ts`: all eleven Starter
      Coaching Templates with sections and fields (SPEC §24).
      *Verify:* approved one-shot assertions passed for eleven complete templates, options, names,
      analysis values, and column reconciliation; typecheck and live push passed.
- [x] **2.2 Template queries and mutations.** `convex/templates.ts`: list, getFull, create,
      duplicate, rename, remove, and the seeder that installs a starter template.
      *Verify:* seed a template from a scratch call; `getFull` returns nested sections and fields.
- [x] **2.3 Section and field mutations.** add / rename / reorder / remove for both, plus
      `updateField` and `addFieldOption`.
      *Verify:* reorder persists; removing a field soft-deletes it and returns a batch id.
- [x] **2.4 Coaching Templates screen.** List, create, duplicate, rename, delete with Undo.
      *Verify:* each action round-trips against a live deployment.
- [x] **2.5 Template Builder — structure.** Sections and fields with drag and keyboard
      reordering, inline rename, add and remove.
      *Verify:* native mouse drag and keyboard moves persist across reload; inline rename,
      Escape, failed-save draft retention, add focus, field/section Undo, and optimistic order passed.
- [x] **2.6 Template Builder — field editor.** All eight field types, select option management,
      the fixed 1–5 rating, the Required toggle, and the Carry-Forward toggle (SPEC §25–§28, §40).
      *Verify:* all eight types created in Electron and reloaded intact; options, Required,
      Carry-Forward, and option clearing on a type change passed against the live backend.
- [x] **2.7 Deletion protection.** Deleting a field or a template that holds data warns, states
      the affected Snap count, requires confirmation, soft-deletes, and offers Undo (SPEC §31).
      *Verify:* field/section/template counts 2/3/3, confirmations, Cancel focus, type locks,
      and Undo preserving values passed. Temporary hierarchy fixtures and module removed.
- [x] **2.8 Play Log Views.** Create, rename, delete named views on a template; a view stores
      visible columns and column order only (SPEC §38).
      *Verify:* two views persist independently; mouse/keyboard ordering, visibility, field
      reconciliation, duplication/remapping, validation errors, and confirmed hard delete passed.

---

## Phase 3 — Seasons, Workspaces, Home

- [x] **3.1 Settings singleton.** `convex/settings.ts`: get, completeFirstLaunch,
      setActiveSeason. Migrate the theme preference onto it.
      *Verify:* the document is created on first read and never duplicated.
- [x] **3.2 First Launch Setup.** Coaching-area picker (SPEC §4) that installs the matching
      starter template and marks first launch complete. Shown only when incomplete.
      *Verify:* fresh deployment routes to `/welcome`; after choosing, the template exists and
      the screen never returns.
- [x] **3.3 Seasons.** `convex/seasons.ts` plus the season picker in the shell. Name-only
      creation; the active season is the default destination (SPEC §6).
      *Verify:* create two seasons, switch, confirm the active one persists across a reload.
- [x] **3.4 Workspace CRUD.** `convex/workspaces.ts`: create with required Opponent Name and
      Week, optional date, team, notes; update; cascading soft delete.
      *Verify:* deleting a workspace hides its Source Games and Snaps; Undo restores all of them.
- [x] **3.5 Home screen.** Current season, current and recent opponents, New Opponent, and the
      secondary links. Nothing else (SPEC §5).
      *Verify:* matches the spec's include and exclude lists exactly.
- [x] **3.6 Season View and Create Opponent.** Season listing plus the creation dialog.
      *Verify:* a workspace created here lands in the correct season.
- [x] **3.7 Weekly Opponent Overview.** The seven counts and Continue Film Study (SPEC §8),
      served by one `getOverview` query.
      *Verify:* counts match hand-checked data across two source games.
- [x] **3.8 Archive.** Archive and unarchive a workspace; the Archived Opponents screen grouped
      by season (SPEC §84–§85).
      *Verify:* archived workspaces leave Home, appear under their season, and reopen intact.

---

## Phase 4 — Source Games and the Play Log

Implementation and verification: [Phase 4 completion report](plans/phase-4-completion.md).

The core of the product. Build the grid before the power features.

- [x] **4.1 Source Game CRUD.** Create with a label and exactly one template; rename; cascading
      soft delete (SPEC §9, §99).
      *Verify:* a game cannot be created without a template.
- [x] **4.2 Source Games List and Add dialog.** Empty state leads with Import Hudl CSV, with
      Create Manually secondary (SPEC §11).
      *Verify:* both paths reach the right screen.
- [x] **4.3 Snap read model.** `snaps.listBySourceGame` plus the column model that merges Core
      Snap fields with the game's template fields into one ordered column list.
      *Verify:* a game on a ten-field template yields twenty-four columns in template order.
- [x] **4.4 Play Log table shell.** TanStack Table into a plain `<table>`: vertical and
      horizontal scroll, sticky header, sticky first column, compact density (SPEC §32, §109).
      *Verify:* 200 seeded snaps scroll smoothly in both directions.
- [x] **4.5 Cell editing.** Read-only cells become editors on Enter or double-click, typed per
      field (text, number, select, multi-select, checkbox, rating, tags). Commit on Enter, Tab,
      or blur; cancel on Esc. Autosave, no Save button.
      *Verify:* every field type edits and persists; Esc discards.
- [x] **4.6 Keyboard navigation.** Arrow-key cell cursor, Tab and Shift+Tab, home and end rows.
      Enter never creates a row (SPEC §98).
      *Verify:* a full row charted without touching the mouse.
- [x] **4.7 Structured field position.** The Yard Line editor produces `OWN 35`, `50`, `OPP 22`
      and cannot express an invalid spot; Field Zone displays derived (SPEC §22).
      *Verify:* `OPP 0` and `OWN 60` are rejected at the input.
- [x] **4.8 Manual snap creation.** An explicit New Snap action that carries forward the fields
      marked Carry-Forward (SPEC §40).
      *Verify:* Personnel and Formation carry; Clip # and Yards do not.
- [x] **4.9 Inline terminology creation.** Formation, Play Concept, and template select fields
      accept a new value inline, which becomes reusable (SPEC §20, §21, §27).
      *Verify:* a formation added while charting appears in the next snap's picker.
- [x] **4.10 Provenance display and restore.** Imported markers, the Coach Edited state, and
      Restore original (SPEC §14).
      *Verify:* edit an imported cell, confirm the state flips, restore, confirm it flips back.

---

## Phase 5 — Play Log Power Features

- [x] **5.1 Column visibility.** The Columns dropdown; changes apply immediately (SPEC §33).
- [x] **5.2 Column reordering and resizing.** Header drag plus keyboard move; drag-to-resize
      (SPEC §34, §35).
- [x] **5.3 Layout persistence.** `columnLayouts` stores selected view, visible columns, order,
      and widths per Source Game. Sort and search deliberately do not persist (SPEC §39).
      *Verify:* relaunch the app; layout is identical, sort and search are cleared.
- [x] **5.4 View switching.** Apply a template's saved Play Log Views; save the current layout
      as a new view (SPEC §38).
- [x] **5.5 Single-column sorting.** Unsorted → ascending → descending, one column at a time
      (SPEC §36).
- [x] **5.6 Search.** One box narrowing rows by displayed values. No syntax, no per-column
      filters (SPEC §37).
- [x] **5.7 Multi-row selection and bulk edit.** Select rows, set one field across them, confirm,
      write a `bulkEdits` record, apply in one mutation (SPEC §41).
- [x] **5.8 Bulk-edit undo.** The toast restores every affected value as one operation.
      *Verify:* bulk-edit fifty rows over mixed prior values; Undo restores each original.
- [x] **5.9 Row actions menu.** Open Play Detail, Add Quick Note, Mark/Resolve Must Review,
      Add/Edit Play Diagram, Duplicate Snap, Delete Snap; destructive actions confirm (SPEC §43).
- [x] **5.10 Duplicate Snap.** Copies Core Snap Data and Template Analysis Data and nothing else
      (SPEC §44).
      *Verify:* the copy has no quick notes, cell notes, must-review flag, or diagram.
- [x] **5.11 Cell notes.** A note attached to one cell, editable from the cell and Play Detail
      (SPEC §42).
- [x] **5.12 Play Detail.** Core data, template fields grouped by section, cell notes, original
      imported values, quick note access, must-review status, diagram (SPEC §45).

---

## Phase 6 — Hudl CSV Import

- [ ] **6.1 CSV mapping module.** `convex/domain/csv-mapping.ts`: header signature, Hudl header
      aliases, auto-map, per-field coercion that never guesses.
      *Verify:* unit tests over a real Hudl header row, a renamed-column row, and dirty cells
      (`"1st"` in Down, empty Distance, `"O25"` in Yard Line).
- [ ] **6.2 Upload and parse.** File picker, Papa Parse, named errors for malformed input.
      *Verify:* a non-CSV file and an empty file both produce a clear message and no import.
- [ ] **6.3 Mapping screen.** Detected columns, auto-mapped known fields, manual mapping for the
      rest, Continue blocked while a required field is unmapped (SPEC §11).
- [ ] **6.4 Remembered mappings.** Store on success by signature; reuse silently; reappear when
      columns change, a required column disappears, or unknown columns appear (SPEC §11).
      *Verify:* second import of the same shape skips the mapping screen; a renamed column
      brings it back.
- [ ] **6.5 Import Preview.** Parsed rows, per-row exclusion, auto-flagging of likely special
      teams and no-play rows without removing them (SPEC §12).
- [ ] **6.6 Duplicate detection.** On import into a populated game, flag likely duplicates by
      clip #, then play #, then quarter and clock. Flagged, never blocked (SPEC §13).
      *Verify:* re-importing the same file flags every row.
- [ ] **6.7 Commit.** One mutation writes the included rows as Snaps with `imported` populated
      and `order` assigned.
      *Verify:* a 90-row file imports once, lands in order, and every cell reads `Imported`.

---

## Phase 7 — Observations and Must Review

- [ ] **7.1 Quick Notes backend and list.** Chronological per Source Game, default tags plus
      custom tags, tag filtering (SPEC §46, §47, §105).
- [ ] **7.2 Quick Note popup.** Create from the Play Log row menu without leaving the grid.
- [ ] **7.3 Must Review flag.** Toggle from the row menu, Play Detail, and the keyboard shortcut
      (SPEC §48).
- [ ] **7.4 Review Queue.** The flagged list for a Source Game.
- [ ] **7.5 Focused Review Mode.** Previous, Next, Skip, Resolve; resolving advances and removes
      from the queue; Quick Notes never enter it (SPEC §49).
      *Verify:* a five-snap queue worked to empty using only the keyboard.
- [ ] **7.6 Completeness warnings.** `countIncomplete` over Required fields; an informational,
      non-blocking warning when closing out a study session (SPEC §29, §103).
      *Verify:* the warning names the right count and never blocks.

---

## Phase 8 — Play Designer and Diagrams

- [ ] **8.1 Diagram document and SVG renderer.** Normalized 0–1 coordinates; one read-only
      renderer reused by the gallery, Play Detail, reports, and the PDF.
- [ ] **8.2 Canvas and player objects.** Place, drag, and delete offense/defense markers with
      optional label and jersey; clamped to bounds (SPEC §52).
- [ ] **8.3 Drawing tools.** Straight arrow, curved arrow, blocking bar, dashed line, freehand,
      erase. Fixed toolbar, nothing configurable (SPEC §53).
- [ ] **8.4 Diagram note and autosave.** The single note field; the whole diagram autosaves
      (SPEC §54).
- [ ] **8.5 Gallery.** Per Source Game: view, edit, delete with Undo, and attachment to a Snap
      (SPEC §55).
      *Verify:* a diagram drawn in the designer renders identically in the gallery and in a PDF.

---

## Phase 9 — Opponent Data and Tendencies

- [ ] **9.1 Aggregation function.** `convex/domain/aggregate.ts`: group Snaps by one or two
      fields into snap count, frequency, percentage, and average yards. Blank values become a
      distinct `(none)` group; average yards is `null` when no snap has yards (SPEC §56, §59).
      *Verify:* unit tests over a fixture including blanks, missing yards, and an empty scope.
- [ ] **9.2 Grouping field list.** Core Snap fields plus the structured template fields of the
      selected games (SPEC §57).
- [ ] **9.3 Opponent Data screen.** Game selection defaulting to all, Group By, optional second
      Group By, results table; statistics recalculate on selection change (SPEC §58, §106).
- [ ] **9.4 Derived situational grouping.** Down and Distance Situation and Field Zone available
      as grouping fields with no manual classification (SPEC §60, §22).
- [ ] **9.5 Tendency creation.** Create Tendency / Alert from a selected result row, freezing the
      snapshot. No freehand creation path exists (SPEC §61, §64, §65).
      *Verify:* import another game; the existing tendency's numbers do not move.
- [ ] **9.6 Tendency fields and categories.** Title, category (defaults plus custom),
      explanation, optional diagram, report-inclusion flag (SPEC §62, §63).
- [ ] **9.7 Tendencies screen.** List by category, edit, delete with Undo.

---

## Phase 10 — Reports and PDF

- [ ] **10.1 Report CRUD.** List, create as Coach or Player intent, rename, delete with Undo.
- [ ] **10.2 Block model and renderer.** All seven block types rendered from their stored
      snapshots (SPEC §72–§79).
- [ ] **10.3 Block insertion.** Add a Heading or Text block directly; add Opponent Data Table,
      Tendency, Play Diagram, Selected Plays, and Quick Notes blocks through pickers that copy a
      snapshot at insertion (SPEC §71).
      *Verify:* edit the source after inserting; the block does not change.
- [ ] **10.4 Block ordering and editing.** Drag plus keyboard reorder, inline edit, delete
      (SPEC §80). Autosaved.
- [ ] **10.5 Duplicate as Player Report.** Deep copy, independent thereafter; clip references
      hideable (SPEC §70, §81).
      *Verify:* edit the player report; the coach report is untouched.
- [ ] **10.6 Report Preview.** Paginated print layout: clean page breaks, no split table rows or
      diagrams, consistent spacing, no theming (SPEC §82, §83).
- [ ] **10.7 PDF export.** IPC to `webContents.printToPDF` against the preview route, with a save
      dialog and a surfaced error path.
      *Verify:* a multi-page report with tables and diagrams exports and prints legibly.

---

## Phase 11 — Hardening and Acceptance

- [ ] **11.1 Keyboard shortcut pass.** Every shortcut in BLUEPRINT §7.5 implemented and listed on
      a help overlay (SPEC §50).
- [ ] **11.2 Loading, empty, and error states.** Every route has all three; the Convex
      disconnected banner behaves per BLUEPRINT §10.
- [ ] **11.3 Accessibility pass.** Focus order, visible focus, labelled controls, keyboard paths
      for every drag interaction, table semantics.
- [ ] **11.4 Soft-delete audit.** Confirm all eight record kinds of SPEC §86 soft-delete, cascade
      per SPEC §87, and offer Undo per SPEC §88.
      *Verify:* one deliberate delete-and-undo per record kind.
- [ ] **11.5 Purge cron verification.** Records older than 24 hours are purged; undone records
      never are.
- [ ] **11.6 Full type check and production build.** `npm run build` clean; the packaged app
      launches.
- [ ] **11.7 Acceptance walk.** The SPEC §111 journey end to end on a real Hudl export: three
      source games, charting, notes, review, diagrams, opponent data, tendencies, a coach report,
      a player report, two PDFs, archive.
- [ ] **11.8 README.** Environment variables, `npx convex dev` setup, run and build commands,
      and the offline limitation stated plainly.

---
