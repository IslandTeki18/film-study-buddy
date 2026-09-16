# Phase 8 — Play Designer and Diagrams — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Ponytail mode is active: shortest working diff, reuse before writing, mark deliberate shortcuts with `// ponytail:` comments.

**Goal:** Deliver TASKS.md Phase 8 (8.1–8.5): a diagram document type, one read-only SVG renderer, the Play Designer editor with player objects and fixed drawing tools, autosaving diagram note, and the per-Source-Game gallery with Undo delete and Snap attachment.

**Architecture:** Diagrams are stored in the existing `diagrams` table with normalized 0–1 coordinates. One pure domain module defines the document shape and server-side normalization. One React SVG renderer draws a diagram at any size and is reused by the designer (as the base layer under an interactive overlay), the gallery cards, Play Detail, and later the report renderer and PDF (Phase 10). The designer holds the whole document in local state and persists it through the existing `useAutosave` hook and a single `diagrams.save` mutation.

**Tech Stack:** Convex (queries/mutations, existing soft-delete ledger), React 19, react-router 7, hand-written SVG with pointer events (BLUEPRINT D8), Tailwind. No new dependencies.

**Spec references:** SPEC §51–§55, §89 (autosave), §86–§88 (soft delete and Undo). BLUEPRINT §5.5 (`diagrams` table), §6 (`diagrams` API), §8 routes 14–15, §10 (clamp to bounds).

---

## 0. Pre-reading for the executing agent

Read these before touching code. They contain the patterns to copy.

| File | Why |
| --- | --- |
| `.claude/SPEC.md` lines 1063–1148 | Designer, Player Objects, Drawing Tools, Diagram Notes, Play Diagrams |
| `convex/schema.ts` lines 18–41, 190–202 | `playerValidator`, `shapeValidator`, `diagrams` table. **Do not change the schema.** |
| `convex/notes.ts` | Backend pattern: `isLiveGame`, `requireLive*`, `softDeleteBatch`, `returns` validators built from `schema.tables.X.validator.fields` |
| `convex/workspaces.ts` lines 105–140 | Existing cascade already soft-deletes diagrams by Snap and by Source Game. Nothing to add. |
| `src/features/notes/quick-notes.tsx` | UI pattern: loading/not-found states, `Page`/`Meta`/`Chip`, optimistic remove, `useUndoableMutation`, error surfacing |
| `src/lib/db/use-autosave.ts` | Autosave contract: `draft`, `setDraft`, `flush`, `status` |
| `src/routes/routes.tsx` lines 45–70, 100–120 | Tab strip and the `diagrams` / `diagrams/:diagramId` routes (already wired to placeholders) |
| `src/routes/play-diagrams-page.tsx`, `src/routes/play-designer-page.tsx` | Placeholders to replace |
| `src/features/play-log/row-actions.tsx` line 51, `src/features/play-log/play-detail.tsx` lines 157–159 | Existing links to `${base}/diagrams?snap=<snapId>` that the gallery must honor |
| `src/features/review/focused-review.tsx` lines 1–40 | Component shape for a route that resolves `game` then renders keyed content |
| `.claude/plans/phase-7-completion.md` | Completion-report format and Electron verification approach |

## 1. Scope and boundaries

**In scope**

- `convex/domain/diagram.ts` (pure types, constants, normalization).
- `convex/diagrams.ts` (queries and mutations).
- `src/features/designer/` (renderer, designer, gallery, small helpers).
- Replacing the two route placeholders.
- Play Detail: show the attached diagram thumbnail and the correct Add/Edit link.

**Out of scope (do not touch)**

- Schema changes. The `diagrams` table and validators already exist.
- Report blocks, Tendency diagram picking, PDF export (Phases 9–10). They will import the renderer.
- Cascade deletion (already implemented in `convex/workspaces.ts`).
- Row actions menu (already links to the gallery with `?snap=`).
- Global shortcut map in `src/lib/shortcuts.ts`. Designer tool keys are local to the designer.
- Formation presets, saved templates, text placement, configurable tools (SPEC §51, §53, §54 forbid them).

## 2. Assumptions and risks

