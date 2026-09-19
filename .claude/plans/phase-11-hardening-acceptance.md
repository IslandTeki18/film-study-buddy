# Phase 11 — Hardening and Acceptance — Implementation Plan

> **For agentic workers:** Execute steps in order (11.1 → 11.8). Each step is one commit on `main`.
> Do not push. Ponytail mode: shortest working diff, reuse before writing, mark deliberate
> shortcuts with `// ponytail:` comments. Use `superpowers:executing-plans` if available.
> **Stop and ask the owner** at every point marked **STOP**.

**Goal:** Close TASKS.md Phase 11 (11.1–11.8): shortcut pass with a help overlay, loading/empty/error
and disconnected states, accessibility fixes, soft-delete audit, purge hardening and verification,
a packaged build, the SPEC §111 acceptance walk on real Hudl data, and an accurate README.

**Tech stack:** existing only (Electron 44, electron-vite, React 19, Convex 1.45, Tailwind 4).
**One new devDependency:** `electron-builder` (owner-approved, step 11.6). No other dependencies.

**Spec references:** SPEC §50, §86–§88, §111, §113; BLUEPRINT §2 (Known Limitation), §7.2, §7.5,
§7.6, §10, §11; `ubiquitous-language.md` for all user-facing wording.

---

## 0. Owner decisions (already made, do not re-ask)

| # | Decision |
| --- | --- |
| O1 | Packaging: add `electron-builder`, produce an **unsigned** macOS `.app`/`.dmg` in `dist/` (already gitignored). No signing, no notarization, no auto-update. |
| O2 | Shortcuts: **reconcile BLUEPRINT §7.5 to the charting palette**. The spreadsheet grid was removed on 2026-09-14 by owner decision (see `phase-5-completion.md` last line). Grid-only keys (cell cursor arrows, Cmd/Ctrl+F search) are dropped from §7.5. Palette Enter-saves-a-Snap **stays**; amend the "Enter never creates a row" line accordingly. |
| O3 | Purge: **fix and verify**. Index soft-deleted tables by `deleteBatchId`, purge in bounded, self-rescheduling chunks. |
| O4 | Acceptance walk uses **real Hudl CSV exports supplied by the owner** in `fixtures/` (gitignored). |

## 1. Pre-reading for the executing agent

| File | Why |
| --- | --- |
| `.claude/BLUEPRINT.md` §2, §7.2, §7.5, §7.6, §10, §11 | Requirements this phase closes |
| `.claude/SPEC.md` lines 1046–1062, 1659–1721, 2104–2196 | §50 shortcuts, §86–§88 deletion/Undo, §111 journey, §113 success criteria |
| `.claude/plans/phase-10d-completion.md` | Completion-report format and evidence style to copy |
| `.claude/plans/phase-5-completion.md` lines 40–46, 108–112 | Prior purge check (backdated fixture pattern) and the grid-removal note |
| `.claude/plans/phase-1-completion.md` lines 55–81 | Purge/undo scan ceiling and cron schedule |
| `src/lib/shortcuts.ts`, `src/lib/shortcuts.test.ts` | Shortcut map and its existing test (must keep passing) |
| `src/components/ui/toast.tsx`, `src/lib/db/use-undoable-mutation.ts` | Single-toast Undo model |
| `src/features/play-log/snap-palette.tsx` lines 115–150, `play-log.tsx` lines 60–100 | Palette keydown handler and `save()` |
| `src/features/play-log/cell-editors.tsx` lines 20–30, 110–125 | Play Detail editors: Esc currently commits via blur |
| `src/app.tsx`, `src/main.tsx`, `src/convex-client.ts`, `src/components/error-boundary.tsx` | Shell, provider, boundary |
| `convex/deletions.ts`, `convex/crons.ts`, `convex/schema.ts` | Soft delete, undo, purge |
| `electron/main.ts` | Menu roles (Edit menu owns Cmd+Z), PDF export URL check |
| `src/features/*/*.check.mjs` | Existing live-deployment check-script pattern (`ConvexHttpClient` + `.env.local`) |

Verification tooling used by previous phases (reuse, keep scratch files **outside the repo**, e.g.
the session scratchpad or `/tmp/p11-*`):

- `npm run typecheck`, `npm run build` (typecheck + existing tests + electron-vite build).
- `npx convex dev --once` to push backend changes to the development deployment.
- `npm run dev -- --remoteDebuggingPort 9222` and a CDP script for real keyboard/pointer input.
- Temporary `ConvexHttpClient` scripts for backend round trips. Temporary internal Convex modules
  for fixtures must be deleted before the step's commit and re-pushed with `npx convex dev --once`.

## 2. Scope and boundaries

