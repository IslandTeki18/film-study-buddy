# Play Log: Charted Snaps first, charting in a sheet

Plan for Codex. Scope is `src/features/play-log/` plus one new UI primitive. No backend, schema,
or dependency changes.

## Task decision

**PROCEED (reshaped).** Swap the Play Log composition so existing Snaps lead, and host both
"chart a new Snap" and "finish an existing Snap" in one side sheet that reuses existing
components. No new form is built.

### Problem

After a Hudl CSV Import, a Source Game already holds most of its Snaps with Core Snap Data
filled and Template Analysis Data empty. The Play Log still leads with the Snap Palette, which
can only create new Snaps, and pushes the existing Snaps into the narrow aside. To finish an
imported Snap the coach leaves the Play Log for the full Play Detail page.

### Evidence (verified in the repository)

| Fact | Source |
| --- | --- |
| Main column holds `SnapPalette` and `ThisWeek`; `ChartedSnaps` is in the aside next to `ChartingAside`. | `play-log.tsx:106-146` |
| `SnapPalette` is create-only: `save()` calls `api.snaps.create`. | `play-log.tsx:69-85` |
| Clicking a card navigates to `${base}/snap/:id` (full-page Play Detail). | `charted-snaps.tsx:126-127` |
| `PlayDetail` already has an `embedded` mode (no `<main>`, no Must Review header, no page shortcuts). It is used inside Focused Review wrapped in `PendingFieldEdits`. | `play-detail.tsx:25-29`, `focused-review.tsx:99-101` |
| Field edits in Play Detail save on blur (`DeferredInput`) and register a `commit` in `PendingFieldEdits`; Focused Review awaits every commit before navigating. | `cell-editors.tsx:84-131`, `focused-review.tsx:54-58` |
| Imported Snaps are identifiable: `snap.imported !== undefined`. | `convex/schema.ts:177`, `charted-snaps.tsx:33` |
| Applicable Template fields depend on Play Type: `applicableColumns(columns, tree, { 'core:playType': … })`. | `palette-model.ts:86-91` |
| No Sheet primitive exists. `Dialog` is a native `<dialog>` with `showModal()`. | `src/components/ui/` listing, `dialog.tsx` |
| **The palette ignores keyboard events from inside any dialog** (`inDialog(event.target)` and `target.closest('… dialog, [role="dialog"]')`). Hosting it in a `<dialog>` without a change silently disables Enter, 1-9, Tab, Esc, Cmd+N and Cmd+Enter. | `snap-palette.tsx:122-137`, `shortcuts.ts:40-42` |
| The palette listens on `document`. If it stays mounted while the sheet is closed, Enter on the page body would save a hidden draft. | `snap-palette.tsx:120-160` |

### Decisions taken (user answers)

| Question | Answer |
| --- | --- |
| Sheet role | One sheet, two contents: the existing Snap Palette for a new Snap, embedded Play Detail for an existing Snap. |
| Snap list | Wider cards in the main column with charting progress, headline emphasis on **Play Type and Formation**. |
| This week | Stays in the main column, below the Snap list. |
| Esc in the sheet | Closes the sheet (A3 confirmed). The draft is kept; Clear stays a button. |

### Assumptions (not verified with the user; defaults chosen)

- A1. "Charting progress" counts **applicable Template Analysis fields only** (Core Snap Data
  normally arrives from Hudl). Displayed as `x/y charted`. Snaps with `y = 0` show no progress.
- A2. "Needs charting" filter = applicable Template fields exist and `x < y`. It combines (AND)
  with the existing "Must review only" toggle.
- A3. Inside the sheet, Esc closes the sheet (native dialog behavior). The palette's
  Esc-clears-draft key is dropped; the Clear button remains. The draft survives closing because it
  already lives in `GamePlayLog` state.
- A4. The palette stays open after Save snap (rapid manual charting with Carry-Forward unchanged).
- A5. The card's `#` link keeps going to the full Play Detail page; the rest of the card opens
  the sheet.
