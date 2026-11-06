# Workspace-Shared Play Diagrams Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax. Execute tasks in order; each task leaves the app type-checking. Do not add tests (explicit user instruction). Do not add features beyond this plan.

**Goal:** A Play Diagram belongs to its Weekly Opponent Workspace, not to one Source Game. Every Source Game in the Workspace sees the same Play Diagrams gallery, and any diagram can be attached to Snaps from any Source Game in that Workspace.

**Architecture:** Add a `workspaceId` to the `diagrams` table with a `by_workspace` index, following the `opponentPlayers` pattern. `sourceGameId` stays and now means "the Source Game the diagram was created in" (origin). All scoping, liveness checks, uniqueness checks, and cascades move from `sourceGameId` to `workspaceId`. Deleting a Source Game no longer deletes diagrams.

**Tech Stack:** Convex (schema, queries, mutations), React + TypeScript desktop app (electron-vite), react-router.

**Decisions recorded (user-confirmed):**
- Share scope is one Workspace. Cross-Workspace libraries remain out of scope (SPEC.md lists "Shared diagram libraries" as out of scope).
- Deleting a Snap never deletes a Play Diagram that stays attached to another live Snap.
- When a Snap deletion would leave a Play Diagram with no live Snaps, the delete dialog asks "Keep the Play Diagram?" with the buttons **Keep Play Diagram** (delete the Snap, the diagram stays in the gallery), **Delete Play Diagram too** (delete both), and **Cancel**.

---

## Constraints for the executing agent

- Files under `convex/` use camelCase names. Do not create hyphenated files there (Convex push fails).
- Keep the existing public function names (`diagrams.create`, `save`, `attach`, `detach`, `remove`, `get`, `getBySnap`, `listByWorkspace`) and their argument shapes unless a step says otherwise. Only `listBySourceGame` is removed.
- Do not change the Play Designer canvas, drawing tools, report snapshot shape (`diagramSnapshotValidator`), or routes.
- Keep the one-diagram-per-Snap invariant. A Snap still has at most one live Play Diagram.
- Run `npm run typecheck` after every task. It must pass before moving on.
- Commit after each task with a conventional commit message (`feat(diagrams): ...`, `docs(diagrams): ...`).

## Assumptions

| # | Assumption | Consequence if wrong |
|---|---|---|
| A1 | Existing data is on a local Convex deployment the coach controls, so a one-off backfill via `npx convex run` is acceptable. | If multiple deployments exist, the backfill must be run on each before Task 3. |
| A2 | Every existing diagram's `sourceGameId` points to a Source Game row that still exists (live or soft-deleted). Purge deletes diagrams with their game today. | The backfill skips orphans and reports their count. They stay invisible, same as today. |
| A3 | Routes stay under `/w/:workspaceId/games/:gameId/diagrams[/:diagramId]`. The gallery is the same list from every Source Game tab. | No routing change. The "current game" only decides which Snaps the attach dropdown offers. |
| A4 | For a bulk delete, one question covers every diagram the selection would leave with no live Snaps. The dialog shows the count, for example "2 Play Diagrams are attached only to these Snaps." | If per-diagram choice is wanted, the dialog needs a list with a checkbox per diagram. That is not in this plan. |
| A6 | A Snap's reference is left in `snapIds` when the Snap is deleted. Readers skip deleted Snaps. | Undo of the Snap restores its attachment with no extra code. This replaces today's detach-on-delete, which Undo did not restore. |
| A5 | `sourceGameLabel` in `listByWorkspace` stays the origin game's label. If the origin game is soft-deleted, the label is an empty string. | Tendency picker and AI brief keep working. Display of origin is informational only. |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Schema push fails if `workspaceId` is made required before backfill. | Two-phase schema: optional in Task 1, required in Task 3 only after backfill reports zero missing rows. |
| R2 | Snaps of a soft-deleted Source Game stay in `snapIds`. | Intentional: Undo of the Source Game restores attachments. Every reader must resolve Snaps and skip ones that are deleted or whose game is deleted. |
| R3 | `snapIds` can now hold ids of deleted or purged Snaps. Any reader that counts or displays `attachedSnapIds(diagram)` raw will show stale attachments. | Task 4B Step 7 greps every reader and routes it through live-Snap resolution. |
| R4 | Uniqueness scans now cover the whole Workspace instead of one game. | Workspace diagram counts are small in V1. Add a `ponytail:` comment naming the ceiling. |
| R5 | Purge (`convex/deletions.ts` L141+) may rely on diagrams being purged with their Source Game. | Task 4 step checks purge. Diagrams are now purged only when their own batch or Workspace batch expires. |