**In scope:** exactly the eight TASKS items, plus the doc amendments they require (BLUEPRINT §3,
§7.5, §7.6; TASKS status lines; completion report; README).

**Out of scope (do not touch):**

- Rebuilding the spreadsheet grid, search, column UI, or the bulk-edit UI (removed by owner).
- Dead code: `src/features/preview/charting-preview.tsx`, `src/routes/route-placeholder.tsx`.
  Leave them; record in the completion report.
- Sample-data aside content (`SPLIT_LABELS`, `TELLS` in `charting-aside.tsx`) shown with the
  preview badge.
- `collectSnapCascade` quadratic cost, orphan-after-undo edge case, shared-diagram detach on Snap
  delete (see R6–R8). Record, do not fix.
- A "Recently deleted" screen. Undo stays toast-only per SPEC §86.3.
- Code signing, notarization, Windows/Linux packaging.
- New persistent test files or `npm test` entries (owner excluded tests from this plan). The
  existing `npm test` suite must still pass because `npm run build` runs it.

## 3. Assumptions and risks

| # | Assumption / risk | Basis | Handling |
| --- | --- | --- | --- |
| A1 | Cmd/Ctrl+N saves the current palette draft as a Snap, identical to palette Enter (carry-forward included). | O2; palette `save()` already applies carry-forward. | Reversible: remove the SHORTCUTS entry. |
| A2 | Cmd/Ctrl+Enter on the Play Log opens Play Detail for the most recently created Snap in this session (`createdId`), else the last Snap in order; no-op with a toast "No Snap to open" when the log is empty. | No cell cursor exists to define "current Snap". | Reversible. |
| A3 | Cmd/Ctrl+Z runs the visible toast's action only when focus is **not** in an editable element; otherwise native text undo proceeds. The Edit-menu `undo` role calls `webContents.undo()`, which is a no-op outside editable fields, so both firing is harmless. | `electron/main.ts` editMenu role. | Verify in Electron (11.1 acceptance). If the menu swallows the key before the renderer sees it, **STOP** and report; do not remove the Edit menu. |
| A4 | Esc inside a Play Detail field editor reverts the field to its stored value and blurs **without saving**. Esc in the Cell Note editor keeps its current flush behavior (a note is free text; discarding it silently would lose data). | BLUEPRINT §7.5 "Esc cancels an edit"; CLAUDE.md "never silently discard user data". | Record the Cell Note exception in the completion report. |
| A5 | Designer keyboard paths: route points are covered by the existing "Stamp a route" buttons plus "undo last point"/"clear route"; no per-point keyboard drag is added. Zones, motion spot and Man coverage get new keyboard paths (11.3). | Stamps already produce every route shape keyboard-only. | Record in report. |
| A6 | The disconnected banner's Retry reloads the window, and is disabled while `hasInflightRequests` is true to avoid dropping queued writes. | Convex client has no public reconnect; it auto-reconnects with backoff. | Label explains why Retry is disabled. |
| A7 | Undone `deletions` ledger rows older than 24 h may be hard-deleted by purge. Their records are live and `undo` on an unknown batch is already a no-op. | `deletions.ts` `undo` handler. | Keeps the `by_createdAt` scan range bounded. Undone **records** are never touched. |
| A8 | `VITE_CONVEX_URL` is inlined at build time, so the packaged app talks to whatever deployment `.env`/`.env.local` named when `npm run package` ran. | Vite env semantics. | README states it. |
| R1 | `electron-builder` packs `dependencies` into the app (React, Convex, Anthropic SDK are bundled by Vite already, so this is dead weight). | package.json layout. | Accept; note app size in the report. Do not move dependencies. |
| R2 | PDF export checks the sender URL against `pathToFileURL(join(__dirname, '../renderer/index.html'))`. Inside `app.asar` the path must still match. | `electron/main.ts` `exportReportPdf`. | Verify export in the packaged app (11.6). If it fails, fix only the comparison, nothing else. |
| R3 | Adding 14 indexes triggers index backfill on push. Development data is small. | Convex behavior. | Push once; confirm `npx convex dev --once` success. |
| R4 | `useQuery(..., 'skip')` still throws without `ConvexProvider` in convex 1.45 (`use_queries.js` calls `useConvex()` first). Three screens crash when `VITE_CONVEX_URL` is unset. | Audit. | Fixed in 11.2. |
| R5 | Real Hudl CSVs may be absent when 11.7 starts. | O4. | **STOP** and ask. Do not substitute synthetic data. |
| R6 | Deleting a Snap attached to a multi-Snap Play Diagram patches the diagram's `snapIds` outside the batch; Undo does not re-attach. | `workspaces.ts` ~119. | Record as known gap. |
| R7 | Child deleted in batch A, parent in batch B, Undo A restores the child under a deleted parent; purging B orphans it. | Audit edge (d). | Record as known gap. |
| R8 | SPEC §88 bulk-edit Undo has a backend (`snaps.bulkUpdate`/`undoBulkUpdate`) but no UI since the grid removal; TASKS 5.7/5.8 remain checked. | Commit `6f6ade8`. | Record as deviation caused by owner's grid removal. |