- A6. Cmd/Ctrl+N with the sheet closed opens the sheet in new-Snap mode (does not save).
  Cmd/Ctrl+Enter opens the latest Snap in the sheet instead of navigating.

## Acceptance criteria

| # | Criterion | Proof |
| --- | --- | --- |
| AC1 | The Play Log main column shows Charted snaps first, then This week. The aside contains only Note a player. The palette is not on the page until the sheet opens. | M1 |
| AC2 | Each card's headline shows Play Type (chip) and Formation; Play Concept, D&D, Zone, Personnel and Result follow on the second line. Missing values render `—`, never `undefined`. | M2 |
| AC3 | Each card shows `Imported` when `snap.imported` is set, and `x/y charted` for applicable Template fields. A Snap with no applicable Template fields shows no progress text. | M2, M3 |
| AC4 | "Needs charting" toggle (aria-pressed) narrows the list to Snaps with `x < y`; it combines with "Must review only"; select-all-shown applies to the narrowed list. | M3 |
| AC5 | A "Chart a snap" button in the header (and in the empty state) opens the sheet with the palette. All palette keys work inside the sheet: 1-9, Tab, Enter, Cmd/Ctrl+N save, Must Review toggle. | M4 |
| AC6 | Saving from the sheet creates the Snap, keeps the sheet open, applies Carry-Forward, and the new card is highlighted in the list behind the sheet. | M4 |
| AC7 | Closing the sheet (button, Esc, backdrop) with an unsaved draft and reopening restores the draft. With the sheet closed, pressing Enter on the page does not create a Snap. | M5 |
| AC8 | Clicking a card body opens that Snap's embedded Play Detail in the sheet; edits there autosave and the card updates (progress and headline) without reload. | M6 |
| AC9 | Closing the sheet while a Play Detail text field has an unblurred edit saves it first. If the save fails, a toast appears and the sheet stays open with the value kept. | M7 |
| AC10 | Sheet is a modal with an accessible name, focus moves into it on open and returns to the opener on close; Tab stays inside it. | M8 |
| AC11 | Strict typecheck and production build pass; the existing palette SSR check still passes. | V1, V2, V3 |

## Relevant repository map

| File | Role | Change |
| --- | --- | --- |
| `src/features/play-log/play-log.tsx` | Composition, draft state, create mutation | Re-compose layout; own sheet state; header button; Cmd+N / Cmd+Enter when sheet closed |
| `src/features/play-log/charted-snaps.tsx` | Card list, selection, import groups, bulk delete | Card content, progress, Imported marker, Needs charting toggle, `onOpenSnap` |
| `src/features/play-log/snap-palette.tsx` | Palette UI and document key handler | Accept keys from its own dialog; drop Esc-clear; hint text |
| `src/features/play-log/row-model.ts` | Snap display helpers | Add `chartingProgress` |
| `src/features/play-log/play-detail.tsx` | Play Detail, `embedded` mode | None expected |
| `src/features/play-log/cell-editors.tsx` | `PendingFieldEdits`, `DeferredInput` | None (reuse) |
| `src/features/review/focused-review.tsx` | Pattern for flushing pending edits | Reference only |
| `src/components/ui/dialog.tsx` | Native modal dialog | Reference; sheet wraps it |
| `src/components/ui/sheet.tsx` | **New**: right-edge variant of `Dialog` | New file |
| `src/components/ui/panel.tsx` | `Chip`, `Eyebrow`, `Meta` | Reuse |
| `src/features/review/review-queue.tsx` | Imports `LOG_GRID`, `LOG_HEADERS`, `SnapRowCells` from `charted-snaps.tsx` | Must keep these exports unchanged |

Patterns to reuse: optimistic `create` and `carriedValues` in `play-log.tsx` (unchanged);
toggle styling of "Show must review only"; `PendingFieldEdits` flush loop from Focused Review;
`applicableColumns` + `hasAnalysisValue` for progress.

## Implementation slices

Each slice compiles on its own (`npm run typecheck`).

### S1. Sheet primitive

`src/components/ui/sheet.tsx`: a thin wrapper that renders `Dialog` with sheet classes. No new
logic.