| # | Assumption | Basis | Risk if wrong |
| --- | --- | --- | --- |
| A1 | A Snap has at most one live Play Diagram. | Row action reads "Add / Edit Play Diagram" (singular); cascade comment says "its Diagram"; SPEC §55 "Diagrams attach to plays". | If multiples are wanted, drop the uniqueness check in `create` / `attach` and change Play Detail to a list. Reversible. |
| A2 | A diagram may exist without a Snap and be attached later from the gallery. | `snapId` is optional in the schema and blueprint; TASKS 8.5 lists "attachment to a Snap" as a gallery action. | If unattached diagrams are unwanted, remove the New Play Diagram button from the gallery and require `?snap=`. Reversible. |
| A3 | The `name` column is not edited in V1. Gallery cards identify a diagram by its attached Snap (Clip # or order) or "Unattached". | SPEC §54 specifies exactly one Note field; no spec mention of names. | Adding a name input later is one field on the designer. |
| A4 | Canvas aspect is fixed at 5:3 (viewBox `0 0 1000 600`) showing a field segment with hash marks and yard lines. Normalized coordinates map `x` to 0–1000 and `y` to 0–600. | Blueprint says only "normalized 0–1". A fixed aspect keeps the renderer identical everywhere. | Changing the aspect later rescales existing diagrams uniformly; no data migration. |
| A5 | Curve shapes store six numbers `[x1,y1,cx,cy,x2,y2]` (quadratic Bézier with one control point). On creation the control point is the midpoint offset perpendicular by 0.12 of the segment length; a drag handle adjusts it while the curve is selected. | `shapeValidator.points` is a flat number array with no per-tool constraint. | None for storage. If the handle is judged unnecessary, delete it and keep the fixed offset. |
| A6 | Freehand stores raw sampled points, simplified by dropping points closer than 0.005 to the previous kept point, capped at 400 points. | Keeps documents small for the report snapshot copies. | Cap can be raised; comment marks it. |
| A7 | The 8.5 verify line mentions the PDF. PDF export does not exist until 10.7. Phase 8 verifies gallery, Play Detail, and designer render identically; the PDF half of that verify is recorded as deferred to 10.7 in the completion report. | TASKS.md ordering. | None. |
| A8 | Player markers: offense = circle, defense = triangle. Label inside the marker, jersey number below it. | Conventional football notation; both are text-legible at thumbnail size. | Cosmetic only. |
| R1 | Autosaving a whole document on every pointer move would spam mutations. | Mitigated: `setDraft` is called only on pointer up (end of a drag or stroke) and on note input; `useAutosave` debounces 400 ms. | |
| R2 | React StrictMode double-invokes effects; the `?snap=` auto-create path could create two diagrams. | Mitigated: guard with a ref, and `diagrams.create` rejects a second live diagram for the same Snap (A1). | |
| R3 | Pointer coordinates must be converted with the SVG's `getBoundingClientRect` and the viewBox, not `offsetX`, or the designer breaks when the canvas is scaled. | Use one `toNormalized(event, svgElement)` helper. | |
| R4 | Server must not trust client geometry. | `normalizeDiagram` runs in `diagrams.save`: clamps coordinates, drops malformed shapes, trims and length-limits label, jersey, and note. Malformed input throws a named error rather than saving partial data. | |

## 3. Files

| Action | Path | Responsibility |
| --- | --- | --- |
| Create | `convex/domain/diagram.ts` | Types, constants, `normalizeDiagram`, `clamp01`. Pure. No Convex imports. |
| Create | `convex/diagrams.ts` | `listBySourceGame`, `get`, `getBySnap`, `create`, `save`, `attach`, `remove`. |
| Modify | `convex/sourceGames.ts` | Export `isLiveSourceGame(ctx, id): Promise<boolean>` (moved from `notes.ts`). |
| Modify | `convex/notes.ts` | Import `isLiveSourceGame` instead of the private `isLiveGame`. Behavior unchanged. |
| Create | `src/components/diagram-svg.tsx` | Read-only renderer. The single source of diagram markup. Shared tier because `play-log` and later `reports` import it and BLUEPRINT §4 forbids feature-to-feature imports. |
| Create | `src/features/designer/geometry.ts` | Pure client helpers: `toNormalized`, `curveControl`, `simplifyFreehand`, `hitTestShape`, `hitTestPlayer`, `nudge`. |
| Create | `src/features/designer/play-designer.tsx` | The editor: toolbar, canvas overlay, player inspector, note field, autosave status. |
| Create | `src/features/designer/diagram-gallery.tsx` | Gallery list, New Play Diagram, `?snap=` resolution, Attach/Detach, Delete with Undo. |
| Modify | `src/routes/play-diagrams-page.tsx` | Render `DiagramGallery`. |
| Modify | `src/routes/play-designer-page.tsx` | Render `PlayDesigner`. |
| Modify | `src/features/play-log/play-detail.tsx` lines 157–159 | Query `diagrams.getBySnap`; render thumbnail + Edit link or Add link. |
| Modify | `.claude/TASKS.md` | Mark 8.1–8.5 `[~]` when implemented and `[x]` when verified. |
| Create | `.claude/plans/phase-8-completion.md` | Completion report in the Phase 7 format. |

No changes to `package.json`, `convex/schema.ts`, `src/lib/shortcuts.ts`, `src/routes/routes.tsx`, or `convex/workspaces.ts`.

## 4. Interfaces (define before implementing)

### 4.1 `convex/domain/diagram.ts`

```ts
export const DIAGRAM_TOOLS = ['arrow', 'curve', 'block', 'dashed', 'free'] as const
export type DiagramTool = (typeof DIAGRAM_TOOLS)[number]
export type PlayerSide = 'offense' | 'defense'
export interface DiagramPlayer { id: string; side: PlayerSide; x: number; y: number; label?: string; jersey?: string }
export interface DiagramShape { id: string; tool: DiagramTool; points: number[] }
export interface DiagramDoc { players: DiagramPlayer[]; shapes: DiagramShape[]; note?: string; name?: string }

export const DIAGRAM_ASPECT = { width: 1000, height: 600 } as const
export const PLAYER_LABEL_MAX_LENGTH = 6
export const PLAYER_JERSEY_MAX_LENGTH = 3
export const DIAGRAM_NOTE_MAX_LENGTH = 2000
export const DIAGRAM_MAX_PLAYERS = 30
export const DIAGRAM_MAX_SHAPES = 200
export const FREEHAND_MAX_POINTS = 400

export function clamp01(n: number): number
/** Validates and canonicalizes a client document. Throws Error with a coach-readable message on structural problems; clamps coordinates silently. */
export function normalizeDiagram(input: DiagramDoc): DiagramDoc
```

Rules inside `normalizeDiagram`:

- Every `id` is a non-empty string; duplicates across players or across shapes throw.
- Player `x`, `y` are finite numbers, clamped to 0–1. `label` trimmed, empty removed, max length enforced by truncation. Same for `jersey`.
- Shape `points`: all finite, clamped to 0–1, even length. Minimum length by tool: `arrow`, `block`, `dashed` exactly 4; `curve` exactly 6; `free` at least 4, at most `FREEHAND_MAX_POINTS * 2`. Anything else throws.
- Counts over `DIAGRAM_MAX_PLAYERS` or `DIAGRAM_MAX_SHAPES` throw.
- `note` trimmed; empty becomes `undefined`; over `DIAGRAM_NOTE_MAX_LENGTH` throws.
- `name` passes through trimmed (not edited in V1, see A3).

### 4.2 `convex/diagrams.ts`

| Function | Args | Returns | Behavior |
| --- | --- | --- | --- |
| `listBySourceGame` (query) | `{ sourceGameId }` | `Doc<'diagrams'>[]` | `[]` unless `isLiveSourceGame`. Live diagrams only. If `snapId` is set and that Snap is not live, the diagram is still listed (its own liveness is what matters; the gallery shows "Snap removed" like Quick Notes do). Sort by `updatedAt` descending. |
| `get` (query) | `{ diagramId: string }` | `Doc \| null` | `normalizeId`; null if missing, soft-deleted, or game not live. Follows the `sourceGames.get` string-id pattern used by routes. |
| `getBySnap` (query) | `{ snapId }` | `Doc \| null` | First live diagram on `by_snap`, null if Snap not live. |
| `create` (mutation) | `{ sourceGameId, snapId? }` | `Id<'diagrams'>` | `requireLiveSourceGame`; if `snapId`: `requireLiveSnap`, same game check, throw `'This Snap already has a Play Diagram'` if one is live (A1). Inserts `{ players: [], shapes: [], updatedAt: now }`. |
| `save` (mutation) | `{ diagramId, players, shapes, note? }` | `null` | Require live diagram and game. `normalizeDiagram`, then `patch` players, shapes, note (unset when undefined), `updatedAt`. Args use the same validators as the schema: build them from `schema.tables.diagrams.validator.fields`. |
| `attach` (mutation) | `{ diagramId, snapId: Id \| null }` | `null` | Null detaches. Otherwise `requireLiveSnap`, same-game check, uniqueness check (A1). Patches `snapId` and `updatedAt`. |
| `remove` (mutation) | `{ diagramId }` | `string` (batchId) | `softDeleteBatch({ kind: 'diagram', label: 'Play Diagram', records: [{ table: 'diagrams', id }] })`. |

Helper: `requireLiveDiagram(ctx, id)` mirrors `requireLiveQuickNote`.

### 4.3 `src/components/diagram-svg.tsx`

```tsx
export interface DiagramSvgProps {
  readonly diagram: Pick<DiagramDoc, 'players' | 'shapes'>
  readonly className?: string
  readonly title?: string          // <title> for accessibility; default 'Play Diagram'
  readonly selectedId?: string     // designer-only highlight; undefined everywhere else
  readonly children?: ReactNode    // designer overlay (handles, hit targets) rendered last
  readonly svgRef?: Ref<SVGSVGElement>
  readonly onPointerDown?, onPointerMove?, onPointerUp?, onPointerLeave?: PointerEventHandler<SVGSVGElement>
}
export function DiagramSvg(props: DiagramSvgProps): ReactNode
```

- `viewBox="0 0 1000 600"`, `preserveAspectRatio="xMidYMid meet"`, `width="100%"`, `role="img"`, `aria-label={title}`.
- Uses `currentColor` for strokes and Tailwind tokens for the field so it renders in light, dark, and unthemed print. No theme-specific colors baked in. Field: background `fill-muted`-style rect, five vertical yard lines at 1/6 intervals, two rows of hash ticks. Keep it a handful of elements.
- Shapes: `arrow` line with `marker-end` arrowhead (define `<marker>` once with a stable id prefixed by `useId()` so multiple diagrams on one page do not collide); `curve` quadratic path `M x1 y1 Q cx cy x2 y2` with the same arrowhead; `block` line ending in a short perpendicular bar (draw as a `path`, no marker); `dashed` line with `stroke-dasharray`; `free` polyline.
- Players: offense `<circle r=22>`, defense `<polygon>` triangle of similar extent; label as `<text>` centered, `font-size 16`, `text-anchor middle`; jersey as smaller `<text>` under the marker. Element `data-id={player.id}` on the group so the designer can hit-test by DOM.
- `selectedId` draws a dashed highlight ring around the matching player or shape.
- Exported constants `PLAYER_RADIUS = 22`, `STROKE_WIDTH = 4` reused by the overlay.

### 4.4 `src/features/designer/geometry.ts`

```ts
export function toNormalized(event: { clientX: number; clientY: number }, svg: SVGSVGElement): { x: number; y: number } // via getBoundingClientRect + preserveAspectRatio meet letterboxing, then clamp01
export function curveControl(x1, y1, x2, y2): { cx: number; cy: number } // midpoint + perpendicular * 0.12 (A5)
export function simplifyFreehand(points: number[]): number[] // A6
export function distanceToSegment(px, py, x1, y1, x2, y2): number
export function hitTestShape(shapes: DiagramShape[], x, y, tolerance = 0.02): DiagramShape | undefined // sample curves at 16 t-steps; free = polyline segments
export function hitTestPlayer(players: DiagramPlayer[], x, y, radius = 0.03): DiagramPlayer | undefined
export function nudge(value: number, delta: number): number // clamp01(value + delta)
```

`toNormalized` must account for letterboxing: compute the rendered content box from the rect and the 5:3 ratio before dividing.

### 4.5 `src/features/designer/play-designer.tsx`

```tsx
export function PlayDesigner({ workspaceId, sourceGameId, diagramId }: { readonly workspaceId: string; readonly sourceGameId: string; readonly diagramId: string }): ReactNode
```

Structure (mirror `FocusedReview`): outer component resolves `game` and `diagram` (loading, not found with a link back to the gallery), inner `DesignerContent key={diagram._id}` owns state.

State:

- `draft: DiagramDoc` via `useAutosave(serverDoc, save)`. `serverDoc` is `{ players, shapes, note }` picked from the query result and memoized by `updatedAt` so the hook's "adopt server value when not dirty" effect does not thrash.
- `tool: 'select' | 'offense' | 'defense' | DiagramTool | 'erase'` (local, default `'select'`).
- `selectedId: string | undefined`.
- `drawing: { tool, start, points } | null` and `dragging: { playerId, offset } | { controlOf: shapeId } | null` in refs (no re-render per move); a `preview` state updated on move only while drawing so the in-progress shape renders.

Interaction table:

| Tool | pointerdown | pointermove | pointerup |
| --- | --- | --- | --- |
| select | hit player → select and start drag; hit curve handle → drag control; hit shape → select; else clear selection | move player or control point (clamped) | commit via `setDraft` if anything moved |
| offense / defense | place player at point with new `crypto.randomUUID()` id, select it, `setDraft` | | |
| arrow / block / dashed | start | preview end point | commit if length > 0.01, else discard |
| curve | start | preview end, control from `curveControl` | commit; the new curve becomes selected so its control handle is visible |
| free | start with first point | append points to preview | `simplifyFreehand`, commit if ≥ 2 points |
| erase | hit player or shape → remove and `setDraft` | | |

Keyboard (only when focus is on the canvas wrapper, a `tabIndex=0` `div` with `aria-label="Play Designer canvas"`; ignore when `inDialog` or target is an input):

- `Delete` / `Backspace`: remove selected.
- Arrow keys: nudge selected player by 0.01; Shift = 0.05. Commits through `setDraft`.
- `Escape`: cancel in-progress drawing, then clear selection, then return tool to select.
- Tool keys: `V` select, `O` offense, `D` defense, `A` arrow, `C` curve, `B` block, `L` dashed, `F` freehand, `E` erase. These are listed as hints on the toolbar buttons (`title` and visible key badge) so the fixed toolbar documents itself.

Toolbar: `role="radiogroup" aria-label="Tools"`; each tool a `Button` with `role="radio" aria-checked`. Fixed order: Select, Offense, Defense, Straight Arrow, Curved Arrow, Blocking Bar, Dashed Line, Freehand, Erase. Nothing configurable (SPEC §53).

Inspector (right column, only when a player is selected): `Input` for label (`maxLength={PLAYER_LABEL_MAX_LENGTH}`), `Input` for jersey (`maxLength={PLAYER_JERSEY_MAX_LENGTH}`, `inputMode="numeric"`), Offense/Defense toggle, Delete button. All commit through `setDraft`. When a shape is selected show only its tool name and Delete.

Note (SPEC §54): one `Textarea` labelled "Diagram Note", `maxLength={DIAGRAM_NOTE_MAX_LENGTH}`, below the canvas; `onChange` → `setDraft`, `onBlur` → `flush`.

Autosave status: a `Meta` line reading `Saved`, `Saving…`, `Unsaved changes`, or `Save failed` plus a `Retry` button that calls `flush` (status `error`). `save` calls `api.diagrams.save` with `{ diagramId, players, shapes, note }`. No Save button (SPEC §89).

Header: "Play Designer", attached Snap label linking to Play Detail (or `Meta` "Unattached"), link "Back to Play Diagrams".

### 4.6 `src/features/designer/diagram-gallery.tsx`

```tsx
export function DiagramGallery({ workspaceId, sourceGameId }: { readonly workspaceId: string; readonly sourceGameId: string }): ReactNode
```

- Queries: `sourceGames.get`, `diagrams.listBySourceGame`, `snaps.listBySourceGame` (for labels and the attach picker).
- `?snap=<id>` handling in an effect guarded by a ref: when `diagrams` and `snaps` are loaded, if the Snap is in `snaps`: find its live diagram → `navigate(`${base}/diagrams/${id}`, { replace: true })`; else `create({ sourceGameId, snapId })` then navigate replace. If the Snap is not in the list, show a toast "Snap not found" and strip the param. Errors from `create` surface in a toast and leave the gallery visible.
- Header: "Play Diagrams", `Meta` count, `Button` "New Play Diagram" → `create({ sourceGameId })` then navigate to the designer.
- Empty state: "No Play Diagrams yet. Open the Play Designer from a Snap's row menu or create one here."
- Cards (`Panel`, responsive grid): `DiagramSvg` thumbnail wrapped in a `Link` to the designer with `aria-label="Edit Play Diagram for Snap N"`; caption line with Snap link (`Snap {clip ?? order}` → Play Detail), or `Meta` "Unattached", or `Meta` "Snap removed"; note preview (first 80 characters); actions: Edit (link), Attach (`Select` of Snaps that have no live diagram, label by clip number or order; choosing one calls `attach`), Detach (when attached), Delete.
- Delete: `remove` with an optimistic update filtering `listBySourceGame`, wrapped in `useUndoableMutation` with `deletions.undo`, message "Deleted Play Diagram". No confirmation dialog (matches Quick Notes; Undo is the safety net).

### 4.7 Play Detail change

Replace lines 157–159 of `src/features/play-log/play-detail.tsx` with a section that queries `api.diagrams.getBySnap({ snapId: snap._id })`:

- Loading → "Loading…".
- Diagram present → `DiagramSvg` at a modest width inside a `Link` to `${base}/diagrams/${diagram._id}` labelled "Edit Play Diagram", plus the note text if present.
- Absent → existing link text "Add Play Diagram" to `${base}/diagrams?snap=${snap._id}`.

The renderer lives in `src/components/diagram-svg.tsx` (shared tier, like `workspace-actions.tsx`) because `play-log` and later `reports` import it and BLUEPRINT §4 forbids feature-to-feature imports. `features/designer/` imports it from there.

## 5. Steps

Each step ends with typecheck clean and a commit. Follow existing commit style (`feat(designer): …`, `fix(designer): …`). Attribution lines per the session reminder.

### Task 1 — Domain module (TASKS 8.1, part 1)

- [ ] Create `convex/domain/diagram.ts` per §4.1.
- [ ] Run `npm run typecheck`. Expect clean.
- [ ] Commit: `feat(designer): diagram document types and normalization`.

### Task 2 — Backend (TASKS 8.1 part 2, 8.4 persistence, 8.5 backend)

- [ ] Move `isLiveGame` from `convex/notes.ts` into `convex/sourceGames.ts` as exported `isLiveSourceGame`; update `notes.ts` to import it. No behavior change.
- [ ] Create `convex/diagrams.ts` per §4.2.
- [ ] Run `npm run typecheck` and `npx convex dev --once`. Expect both clean and `convex/_generated/api.d.ts` to include `diagrams`.
- [ ] Commit: `feat(designer): diagrams queries and mutations`.

### Task 3 — Renderer (TASKS 8.1 part 3)

- [ ] Create `src/components/diagram-svg.tsx` per §4.3.
- [ ] Temporarily render it with a hard-coded fixture on the gallery placeholder to eyeball it in Electron (`npm run dev`), then remove the fixture before committing. Check: offense circle, defense triangle, all five shape tools visible, arrowheads on arrow and curve, bar on block, dashes on dashed, and the component scales when the window resizes.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(designer): read-only diagram SVG renderer`.

### Task 4 — Geometry helpers and designer canvas with players (TASKS 8.2)

- [ ] Create `src/features/designer/geometry.ts` per §4.4.
- [ ] Create `src/features/designer/play-designer.tsx` with: route resolution, toolbar (all buttons present, only Select / Offense / Defense / Erase functional in this step), canvas overlay, player placement, drag with clamping, selection, inspector, Delete key, arrow-key nudge, autosave wiring, status line, header. Drawing tools are wired in Task 5.
- [ ] Replace `src/routes/play-designer-page.tsx` with a component that reads `workspaceId`, `gameId`, `diagramId` from `useParams`, keeps the `isConvexConfigured` guard, and renders `PlayDesigner`.
- [ ] Manually create a diagram for testing by temporarily calling `create` from the browser console or from a temporary button on the gallery placeholder. Verify in Electron: place, drag, drag off-canvas clamps, label and jersey edit, side toggle, delete, reload shows the same state.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(designer): Play Designer canvas and player objects`.

### Task 5 — Drawing tools (TASKS 8.3)

- [ ] Wire arrow, curve, block, dashed, free per the §4.5 interaction table, including the in-progress preview, curve control handle, erase on shapes, shape selection and Delete key, and Escape behavior.
- [ ] Verify in Electron: each tool draws, persists across reload, erase removes exactly the clicked item, a zero-length drag creates nothing.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(designer): fixed drawing toolbar`.

### Task 6 — Diagram Note (TASKS 8.4)

- [ ] Add the Note textarea and blur flush per §4.5. Confirm the failed-save path: induce a failure (note longer than the limit via devtools, or disconnect Convex) and confirm the draft stays on screen, status reads "Save failed", Retry re-sends.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(designer): Diagram Note with autosave`.

### Task 7 — Gallery (TASKS 8.5)

- [ ] Create `src/features/designer/diagram-gallery.tsx` per §4.6.
- [ ] Replace `src/routes/play-diagrams-page.tsx` to render it (same shape as `quick-notes-page.tsx`).
- [ ] Remove any temporary create button or fixture from Tasks 3–4.
- [ ] Verify in Electron: New Play Diagram; row-menu "Add / Edit Play Diagram" on a Snap without a diagram creates and opens one; the same action on a Snap with a diagram opens the existing one; Attach and Detach; the attach picker excludes Snaps that already have a diagram; Delete then Undo restores the card; thumbnail matches the designer canvas.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(designer): Play Diagram gallery`.

### Task 8 — Play Detail integration

- [ ] Modify `src/features/play-log/play-detail.tsx` per §4.7.
- [ ] Verify in Electron: a Snap with a diagram shows the thumbnail and Edit link; one without shows Add; deleting the diagram from the gallery flips Play Detail to Add without reload.
- [ ] Run `npm run typecheck`.
- [ ] Commit: `feat(play-detail): show attached Play Diagram`.

### Task 9 — Verification, documentation, hand-off

- [ ] Run the full verification plan in §7 and record evidence.
- [ ] Update `.claude/TASKS.md`: 8.1–8.5 to `[x]` with one-line `*Evidence:*` entries in the existing style; add the "Completion and evidence" link line under the Phase 8 heading.
- [ ] Write `.claude/plans/phase-8-completion.md` in the Phase 7 format: per-step table, verification commands and results, decisions and assumptions (carry A1–A8 forward with the final choices), fixtures and cleanup, follow-up (PDF identity check deferred to 10.7).
- [ ] Commit: `docs: record Phase 8 verification and completion`.

## 6. Acceptance criteria

| ID | Criterion | TASKS step |
| --- | --- | --- |
| AC1 | `DiagramDoc` coordinates are 0–1; `normalizeDiagram` clamps out-of-range values and rejects malformed shapes with a readable error. The server calls it on every save. | 8.1 |
| AC2 | One `DiagramSvg` component is the only place diagram markup is produced. Gallery, designer base layer, and Play Detail all render through it. | 8.1 |
| AC3 | Offense and defense markers can be placed, dragged, and deleted; dragging past any edge clamps to the canvas; label and jersey are optional and editable. | 8.2 |
| AC4 | The toolbar contains exactly: Select, Offense, Defense, Straight Arrow, Curved Arrow, Blocking Bar, Dashed Line, Freehand, Erase. No settings, colors, or widths. | 8.3 |
| AC5 | Every drawing tool produces a persisted shape; Erase removes exactly the clicked player or shape; Delete key removes the selection. | 8.3 |
| AC6 | The diagram has one Note field. Players, shapes, and note persist without a Save button and survive reload. A failed save keeps the draft visible with a retry. | 8.4 |
| AC7 | The gallery lists a Source Game's live diagrams, opens the designer, attaches or detaches a Snap, and deletes with a single Undo that restores the diagram. | 8.5 |
| AC8 | A Snap has at most one live diagram; the row menu and Play Detail open the existing one or create it. | 8.5 |
| AC9 | Deleting a Snap or Source Game hides its diagrams; Undo restores them (existing cascade; regression only). | 8.5 |
| AC10 | Keyboard: tools are selectable by key, selection nudges with arrow keys, Escape cancels, focus is visible on the canvas and toolbar. | cross-cutting |
| AC11 | `npm run build` clean (typecheck, existing tests, electron-vite build). `npx convex dev --once` clean. | CLAUDE.md |

## 7. Verification plan

Run in this order. Record results in the completion report.

1. `npm run typecheck` — clean.
2. `npx convex dev --once` — pushes without error; generated API includes `diagrams.*`.
3. `npm run build` — clean.
4. Backend round trip with `ConvexHttpClient` (scratch script in the session scratchpad, not committed) against a throwaway Source Game:
   - `create` with a `snapId` twice → second call throws "already has a Play Diagram".
   - `save` with `x: 1.7` → stored `x` is 1.
   - `save` with a `curve` of 4 points → throws; document unchanged.
   - `save` with note of 2001 chars → throws.
   - `attach` to a Snap in another Source Game → throws.
   - `remove` → `listBySourceGame` omits it; `deletions.undo` → present again.
   - `snaps.remove` on the attached Snap → diagram hidden; undo → visible.
5. Electron (`npm run dev`), keyboard and mouse:
   - Row menu → Add / Edit Play Diagram on an undiagrammed Snap lands in the designer with that Snap in the header.
   - Place 11 offense and 11 defense markers; label three; jersey two; drag one off each edge; reload; identical.
   - Draw one of each of the five shapes; erase one; reload; the remaining four render identically in the gallery card and Play Detail.
   - Type a note; blur; reload; note present.
   - Keyboard-only pass: Tab to the toolbar, choose Offense with `O`, focus the canvas, place via Enter is not required (pointer placement is acceptable), nudge a selected marker with arrows, delete with Delete, `V`/`E`/`Esc` behave.
   - Gallery: Attach an unattached diagram to a Snap; Play Detail shows it; Detach; Delete; Undo.
   - Two Snaps cannot share a diagram and a Snap cannot receive a second one (picker excludes; backend rejects).
6. `git diff --check` clean.
7. Clean up the throwaway Source Game via the existing delete path.

Deferred: the "renders identically in a PDF" half of the 8.5 verify line runs at 10.7 when PDF export exists. State this in the completion report.

## 8. Decisions log

| Decision | Alternative rejected | Reason |
| --- | --- | --- |
| Hand-written SVG with pointer events | Canvas 2D, a drawing library | BLUEPRINT D8; identical markup in editor, gallery, report, PDF; no dependency. |
| Whole-document autosave through `useAutosave` | Per-object mutations | One mutation, one validator, one status line. Debounce already exists. Commit only on pointer up to bound write volume. |
| Renderer in `src/components/` | Inside `features/designer/` | `play-log` and later `reports` need it; BLUEPRINT §4 forbids feature-to-feature imports. |
| `isLiveGame` moved to `sourceGames.ts` | Duplicate it in `diagrams.ts` | Two copies of a liveness rule is how they drift. |
| No delete confirmation in the gallery | Confirm dialog | Matches Quick Notes; Undo is the safety net (SPEC §88). Snap and Workspace deletes confirm because they cascade; a diagram does not. |
| No name editing | Name input | Not in spec; the attached Snap identifies the diagram. |