## 4. Files likely to change

| Step | Action | Path | Change |
| --- | --- | --- | --- |
| 11.1 | Modify | `src/lib/shortcuts.ts` | Add `createSnap` (Cmd/Ctrl+N), `openPlayDetail` (Cmd/Ctrl+Enter), `undoToast` (Cmd/Ctrl+Z), `showHelp` (`?`); add `description` and `context` to every entry; add a display-only `LOCAL_KEYS` list |
| 11.1 | Modify | `src/lib/shortcuts.test.ts` | Only if the entry shape change breaks it; keep assertions equivalent |
| 11.1 | Modify | `src/components/ui/toast.tsx` | Expose `runAction()` on the context; add Cmd/Ctrl+Z listener in the provider |
| 11.1 | Modify | `src/features/play-log/snap-palette.tsx` or `play-log.tsx` | Cmd/Ctrl+N → `save()`; Cmd/Ctrl+Enter → navigate to Play Detail; update hint text |
| 11.1 | Modify | `src/features/play-log/cell-editors.tsx` | Esc reverts and blurs without saving (A4) |
| 11.1 | Create | `src/components/shortcut-help.tsx` | Help dialog listing `SHORTCUTS` + `LOCAL_KEYS`, opened by `?` and by a header button |
| 11.1 | Modify | `src/app.tsx`, `src/components/app-header.tsx`, `src/components/workspace-header.tsx` | Mount help once; add a "Keyboard shortcuts" button |
| 11.1 | Modify | `.claude/BLUEPRINT.md` §7.5 | Reconciled list (O2) |
| 11.2 | Modify | `src/components/error-boundary.tsx` | Retry + Home link; route-sized fallback option |
| 11.2 | Modify | `src/app.tsx` | Key the shell boundary by `location.pathname`; mount `ConnectionBanner` |
| 11.2 | Create | `src/components/connection-banner.tsx` | `useConvexConnectionState()` banner with Retry (A6) |
| 11.2 | Modify | `src/routes/settings-page.tsx`, `src/routes/routes.tsx` (`WorkspaceLayout`), `src/routes/play-detail-page.tsx` | Unconfigured-Convex guards (R4) |
| 11.2 | Modify | `quick-notes.tsx`, `review-queue.tsx`, `focused-review.tsx`, `diagram-gallery.tsx`, `play-designer.tsx`, `season-view.tsx`, `workspace-header.tsx`, `report-preview.tsx`, `settings-page.tsx` | Loading/empty/not-found gaps listed in 11.2 |
| 11.3 | Modify | `src/lib/reorder.ts` | Drop deprecated `aria-grabbed` |
| 11.3 | Modify | `section-list.tsx`, `view-editor.tsx`, `report-builder.tsx` | Drag handles `tabIndex={-1}` + `aria-hidden` (Move buttons are the keyboard path) |
| 11.3 | Modify | `src/features/designer/play-designer.tsx` | Keyboard zone move/resize, motion spot nudge, Man target select; formation `×` label; focus rings |
| 11.3 | Modify | `src/components/ui/dropdown-menu.tsx` | Menu accessible name from `triggerProps['aria-label']` |
| 11.3 | Modify | `src/features/preview/preview-shared.tsx` | `Segmented` roving tabindex + arrow keys |
| 11.3 | Modify | `src/features/play-log/charted-snaps.tsx`, `src/features/review/review-queue.tsx` | Real `<table>` semantics; link inside first cell |
| 11.5 | Modify | `convex/schema.ts` | `by_deleteBatchId` on 14 tables; `by_createdAt` on `bulkEdits` |
| 11.5 | Modify | `convex/deletions.ts` | Indexed restore/purge; bounded, self-rescheduling purge |
| 11.6 | Modify | `package.json`, `package-lock.json` | `electron-builder` devDependency, `build` config, `package` script |
| 11.6 | Modify | `.claude/BLUEPRINT.md` §3 | List `electron-builder` |
| 11.8 | Modify | `README.md` | Rewrite stale sections |
| all | Modify | `.claude/TASKS.md` | Status + one-line evidence per item |
| all | Create | `.claude/plans/phase-11-completion.md` | Completion report |

---

## Step 11.1 — Keyboard shortcut pass

**Current state:** `SHORTCUTS` holds only Cmd/Ctrl+R, J, K. No help overlay. Cmd+Z, Cmd+N, Cmd+Enter
unimplemented. Play Detail Esc commits instead of cancelling.