```tsx
export function Sheet({ className, ...props }: DialogProps): ReactNode {
  return <Dialog className={cn('m-0 ml-auto h-dvh max-h-none w-[min(960px,100vw)] max-w-none rounded-none rounded-l-xl overflow-y-auto p-0', className)} {...props} />
}
```

Requires `DialogProps` to be exported (it already is).

### S2. Progress helper

`row-model.ts`: add

```ts
export function chartingProgress(snap: Doc<'snaps'>, columns: readonly PlayLogColumn[], tree: TemplateTreeSections): { charted: number; total: number }
```

Uses `applicableColumns(columns, tree, { 'core:playType': snap.core.playType })`, keeps
`kind === 'template'`, counts `hasAnalysisValue(snap.analysis[field._id])`. Reuse the
`tree` type accepted by `applicableColumns`; do not add a new type if that one can be exported.

### S3. Card content and filter (`charted-snaps.tsx`)

- New props: `columns`, `tree`, `onOpenSnap: (id: Id<'snaps'>) => void`.
- Card body click calls `onOpenSnap(snap._id)` instead of `navigate`. Keep the `#` `Link` to the
  full page. Make the card body reachable by keyboard: add an "Open in sheet" button (or make the
  headline a `<button>`), since the existing `li` click is mouse-only.
- Headline: Play Type `Chip` + Formation (bold). Second line: Play Concept, D&D, Zone, Personnel,
  Result (filter empty parts, as today).
- Right side: `Imported` `Meta` when `snap.imported !== undefined`; `x/y charted` when
  `total > 0`, styled muted when complete and brand when incomplete.
- "Needs charting" toggle next to "Show must review only"; `shown` filters by both.
- Do not touch `LOG_GRID`, `LOG_HEADERS`, `SnapRowCells`, selection, import groups, delete.

### S4. Palette inside a dialog (`snap-palette.tsx`)

- Replace the three `!inDialog(event.target)` guards with "not in a dialog, or inside this
  palette's own section": `!inDialog(target) || section.current?.contains(target)`.
- In the generic branch, drop `dialog, [role="dialog"]` from the `closest(...)` selector and rely
  on the existing `section.current?.contains(target)` check.
- Remove the Escape-clears branch (A3). The hint `Meta` text does not mention Esc, so it stays.
- Keep props unchanged so `snap-palette.check.mjs` still renders.

### S5. Composition and sheet state (`play-log.tsx`)

- State: `const [sheet, setSheet] = useState<{ kind: 'new' } | { kind: 'snap'; snapId: Id<'snaps'> } | null>(null)`.
- Layout: main `<section>` renders header row with **Chart a snap** button, `ChartedSnaps`, then
  `ThisWeek`. Aside renders `ChartingAside` only.
- Render `SnapPalette` **only when `sheet?.kind === 'new'`** (prevents the hidden-draft Enter
  save). Pass the same props as today; `onOpenPlayDetail` now does
  `setSheet({ kind: 'snap', snapId })`.
- Render `<PendingFieldEdits value={edits.current}><PlayDetail embedded … snapId={sheet.snapId} /></PendingFieldEdits>`
  when `sheet?.kind === 'snap'`. Add a visible Close button and an "Open full Play Detail" link
  in the sheet header.
- `closeSheet()`: await all `edits.current` commits (Focused Review pattern); on rejection keep
  the sheet open (the field editor already toasts). Wire it to the Close button and to `onCancel`
  (`event.preventDefault(); void closeSheet()`) so Esc and backdrop also flush first.
- Document keydown in `GamePlayLog`, active only while `sheet === null`: `createSnap` opens
  `{ kind: 'new' }`; `openPlayDetail` opens the latest Snap. Guard with `inDialog` so other
  dialogs are unaffected.
- `ChartedSnaps` empty state: add a "Chart a snap" button beside "Import Hudl file" (pass an
  `onChartSnap` callback).
- Pass `columns` and `tree` to `ChartedSnaps`.

## Validation plan