## Files likely to change

| File | Change |
|---|---|
| `convex/schema.ts` (L217-233) | Add `workspaceId`, `by_workspace` index. |
| `convex/diagrams.ts` | Workspace scoping, uniqueness, `listByWorkspace` rewrite, remove `listBySourceGame`, add backfill `internalMutation`. |
| `convex/workspaces.ts` (L109-168) | Snap cascade drops diagram handling; Source Game cascade stops deleting diagrams; Workspace cascade deletes diagrams. |
| `convex/deletions.ts` (L97-112) | Undo occupancy check by workspace. |
| `convex/snaps.ts` (L267-293) | `remove` and `removeMany` take `keepDiagrams`; diagram handling moves out of `collectSnapCascade`. |
| `src/features/play-log/row-actions.tsx` | Single Snap delete dialog asks "Keep the Play Diagram?". |
| `src/features/play-log/charted-snaps.tsx` | Bulk Snap delete dialog asks the same question with a count. |
| `convex/tendencies.ts` (L95-98) | Validate by `diagram.workspaceId`. |
| `convex/reports.ts` (L92-95) | `liveDiagram` validates by `diagram.workspaceId`. |
| `convex/aiReports.ts` (L50-51) | Filter diagrams by attached Snaps' games or origin game. |
| `src/features/designer/diagram-gallery.tsx` | Read `listByWorkspace`; attached-Snap chips across games; optimistic remove key. |
| `src/features/designer/play-designer.tsx` (L43) | Accept diagrams from any game in the Workspace. |
| `src/features/designer/diagrams.check.mjs` | Only if it calls `listBySourceGame`; switch to `listByWorkspace`. |
| `.claude/SPEC.md`, `.claude/BLUEPRINT.md`, `ubiquitous-language.md` | Doc updates in Task 7. |
| `.claude/plans/workspace-play-diagrams-completion.md` | New completion record (project pattern). |

Files that must NOT change: `src/features/play-log/play-detail.tsx` (its links already use the current game base; it has no delete action; verify with `grep -n "remove" src/features/play-log/play-detail.tsx` and if a Snap delete exists there, apply Task 4B Step 5 to it too), `src/features/tendencies/*`, `src/features/reports/insert-block-dialogs.tsx`, `src/routes/*`. If typecheck forces a change there, keep it to the minimum and record why.

---

## Task 1: Schema field and backfill

**Files:** `convex/schema.ts`, `convex/diagrams.ts`

- [ ] **Step 1:** In the `diagrams` table in `convex/schema.ts`, add `workspaceId: v.optional(v.id('workspaces'))` next to `sourceGameId`. Add `.index('by_workspace', ['workspaceId'])`. Keep `by_sourceGame`.
- [ ] **Step 2:** In `convex/diagrams.ts` `create` (L57-71), add `workspaceId: game.workspaceId` to the inserted document. New rows are complete from now on.
- [ ] **Step 3:** In `convex/diagrams.ts`, add an `internalMutation` named `backfillWorkspaceId` (import `internalMutation` from `./_generated/server`). It:
  - reads every `diagrams` row (including soft-deleted) where `workspaceId === undefined`,
  - loads `ctx.db.get(row.sourceGameId)`; if the game exists, patches `{ workspaceId: game.workspaceId }` (do not touch `updatedAt`),
  - returns `{ patched: number, orphaned: number }`.
  - Add comment: `// ponytail: one-off backfill for workspace-shared diagrams; delete after every deployment reports patched=0.`