1. In `src/lib/shortcuts.ts`, extend each entry to
   `{ key, mod, label, description, context }` where `context` is one of
   `'Global' | 'Play Log' | 'Play Detail' | 'Focused Review Mode'`. Add:
   - `createSnap`: `n`, mod, "Save the Snap and start the next one (Carry-Forward applies)", Play Log.
   - `openPlayDetail`: `Enter`, mod, "Open Play Detail for the latest Snap", Play Log.
   - `undoToast`: `z`, mod, "Undo the last delete (while the Undo notice is showing)", Global.
   - `showHelp`: `?`, no mod, "Show keyboard shortcuts", Global.
   `isShortcut` rejects `shiftKey`; `?` is Shift+/ on US layouts. Match `showHelp` on
   `event.key === '?'` without the shift rejection (add a narrow branch; do not loosen other keys).
   Match `openPlayDetail` with `event.key === 'Enter'` (not lowercased letter compare issues).
2. Add `export const LOCAL_KEYS` (display only, not matched) documenting existing hard-coded keys:
   palette `1`–`9`, `Tab`/`Shift+Tab`, `Enter`, `Esc`; field-group tablist arrows/Home/End;
   Play Detail `Enter` commits, `Esc` cancels; designer `Delete`/`Backspace`, `Esc`, arrows,
   `Shift+arrows`, plus the new 11.3 designer keys (add them in 11.3 when implemented).