| ID | Command | Expected |
| --- | --- | --- |
| V1 | `npm run typecheck` | Exit 0, no errors |
| V2 | `npm run build` | Typecheck, existing `npm test` suite, and electron-vite build all pass |
| V3 | `node src/features/play-log/snap-palette.check.mjs` | Prints `SnapPalette SSR checks passed …` |
| V4 | `git diff --stat` | Only the files in the repository map; `review-queue.tsx` untouched |

Automation does not cover layout, keyboard behavior in a modal, or Convex-backed saves; those
are the manual checks below.

## Manual-only checks

Run against a disposable Source Game with one Hudl import and a Coaching Template that has at
least one Required field. Start the renderer (`.claude/launch.json` → `renderer`, port 5174) with
the Convex dev deployment running.

| ID | Steps | Expected |
| --- | --- | --- |
| M1 | Open the Play Log. | Charted snaps then This week in the main column; aside shows only Note a player; no palette visible. |
| M2 | Inspect an imported card and a manual card with no Formation. | Play Type chip + Formation headline; `—` for missing; `Imported` only on the imported card. |
| M3 | Toggle Needs charting, then also Must review only; then select all shown. | List narrows per A2 and combined filter; select-all selects only shown cards; a Snap whose Play Type has no applicable Sections shows no progress and is excluded. |
| M4 | Click Chart a snap; use 1-9, Tab, Enter; press Cmd/Ctrl+N; toggle Must Review by shortcut. | All keys act inside the sheet; Save creates a card highlighted behind the sheet; sheet stays open; Carry-Forward fields prefilled. |
| M5 | Pick two values, press Esc, press Enter on the page, reopen the sheet. | Sheet closes; no Snap created by Enter; reopening shows the two picked values. |
| M6 | Click a card body; edit a Template field; blur. | Embedded Play Detail opens for that Snap; card progress `x/y` increments without reload. Keyboard: the card's open button reaches the same result. |
| M7 | In the embedded Play Detail, type into a text field and press the Close button without blurring. Repeat with the network offline (Convex disconnected). | Online: value saved, sheet closes. Offline: toast shown, sheet stays open, typed value kept. |
| M8 | Open the sheet with the keyboard, Tab through, close it. | Focus starts inside the sheet, cycles within it, returns to the opener on close; screen reader announces the sheet label. |
| M9 | Light and dark theme; window at 900px and 1600px. | Sheet fills the right edge, scrolls vertically, no horizontal page overflow. |

## Risks and rollback

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Palette key guard change lets keys leak from other dialogs (Quick Note, Player Note) | Accidental Snap save from another dialog | Guard requires the target to be inside the palette's own `section`; M4 plus opening a Quick Note dialog while the sheet is closed |
| Esc semantics change (A3, confirmed by the user) | Coaches used to Esc = clear | Clear button remains |
| Embedded Play Detail uses viewport `lg:` breakpoints, so its two-column grid applies inside a 960px sheet | Cramped right column | Acceptable at 960px; if not, pass a class to force one column when embedded (small follow-up) |
| Opening a just-saved optimistic Snap (`optimistic-…` id) | Sheet shows "Snap not found" briefly | `createdId` is the server id; only cards clicked in the sub-second optimistic window are affected |
| Pending edit flush on close relies on `DeferredInput` registration | Lost typed value if a field type bypasses `DeferredInput` | Select-based editors save on change, so only text inputs are deferred; M7 covers it |
| Palette layout/group selection resets each time the sheet opens | Minor friction | Draft is preserved; lift `layout` to parent only if requested |

Rollback: all changes are UI-only and confined to the files above. Revert the commit(s); no data
migration or schema change is involved.

## Explicitly excluded work

- Spreadsheet Play Log per SPEC §32-38 (inline cell editing, sort, search, column views). Separate
  plan if wanted.
- Editing an existing Snap through the palette (would need a multi-field update path and
  provenance handling).
- Changes to Play Detail content, the full-page Play Detail route, Focused Review, Review Queue.
- Backend, schema, Convex function, or dependency changes.
- Restyling This week, Note a player, or the Charting preview page.
- New tests (excluded per request).