- [ ] **Step 4:** Run `npm run typecheck`. Expected: pass.
- [ ] **Step 5:** With `npx convex dev` running, run `npx convex run diagrams:backfillWorkspaceId`. Run it a second time. Expected second result: `{"patched":0, ...}`. Record both outputs for the completion notes.
- [ ] **Step 6:** Commit: `feat(diagrams): add workspaceId to Play Diagrams with backfill`.

## Task 2: Backend scoping in `convex/diagrams.ts`

**Files:** `convex/diagrams.ts`

- [ ] **Step 1:** Add a local helper `workspaceIdOf(diagram: Doc<'diagrams'>): Id<'workspaces'>` that returns `diagram.workspaceId` and throws `'Play Diagram not found'` if undefined. Task 3 makes the field required; then delete this helper and use the field directly.
- [ ] **Step 2:** `requireLiveDiagram` (L15-20): replace `requireLiveSourceGame(ctx, diagram.sourceGameId)` with `requireLiveWorkspace(ctx, workspaceIdOf(diagram))` imported from `./workspaces`. Check `requireLiveWorkspace`'s signature at `convex/workspaces.ts:12` and whether it also checks the Season; reuse it as is.
- [ ] **Step 3:** `hasLiveDiagramForSnap` (L22-25): change the first parameter to `workspaceId: Id<'workspaces'>` and query `by_workspace`. Add `// ponytail: scans the Workspace's diagrams per check; add a snapIds lookup table if Workspace diagram counts grow past V1 volume.`
- [ ] **Step 4:** `get` (L37-45): replace the `isLiveSourceGame` check with a Workspace liveness check (live workspace and live season, matching `listByWorkspace`'s existing checks at L133-137). Extract those checks into one local `isLiveWorkspace(ctx, id)` query helper in this file and reuse it in `get`, `getBySnap`, and `listByWorkspace`.
- [ ] **Step 5:** `getBySnap` (L47-55): keep the Snap and Snap-game liveness check. Load the Snap's game, then query diagrams `by_workspace` with `game.workspaceId`.
- [ ] **Step 6:** `create` (L57-71): replace `snap.sourceGameId !== game._id` with a check that the Snap's game has `workspaceId === game.workspaceId`; error text `'Snap belongs to a different Weekly Opponent Workspace'` (same text as `convex/opponentPlayers.ts:54-55`). Call `hasLiveDiagramForSnap(ctx, game.workspaceId, snap._id)`.
- [ ] **Step 7:** `attach` (L96-108): load the Snap's Source Game with `requireLiveSourceGame(ctx, snap.sourceGameId)`. Reject with the same Workspace error if `game.workspaceId !== workspaceIdOf(diagram)`. Call `hasLiveDiagramForSnap(ctx, game.workspaceId, snap._id, diagram._id)`.
- [ ] **Step 8:** Rewrite `listByWorkspace` (L129-145):
  - query `diagrams` `by_workspace`, filter live, sort by `updatedAt` desc;
  - `sourceGameLabel`: origin game label if that game is live, else `''`;
  - add `attachedSnaps: v.array(v.object({ snapId: v.id('snaps'), sourceGameId: v.id('sourceGames'), sourceGameLabel: v.string(), clipLabel: v.string() }))` resolved from `attachedSnapIds(diagram)`, skipping Snaps that are deleted or whose game is deleted. `clipLabel` is `String(snap.core.clipNumber ?? snap.order)` (same fallback the gallery uses today at the attach `<option>`).
  - Cache game lookups in a `Map` inside the handler to avoid repeated `ctx.db.get`.
- [ ] **Step 9:** Delete `listBySourceGame` (L27-35). Run `grep -rn "diagrams.listBySourceGame" src convex` and note every caller; they are fixed in Task 5. Remove the now-unused `isLiveSourceGame` import if unused.
- [ ] **Step 10:** `npm run typecheck`. Expected: failures only in `src/features/designer/diagram-gallery.tsx` (and `diagrams.check.mjs` is not type-checked). Do not commit yet; continue to Task 5 before committing if the gallery breaks the typecheck. Alternative: do Task 5 now, then commit both together as `feat(diagrams): scope Play Diagrams to the Workspace`.

## Task 3: Make `workspaceId` required

Run only after Task 1 Step 5 reported `patched: 0` on the second run.

- [ ] **Step 1:** In `convex/schema.ts`, change `workspaceId` to `v.id('workspaces')` (required).
- [ ] **Step 2:** Delete `workspaceIdOf` and use `diagram.workspaceId` directly. Delete `backfillWorkspaceId` only if the user confirms no other deployment needs it; otherwise leave it with its `ponytail:` comment and list it in the completion notes.
- [ ] **Step 3:** Confirm `npx convex dev` pushes the schema without a validation error. If it fails, stop, run the backfill again, and report the offending rows.
- [ ] **Step 4:** `npm run typecheck`. Commit: `feat(diagrams): require workspaceId on Play Diagrams`.

## Task 4: Cascades, Undo, and purge

**Files:** `convex/workspaces.ts`, `convex/deletions.ts`

- [ ] **Step 1:** `collectSnapCascade` (`convex/workspaces.ts` L109-126): delete the whole `if (!deletingSourceGame) { ... diagrams ... }` block, including its `ponytail:` comment. Diagram handling moves to Task 4B. Remove the `deletingSourceGame` parameter if nothing else uses it, and update its callers (`collectSourceGameCascade`, `convex/snaps.ts`).
- [ ] **Step 2:** `collectSourceGameCascade` (L129-148): change the table loop from `['quickNotes', 'diagrams']` to `['quickNotes']`. Diagrams survive Source Game deletion. Their `snapIds` keep the deleted Snaps so Undo restores the attachments (R2). Add comment: `// Play Diagrams belong to the Workspace; deleting a Source Game only hides its Snaps' attachments.`
- [ ] **Step 3:** `collectWorkspaceCascade` (L150-168): add `'diagrams'` to the `by_workspace` table list.
- [ ] **Step 4:** `restoreTable` diagrams branch (`convex/deletions.ts` L97-112): compute `occupied` from diagrams `by_workspace` with `diagram.workspaceId`.
- [ ] **Step 5:** Read the purge logic (`convex/deletions.ts` L141+). Confirm diagrams are purged by their own `deleteBatchId`, not by walking from a Source Game. If it walks from Source Games, change it to purge diagrams only via their batch. Record the finding in the completion notes.
- [ ] **Step 6:** Check `convex/snaps.ts:289` comment about rescanning the game's diagrams; update the wording to "the Workspace's diagrams" if the referenced code path changed.
- [ ] **Step 7:** `npm run typecheck`. Commit: `feat(diagrams): keep Play Diagrams when a Source Game is deleted`.

## Task 4B: Keep-or-delete Play Diagram on Snap deletion

**Files:** `convex/diagrams.ts`, `convex/snaps.ts`, `src/features/play-log/row-actions.tsx`, `src/features/play-log/charted-snaps.tsx`

Rule: a diagram is **orphaned by** a set of Snaps being deleted when it is live and every live Snap in its `attachedSnapIds` is in that set, with at least one attachment. Diagrams with another live Snap are never touched, and their `snapIds` are not patched (A6).

- [ ] **Step 1:** In `convex/diagrams.ts`, export `async function diagramsOrphanedBy(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, snapIds: ReadonlySet<Id<'snaps'>>): Promise<Doc<'diagrams'>[]>`. It queries `by_workspace` and keeps live diagrams where the attached ids that resolve to a live Snap (`ctx.db.get`, `deletedAt === undefined`) are non-empty and all in `snapIds`. Only Snaps in live Source Games count as live.
- [ ] **Step 2:** In `convex/diagrams.ts`, add query `countOrphanedBy({ snapIds: v.array(v.id('snaps')) })` returning `v.number()`. Resolve the Workspace from the first live Snap's Source Game; return `0` if none. Reject with the Workspace error if the Snaps span more than one Workspace.
- [ ] **Step 3:** In `convex/snaps.ts`, add `keepDiagrams: v.optional(v.boolean())` to the args of `remove` and `removeMany`. After building the Snap cascade records, when `keepDiagrams !== true`, append `{ table: 'diagrams', id }` for each result of `diagramsOrphanedBy(ctx, workspaceId, set of deleted Snap ids)`. Put them in the same `softDeleteBatch`, so one Undo restores Snap and diagram together. Missing `keepDiagrams` keeps today's behavior: the orphaned diagram is deleted.
- [ ] **Step 4:** Update the `ponytail:` comment above `removeMany`'s loop so it no longer mentions diagrams.
- [ ] **Step 5:** `row-actions.tsx` single delete dialog:
  - Query `api.diagrams.countOrphanedBy` with `{ snapIds: [snap._id] }` only while the dialog is open (`confirming ? args : 'skip'`), following the `DeleteConfirmDialog` pattern in `src/features/templates/delete-confirm-dialog.tsx`.
  - While the count is `undefined`, show `<p role="status">Checking for Play Diagrams…</p>` and disable the delete buttons.
  - Count `0`: keep today's dialog, but change the body to "Its Cell Notes and Quick Notes are soft-deleted with it. Undo restores them together."
  - Count `1`: the body is "This Snap's Play Diagram is not attached to any other Snap. Keep the Play Diagram?" The buttons are **Cancel** (`autoFocus`, outline), **Keep Play Diagram** (calls `remove({ snapId, keepDiagrams: true })`), and **Delete Play Diagram too** (calls `remove({ snapId, keepDiagrams: false })`).
  - `deleteSnap` in `useUndoableMutation` takes a `keepDiagrams: boolean` argument and passes it through. Both buttons share the existing `pending` and `error` handling.
- [ ] **Step 6:** `charted-snaps.tsx` bulk delete dialog: apply the same pattern with `{ snapIds: [...liveSelected] }`. For count `n > 0`, the body is "`n` Play Diagram(s) are attached only to these Snaps. Keep the Play Diagrams?", with buttons **Keep Play Diagrams** and **Delete Play Diagrams too**. Pass `keepDiagrams` through `deleteSnaps` into `removeMany`.
- [ ] **Step 7:** Stale-attachment readers (R3). Run `grep -rn "attachedSnapIds" src convex --include='*.ts' --include='*.tsx'`. For every reader that displays, counts, or decides from attachments:
  - Gallery chips and "Unattached" use `diagram.attachedSnaps` (Task 5 Step 4), which is already live-only.
  - Occupancy checks (`hasLiveDiagramForSnap`, gallery `availableSnaps`, pick mode) look up a live Snap, so stale ids are harmless. Leave them.
  - Any other display (for example the Play Designer header, if it lists attached Snaps) filters to live Snaps. Record each reader and its decision in the completion notes.
- [ ] **Step 8:** `npm run typecheck`. Commit: `feat(diagrams): ask before deleting a Snap's only Play Diagram`.

## Task 5: Consumers of the diagram scope

**Files:** `convex/tendencies.ts`, `convex/reports.ts`, `convex/aiReports.ts`, `src/features/designer/diagram-gallery.tsx`, `src/features/designer/play-designer.tsx`, `src/features/designer/diagrams.check.mjs`

- [ ] **Step 1:** `convex/tendencies.ts` L95-98: replace the game lookup with `!diagram || diagram.deletedAt !== undefined || diagram.workspaceId !== tendency.workspaceId`. Workspace liveness is already implied by `requireLiveTendency`; verify that by reading it. Remove unused imports.
- [ ] **Step 2:** `convex/reports.ts` `liveDiagram` L92-95: return the diagram if live and `diagram.workspaceId === workspaceId`. Remove the `isLiveSourceGame` call and unused imports.
- [ ] **Step 3:** `convex/aiReports.ts` L50-51: keep a diagram if its origin `sourceGameId` is in `gameIds` OR any `attachedSnaps[].sourceGameId` is in `gameIds`.
- [ ] **Step 4:** `diagram-gallery.tsx`:
  - L19: `useQuery(api.diagrams.listByWorkspace, game ? { workspaceId: game.workspaceId } : 'skip')`.
  - L20: keep `snaps.listBySourceGame` for the current game. The attach dropdown (`availableSnaps`) still offers only the current game's Snaps not attached to any Workspace diagram. Occupancy must be computed from the full Workspace list (it already is, once L19 changes).
  - Attached-Snap chips: render from `diagram.attachedSnaps` instead of `attachedSnapIds(diagram)` plus `snapLabels`. Link to `/w/${workspaceId}/games/${s.sourceGameId}/snap/${s.snapId}`. Label: `Snap ${s.clipLabel}` for the current game, `${s.sourceGameLabel} · Snap ${s.clipLabel}` for other games. Update the detach `aria-label` to match. Show `Unattached` when `attachedSnaps` is empty.
  - Optimistic remove (around L117-119): key on `{ workspaceId: game.workspaceId }` with `api.diagrams.listByWorkspace`. Pass `workspaceId` into `DiagramCard` if it only has `sourceGameId` today.
  - Pick mode (L29-40): the `attached` lookup keeps using `attachedSnapIds(diagram)`; it now searches the Workspace list, which is correct.
  - Remove imports that become unused.
- [ ] **Step 5:** `play-designer.tsx` L43: replace `diagram.sourceGameId !== game._id` with `diagram.workspaceId !== game.workspaceId`. Read how `DesignerContent` uses `snaps` (L57). If it labels attached Snaps, switch that labeling to a `diagrams.listByWorkspace`-style resolution only if the designer shows attached Snaps; otherwise leave it. Keep the change minimal and record what it does.
- [ ] **Step 6:** `diagrams.check.mjs`: replace any `listBySourceGame` call with `listByWorkspace`. Do not add new checks.
- [ ] **Step 7:** `npm run typecheck`. Expected: pass. Commit (with Task 2 if not yet committed).

## Task 6: Build

- [ ] **Step 1:** Run `npx electron-vite build` (production build without adding tests). Expected: success. Also run `npm run build` once; it runs the existing test suite, which must still pass unchanged.

## Task 7: Documentation

Keep edits to the sentences that state Source Game scope. No restructuring.

- [ ] **Step 1:** `.claude/SPEC.md` §55 (L1114-1131): "attached to several Snaps in the same Source Game" becomes "in the same Weekly Opponent Workspace". "Each Source Game contains a Play Diagrams gallery" becomes "Each Weekly Opponent Workspace has one Play Diagrams gallery, reachable from every Source Game". Delete tree (L1690-1705): move "Play Diagrams" from under Source Game to under Workspace. Hierarchy (L2053) similarly. In the same delete section, state the Snap rule: deleting a Snap never deletes a diagram still attached to another live Snap, and a diagram left with no live Snaps is kept or deleted by the coach's answer to "Keep the Play Diagram?".
- [ ] **Step 2:** `.claude/BLUEPRINT.md` L227-231: update the `diagrams` table description (`workspaceId`, origin `sourceGameId`, `snapIds`). L328-330: cascade hierarchies (Workspace owns Diagrams; Source Game no longer cascades them).
- [ ] **Step 3:** `ubiquitous-language.md`: Source Game entry (L22-26) drops "and Play Diagrams" from what it holds. Play Diagram entry (L138-141): add "Belongs to a Weekly Opponent Workspace and is shared by every Source Game of that Workspace", mirroring the Opponent Player wording.
- [ ] **Step 4:** Create `.claude/plans/workspace-play-diagrams-completion.md` following the style of `.claude/plans/shared-play-diagrams-completion.md`: what changed, backfill outputs, purge finding (Task 4 Step 5), designer finding (Task 5 Step 5), R3 as follow-up, whether `backfillWorkspaceId` was kept.
- [ ] **Step 5:** Commit: `docs(diagrams): record workspace-shared Play Diagrams`.

---

## Acceptance criteria

1. A Play Diagram created in Source Game A appears in the Play Diagrams gallery of Source Game B in the same Workspace.
2. From Source Game B's gallery, that diagram can be attached to a Snap of Game B. Play Detail for that Snap shows the diagram and "Edit" opens it in the Play Designer.
3. The Play Designer opens a diagram from any Source Game route in the same Workspace. It shows "Play Diagram not found" for a diagram from another Workspace.
4. Attaching a Snap from a different Workspace fails with "Snap belongs to a different Weekly Opponent Workspace".
5. A Snap still cannot have two live Play Diagrams, including when the diagrams originate in different Source Games.
6. Gallery attachment chips show Snaps from all Source Games of the Workspace, labeled with the game for Snaps outside the current game, and link to that Snap.
7. Deleting Source Game A keeps its diagrams in the Workspace gallery. Its Snaps disappear from the chips. Undo of that deletion restores the chips.
8. Deleting the Workspace soft-deletes its diagrams; Undo restores them.
8a. Deleting a Snap whose diagram is attached to another live Snap shows no diagram question and never deletes the diagram. Undo restores the Snap's attachment.
8b. Deleting a Snap whose diagram is attached only to it asks "Keep the Play Diagram?". **Keep Play Diagram** deletes only the Snap, and the diagram shows as Unattached in the gallery. **Delete Play Diagram too** deletes both, and one Undo restores both with the attachment. **Cancel** changes nothing.
8c. The bulk delete asks once, shows the count of diagrams it would leave with no live Snaps, and applies the answer to all of them.
9. Tendency diagram picker and Report Play Diagram block picker list every live diagram in the Workspace and reject diagrams from other Workspaces.
10. All pre-existing diagrams are visible after the backfill; the second backfill run reports `patched: 0`.
11. `npm run typecheck` and the production build pass.

## Verification plan (manual, no new tests)

Run the app with `npm run convex:dev` and `npm run dev`. Use one Workspace with two Source Games (A, B) and a second Workspace (W2).

| # | Action | Expected | Covers |
|---|---|---|---|
| V1 | Before Task 1, note diagram count in A's gallery. After backfill, open A and B galleries. | Both show the same list, count unchanged. | AC1, AC10 |
| V2 | In B's gallery, attach A's diagram to a B Snap via the dropdown. | Chip appears labeled with game B's Snap; A's chips remain labeled "A · Snap n" from B's view. | AC2, AC6 |
| V3 | Open that B Snap's Play Detail, click Edit. Draw, wait for Autosave, reopen from A's gallery. | Same diagram, edits present. | AC2, AC3 |
| V4 | In B's Play Detail for a Snap without a diagram, use "Use existing" and pick A's diagram. | Attaches and returns to the Snap. | AC2 |
| V5 | Try to attach a Snap already holding a diagram (via pick mode `?snap=`). | Error toast "This Snap already has a Play Diagram". | AC5 |
| V6 | Paste a W2 diagram id into `/w/<W1>/games/<B>/diagrams/<id>`. | "Play Diagram not found". | AC3 |
| V7 | In the Convex dashboard, run `diagrams:attach` with a W1 diagram and a W2 Snap. | Error "Snap belongs to a different Weekly Opponent Workspace". | AC4 |
| V8 | Delete Source Game A. Open B's gallery. Then Undo. | Diagrams remain; A chips vanish, then return after Undo. | AC7 |
| V9 | Delete the Workspace, then Undo. | Diagrams gone, then restored with attachments. | AC8 |
| V9a | Attach one diagram to Snaps 1 and 2. Delete Snap 1 from the row menu. Then Undo. | No diagram question. The diagram keeps Snap 2. After Undo it shows both Snaps. | AC8a |
| V9b | A diagram attached only to Snap 3. Delete Snap 3, choose **Keep Play Diagram**. | Snap gone, diagram in gallery as Unattached. | AC8b |
| V9c | Same setup with Snap 4, choose **Delete Play Diagram too**, then Undo. | Both gone, then both back with the attachment. | AC8b |
| V9d | Same setup, choose **Cancel**. | Nothing changes. | AC8b |
| V9e | Select Snaps 5 and 6 whose diagrams are one-to-one, bulk delete. | Dialog says 2 Play Diagrams; the choice applies to both. | AC8c |
| V10 | Open Tendency diagram picker and Report "Play Diagram" block dialog. | Both list diagrams from A and B. | AC9 |
| V11 | Run `npm run typecheck` and `npm run build`. | Both succeed. | AC11 |

Record each result (pass/fail, notes) in the completion file. Do not mark a checklist item done without observing its expected result.