3. `toast.tsx`: add `runAction(): boolean` to the context value (runs and dismisses the visible
   toast's action; returns false when none). In `ToastProvider`, add one `document` keydown
   listener: if `isShortcut(event, 'undoToast')` and target is not editable
   (`input, textarea, select, [contenteditable="true"]`) and `runAction()` returned true, call
   `preventDefault()`. Import `isShortcut` from `@/lib/shortcuts`.
4. Play Log: in the palette keydown effect, before the existing modifier early-return, handle
   `createSnap` → `save()` and `openPlayDetail` → navigate to
   `/w/:workspaceId/games/:gameId/snap/:snapId` (A2). Pass the needed callback/ids down from
   `play-log.tsx` as props; do not add a context. Skip when `inDialog(event.target)`.
   Update the hint text to `… Enter or Cmd/Ctrl+N saves · ? shortcuts`.
5. `cell-editors.tsx`: on Esc in a field editor, reset the local draft to the stored value, mark
   the blur as cancelled (ref flag), then blur; the `onBlur` save path must skip when the flag is
   set. Leave the Cell Note editor's Esc flush unchanged (A4).
6. Create `src/components/shortcut-help.tsx`: a `Dialog` (existing `src/components/ui/dialog.tsx`)
   titled "Keyboard shortcuts", grouped by `context`, rendering `SHORTCUTS` then `LOCAL_KEYS` as a
   `<table>` with `<th scope="col">` Key / Action, keys in `<kbd>`. Export a `ShortcutHelp`
   component that owns its open state and registers the `?` listener (ignored in editable targets
   and inside dialogs). Render it once in `AppShell`. Header buttons open it by dispatching
   `window.dispatchEvent(new CustomEvent('shortcut-help:open'))`, which `ShortcutHelp` listens for
   (mark with `// ponytail:`; no context or store).
7. Add a compact "Shortcuts" button (`aria-label="Keyboard shortcuts"`, visible text `?`) to
   `app-header.tsx` and `workspace-header.tsx`.
8. BLUEPRINT §7.5: replace the list with the reconciled set from steps 1–2; replace "Enter never
   creates a row (SPEC §98)" with "In the charting palette, Enter and Cmd/Ctrl+N save the draft as
   a Snap; Enter never creates an empty Snap." Also update the invariant at BLUEPRINT §9 item 12
   to the same wording.

**Acceptance criteria**

- Every `SHORTCUTS` entry works in Electron in its context and appears in the help dialog.
- Cmd/Ctrl+Z after deleting a Quick Note restores it; Cmd/Ctrl+Z while typing in a text field
  performs native text undo and does not trigger Undo.
- Cmd/Ctrl+N with an empty draft creates nothing (existing `hasAnyValue` guard).
- Esc in a Play Detail field restores the stored value; reload confirms nothing was saved.
- `?` opens the dialog from Home, a Workspace tab and the Play Log; Esc closes it and focus
  returns to the previously focused element.
- `npm run typecheck` and `npm test` pass.

**Commit:** `feat(shortcuts): reconcile shortcut map and add help overlay`

---

## Step 11.2 — Loading, empty, and error states; disconnected banner

1. **Error boundary** (`error-boundary.tsx`): add a "Try again" button (resets `error` to null)
   and a Home link (`<a href="#/">`, the boundary may sit outside the router context). Replace
   `h-screen w-screen` with `min-h-[50vh] w-full`; the root boundary in `main.tsx` still centers.
2. **Reset on navigation** (`app.tsx`): in `AppShell`, `const location = useLocation()` and render
   `<ErrorBoundary key={location.pathname}>`. This gives every route an error state that clears
   when the coach navigates away. Query errors thrown by `useQuery` land here.
3. **Unconfigured Convex crashes (R4):**
   - `settings-page.tsx`: move the `useQuery` calls into a child component rendered only when
     `isConvexConfigured`; the `ThemeToggle` must render either way.
   - `WorkspaceLayout` in `routes.tsx`: when `!isConvexConfigured`, render the same
     `<p className="p-6">Convex is not configured</p>` pattern used by other pages instead of
     `WorkspaceHeader` + `Outlet`.
   - `play-detail-page.tsx`: add the same guard other pages use.
4. **Connection banner** (`src/components/connection-banner.tsx`): uses
   `useConvexConnectionState()`. Show when `!isWebSocketConnected` for ≥ 3 s (timer, so
   startup and brief blips do not flash). Text: "Not connected to Convex. Data on screen may be out
   of date, and changes will not reach the database until the connection returns." Retry button
   reloads the window; disabled while `hasInflightRequests` with visible text "Waiting to send
   pending changes" (A6). `role="status"`. Render it in `App()` only when `isConvexConfigured`, in
   both the `FirstLaunchGate` loading branch and `AppShell` (above the boundary, same slot as the
   existing configuration banner).
5. **Per-route gaps** (use the existing inline skeleton pattern
   `<div role="status" aria-label="Loading …" className="m-6 h-32 animate-pulse rounded bg-muted" />`;
   do not create a shared component):
   | Location | Fix |
   | --- | --- |
   | `quick-notes.tsx:22`, `review-queue.tsx:16`, `focused-review.tsx:18`, `diagram-gallery.tsx:57`, `play-designer.tsx:42` | Replace text "Loading…" with the skeleton |
   | `focused-review.tsx:~87` | Invalid Snap id with a non-empty walk shows "Loading…" forever: render "Snap not in the Review Queue" with a link to the Review Queue |
   | `review-queue.tsx:17`, `focused-review.tsx:19` | Not-found gets a link back to Source Games |
   | `workspace-header.tsx:29` | When the workspace query returns `null`, show "Workspace not found" instead of `'…'` forever |
   | `season-view.tsx` | Empty season: one line "No opponent workspaces in this season yet." above the existing New link |
   | `report-preview.tsx` | Empty Report renders the Report header (BLUEPRINT §10: "valid PDF containing the header only"); confirm it is not blank |
   | `settings-page.tsx:18-19` | Replace the `"—"` placeholders with the skeleton while loading |
6. Confirm the remaining routes in the audit table already satisfy loading/empty/error; list each
   route with its three states in the completion report.

**Acceptance criteria**

- With `VITE_CONVEX_URL` removed from `.env.local` (restore afterwards): app launches, Settings
  theme toggle works, every route shows a message, never a blank window or the boundary.
- With the dev app running, disable networking (macOS Wi-Fi off) for ≥ 5 s: banner appears;
  re-enable: banner disappears without reload. Cold start offline: banner appears over the
  loading skeleton.
- Throw from a component temporarily (scratch edit, reverted): boundary shows Try again + Home;
  navigating to another route clears it.
- Each row of the step-5 table verified in Electron.

**Commit:** `feat(shell): route error recovery, disconnected banner, state gaps`

---

## Step 11.3 — Accessibility pass

1. **Drag handles:** in `section-list.tsx` (2), `view-editor.tsx`, `report-builder.tsx`, give the
   `⠿` handle `tabIndex={-1}` and `aria-hidden="true"`; the adjacent Move up/down buttons are the
   keyboard path. Remove `aria-grabbed` from `reorder.ts` (and its return type).
2. **Designer keyboard paths** (`play-designer.tsx`), all scoped to the existing canvas keydown
   handler and only when a Player Object is selected:
   - Zone: `Alt+arrows` move the selected player's zone center (same step as player nudge;
     `Shift` for 5×); `Alt+[` / `Alt+]` shrink/grow `rx` and `ry` uniformly. Clamp to bounds.
   - Motion spot: `Alt+arrows` move the motion ghost when the player has motion and no zone.
     If both exist, zone wins; document in `LOCAL_KEYS`.
   - Man coverage: when `job === 'Man'` picking is active, render a native `<select>`
     (`aria-label="Covers"`) in the inspector listing opposing Player Objects by `describe()`;
     choosing one applies the same patch as the canvas click (reuse that code path, one function).
   - Add these keys to `LOCAL_KEYS` and the in-canvas hint text.
3. **Labels and focus:**
   - Formation `×` at `play-designer.tsx:~312`: add `aria-label="Remove formation <name>"`.
   - `play-designer.tsx:~311` and `:~320`: add `focus-visible:ring-2 focus-visible:ring-ring`.
   - `dropdown-menu.tsx:46`: menu `aria-label` uses `triggerProps['aria-label']` when present,
     else the string label, else `'Actions'`.
4. **Segmented** (`preview-shared.tsx`): roving tabindex (`tabIndex={value === id ? 0 : -1}`),
   ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End select and focus the adjacent option.
5. **Table semantics:** convert `charted-snaps.tsx` rows from `role="table"` divs with an
   `<a className="contents">` wrapper to a real `<table>` with `<thead>` `<th scope="col">`. Put a
   `<Link>` in the first data cell (`aria-label="Open Play Detail, clip N"`); keep whole-row mouse
   click via `onClick` navigation on `<tr>` (skipping clicks that originate on checkboxes, links or
   buttons). Preserve checkbox selection, Shift-click range, and select-all behavior exactly.
   Apply the same pattern to `review-queue.tsx`.
6. **Focus order walk:** Tab through Home, Workspace Overview, Source Games, Play Log, Play Detail,
   Opponent Data, Tendencies, Report Builder, Template Builder, Play Designer. Record any
   out-of-order stop; fix only if the fix is a DOM-order or `tabIndex` change in the same file.

**Acceptance criteria**

- Every drag interaction has a keyboard path, listed in the completion report as
  interaction → keys/control.
- Zone move/resize, motion move and Man coverage completed keyboard-only in Electron and persist
  after reload.
- No focusable element without a visible focus indicator on the walked screens.
- Screen-reader tree (Chromium accessibility tree via CDP `Accessibility.getFullAXTree`) shows the
  Play Log as a table with column headers and named row links.
- Bulk selection regression: checkbox, Shift-click range, select all, delete + Undo still work.

**Commit:** `fix(a11y): keyboard paths for drag interactions and table semantics`

---

## Step 11.4 — Soft-delete audit

Audit result already known (all eight kinds soft-delete, return a batch id and show Undo). This step
**verifies**; code changes only if verification fails.

| Kind | Mutation | UI caller |
| --- | --- | --- |
| Workspace | `workspaces.remove` | `src/components/workspace-actions.tsx` |
| Source Game | `sourceGames.remove` | `src/features/workspaces/source-game-actions.tsx` |
| Snap | `snaps.remove`, `snaps.removeMany` | `row-actions.tsx`, `charted-snaps.tsx` |
| Coaching Template | `templates.remove` | `template-list.tsx` |
| Template Field | `templates.removeField` | `section-list.tsx` |
| Tendency / Alert | `tendencies.remove` | `tendencies.tsx` |
| Play Diagram | `diagrams.remove` | `diagram-gallery.tsx` |
| Report | `reports.remove` | `report-list.tsx` |

1. Create a dedicated fixture Season "P11 Deletion Audit" through the UI or a temporary internal
   module, containing one Workspace with two Source Games, Snaps with Cell Notes, Quick Notes (one
   Snap-bound), a Must Review flag, analysis values, a Play Diagram, a Tendency, a Report, an
   Opponent Player with a Player Note, and one fixture Template with a Section and Field.
2. For each kind, in Electron: delete through the UI → confirm it and every §87 child disappear
   from every screen that listed them → press Undo in the toast (use Cmd/Ctrl+Z for at least two
   kinds) → confirm exact restoration (same ids, values, order, flags). For Workspace and Source
   Game, count children before/after with a read-only `ConvexHttpClient` script.
3. Record a table in the completion report: kind | children checked | before/after counts | Undo
   path used | result. Record R6, R7, R8 as known gaps.
4. Remove fixtures: delete the fixture Workspace/Template via the UI and let them purge, or remove
   the temporary module's rows; delete any temporary module and re-push.

**Acceptance criteria:** one deliberate delete-and-undo per record kind passes with exact
restoration; no real (non-fixture) record changed (compare counts of real Snaps/Reports before and
after).

**Commit:** `docs: record soft-delete audit` (TASKS + report only, unless a fix was needed; a fix
gets its own `fix(...)` commit first).

---

## Step 11.5 — Purge hardening and verification (O3)

1. `convex/schema.ts`: add `.index('by_deleteBatchId', ['deleteBatchId'])` to each of the 14
   tables in `softDeleteTables` (`seasons`, `workspaces`, `sourceGames`, `templates`,
   `templateSections`, `templateFields`, `snaps`, `cellNotes`, `quickNotes`, `diagrams`,
   `tendencies`, `reports`, `opponentPlayers`, `playerNotes`). Add
   `.index('by_createdAt', ['createdAt'])` to `bulkEdits`. Additive only; no field changes.
2. `convex/deletions.ts`:
   - `restoreTable` and the diagram branch: replace `.filter(deleteBatchId == batchId)` with
     `.withIndex('by_deleteBatchId', q => q.eq('deleteBatchId', batchId))`. Remove the
     `ponytail:` scan comment on `undo`.
   - Add `const PURGE_CHUNK = 500` with a `// ponytail:` comment naming it as the per-run document
     ceiling.
   - Rewrite `purgeExpired` to process **one** oldest ledger row per run:
     1. Take the first row from `by_createdAt` with `createdAt < cutoff`.
     2. If `undoneAt` is set, delete the ledger row (A7) and reschedule.
     3. Otherwise, for each table, `take(PURGE_CHUNK - deletedSoFar)` via `by_deleteBatchId` and
        delete. If the chunk budget is exhausted, reschedule **without** deleting the ledger row.
     4. When a batch has no remaining records, delete the ledger row and reschedule.
     5. When no expired ledger rows remain, purge `bulkEdits` via `by_createdAt` `lt cutoff`,
        `take(PURGE_CHUNK)`, rescheduling if the chunk was full.
     Reschedule with `ctx.scheduler.runAfter(0, internal.deletions.purgeExpired, {})`.
   - Keep `crons.ts` unchanged; the daily run starts the chain.
3. `npx convex dev --once`; confirm index backfill completes.
4. **Verification** (temporary internal module `convex/p11Verification.ts`, deleted before commit):
   - `seed`: create three fixture batches via existing delete mutations on fixture data:
     (a) expired, never undone, with > 500 records across ≥ 3 tables (e.g. a Source Game with 520
     Snaps); (b) expired and undone; (c) fresh (not expired). Backdate `deletions.createdAt` for
     (a) and (b) to `now - 25 h`. Also one backdated `bulkEdits` row.
   - Run `npx convex run deletions:purgeExpired '{}'`, wait for the scheduled chain to finish
     (poll `inspect` until stable).
   - `inspect` asserts: every (a) record and its ledger row are gone; (b) records are live and
     unchanged, (b) ledger row is gone; (c) records still soft-deleted and its ledger row present,
     and `deletions:undo` on (c) still restores them; backdated `bulkEdits` row gone; no real
     record count changed.
   - Undo latency: time `deletions:undo` on a fresh fixture batch; record it.
   - `teardown`, delete the module, re-push.

**Acceptance criteria:** the three assertions above pass; the > 500-record batch completed across
multiple scheduled runs (log the run count); typecheck and push clean; no real data changed.

**Commit:** `fix(deletions): indexed, chunked purge and indexed undo`

---

## Step 11.6 — Full type check, production build, packaged app (O1)

1. `npm install -D electron-builder` (latest stable). No other packages.
2. `package.json`:
   - script `"package": "npm run build && electron-builder --mac"`.
   - `"build"` config block: `appId: "com.filmstudybuddy.app"`, `productName: "Film Study Buddy"`,
     `directories.output: "dist"`, `files: ["out/**/*", "package.json"]`,
     `mac: { target: ["dmg", "dir"], identity: null, category: "public.app-category.sports" }`.
   Keep `"main": "out/main/main.js"`.
3. Run `npm run build`: must be clean (typecheck, all existing tests, electron-vite). Record test count.
4. Run `npm run package`. Launch `dist/mac-*/Film Study Buddy.app` (open from Finder or
   `open`). Verify: window shows Home with real data (A8), navigation across all tabs, the help
   overlay, a Report Preview PDF export saves (R2), theme toggle, and the disconnected banner with
   networking off.
5. BLUEPRINT §3: add `electron-builder` (packaging) to the added dependencies line.

**Acceptance criteria:** `npm run build` clean; packaged app launches and exports a PDF; the app
size and build time are recorded.

**Commit:** `build: package the macOS app with electron-builder`

---

## Step 11.7 — Acceptance walk (SPEC §111, O4)

**Precondition — STOP if unmet:** three real Hudl CSV exports exist in `fixtures/`. If not, stop and
ask the owner; do not substitute synthetic files.

Run in the **packaged app** from 11.6 against the development deployment. Create a dedicated Season
named "P11 Acceptance" so real data stays separate. Record each step's result and any defect.

1. Open app → select/create the "P11 Acceptance" Season → create a Weekly Opponent Workspace.
2. Add Source Game 1 with the Defensive Line template → Hudl CSV Import → confirm mappings →
   exclude irrelevant rows in Import Preview → import.
3. Chart in the Play Log palette (≥ 10 Snaps edited/added keyboard-first using 11.1 shortcuts).
4. Add a Quick Note, a Cell Note, Must Review on ≥ 3 Snaps, and one Play Diagram attached to a Snap.
5. Work the Review Queue in Focused Review Mode with J/K and resolve all flags.
6. Add Source Games 2 and 3 from the other two CSVs (second import of the same shape must reuse the
   remembered mapping); chart a few Snaps in each.
7. Opponent Data: all three games selected; group by Formation, then Formation × Play Concept.
8. Create ≥ 2 Tendencies / Alerts from result rows; add explanation and a Play Diagram to one.
9. Build a Coach Report with every Block type (Heading, Text, Opponent Data Table, Tendency,
   Play Diagram, Selected Plays, Quick Notes, Page Break).
10. Duplicate as Player Report; remove coaching-only Blocks; hide clip references.
11. Export both Reports as PDF from Report Preview; open each PDF and check pagination (no split
    table rows or diagrams).
12. Archive the Workspace; confirm it leaves Home and appears under its Season in Archived
    Opponents; reopen it intact.
13. Map each SPEC §113 bullet to the step that demonstrated it.

Defects found: fix only if the fix is small and inside Phase 11's files; otherwise record and
**STOP** for owner direction. Do not delete the acceptance data; record its ids and ask the owner
whether to keep it.

**Acceptance criteria:** all 13 steps pass; two PDFs saved and inspected; §113 mapping complete.

**Commit:** `docs: record Phase 11 acceptance walk` (TASKS + report; PDFs are not committed).

---

## Step 11.8 — README

Rewrite the stale sections of `README.md` (it still describes the scaffold-only theme build):

1. Intro: one paragraph describing the product per `ubiquitous-language.md` header.
2. Requirements: Node 22+, a Convex account; macOS for packaging.
3. Setup: `npm install` → `npx convex dev` (interactive login, writes `CONVEX_DEPLOYMENT`,
   regenerates `convex/_generated`) → copy the printed URL into `.env.local` as `VITE_CONVEX_URL`
   → `npm run dev`. Optional: `npx convex env set ANTHROPIC_API_KEY …`.
4. Environment variables table: keep the existing three rows; add a note that `VITE_CONVEX_URL`
   is baked in at build time (A8).
5. Scripts table: add `npm run package`; fix `npm test` description ("pure domain and UI helper
   self-checks").
6. Packaging: output path, unsigned app (Gatekeeper: right-click → Open first time).
7. **Offline limitation**, stated plainly: data lives in the coach's Convex deployment; with no
   network the app shows its shell, theme and a disconnected banner, and no data screen works
   (BLUEPRINT §2 Known Limitation; SPEC §3 not satisfied).
8. Keyboard shortcuts: one line pointing to the `?` overlay.
9. Structure: replace the scaffold tree with the BLUEPRINT §4 top-level layout (short).
10. Remove the stale "Adding Auth later" and the scaffold-specific theme narrative; keep a short
    Theme Settings paragraph with the edge-case table.

**Acceptance criteria:** a fresh clone following the README reaches a running app (walk it in a
temporary clone under the scratchpad, using the existing deployment URL); every script listed
exists in `package.json`; `git diff --check` clean.

**Commit:** `docs: README setup, packaging, and offline limitation`

---

## 5. Completion

1. Mark each TASKS 11.x `[x]` only when its acceptance criteria passed; otherwise `[~]` with the
   gap stated. Add a one-line `*Evidence:*` under each, matching earlier phases, and a link line
   under the Phase 11 heading to the completion report.
2. Write `.claude/plans/phase-11-completion.md` in the format of `phase-10d-completion.md`:
   per-step commit table, verification commands and results, decisions O1–O4 and assumptions
   A1–A8 as applied, known gaps R6–R8 plus dead code and sample-data aside, fixture cleanup.
3. Final gates: `npm run build` clean, `npx convex dev --once` clean, `git diff --check` clean,
   `git status` shows no stray scratch files.

## 6. Global rules for the executing agent

- Read each file fully before editing it. Grep all callers before changing a shared function
  (`isShortcut`, `useToast`, `ErrorBoundary`, `useReorder`, `DropdownMenu`, `Segmented`).
- User-facing wording must use `ubiquitous-language.md` terms (Snap, Play Detail, Review Queue,
  Undo, Play Diagram, Player Object).
- `convex/` file names are camelCase; `src/` names are kebab-case.
- No new dependencies beyond `electron-builder`. No new abstractions beyond those listed.
- Never modify or delete real (non-fixture) data. Before and after any backend verification,
  record real Snap and Report counts.
- Commit messages end with the attribution line required by the session. Do not push.
- **STOP** conditions: missing real CSVs (11.7); Cmd+Z intercepted by the Edit menu (A3); a
  required fix outside the listed files; any verification that cannot be run.
