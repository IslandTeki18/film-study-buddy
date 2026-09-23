# Workspace-Shared Play Diagrams — completion report

Implemented on `main` in five implementation commits plus this documentation commit. The supplied
untracked plan remains unchanged and excluded from commits. No dependencies or new tests were added.

## What changed

- Play Diagrams now have a required `workspaceId` and are listed, validated, attached, restored,
  and cascaded at Workspace scope. `sourceGameId` remains the origin game.
- Galleries and the Play Designer resolve live attachments across Source Games and link to the
  correct game route. Tendency, Report, and AI Report consumers use Workspace scope.
- Source Game deletion keeps diagrams. Workspace deletion includes them.
- Single and bulk Snap deletion ask whether to keep diagrams that would otherwise have no live
  attachments; one Undo restores a deleted Snap and diagram together.

## Migration and findings

- Backfill run 1: `{ "orphaned": 0, "patched": 27 }`.
- Backfill run 2: `{ "orphaned": 0, "patched": 0 }`.
- The required schema then synced successfully to the development deployment.
- `backfillWorkspaceId` remains available because no confirmation was given that every other
  deployment has reported `patched: 0`.
- Purge already deletes diagrams by their own `deleteBatchId`; it did not walk from Source Games,
  so no purge change was needed.
- The Play Designer displayed attachment labels, so it now reuses `diagrams.listByWorkspace` to
  show and link live attachments from every Source Game. Canvas and drawing behavior are unchanged.
- R3 audit: gallery chips, Unattached state, and designer labels use live `attachedSnaps`;
  uniqueness and picker occupancy start from live Snaps; Undo occupancy intentionally reads raw
  attachment IDs to prevent conflicting restoration. Re-audit these readers if another raw
  `attachedSnapIds` display or count is introduced.

## Verification

- `npm run typecheck`: passed after every implementation task.
- `npx electron-vite build`: passed.
- `npm run build`: passed, including 25/25 existing tests and the production build.
- Convex accepted the optional schema, required schema, and final function set.

| Check | Result | Notes |
| --- | --- | --- |
| V1–V10 | Not run | Require the plan's two-Workspace interactive fixtures and manual UI actions. |
| V11 | Pass | Typecheck, existing tests, and production build succeeded. |

## Commits

- `b039285` — add `workspaceId` and backfill.
- `2e519c0` — scope backend and consumers to the Workspace.
- `5b5510d` — require `workspaceId`.
- `2aa15aa` — keep diagrams through Source Game deletion.
- `db1620f` — ask before deleting a Snap's only diagram.

## What to test manually

Run V1–V10 from the approved plan before release, especially cross-game gallery attachment,
cross-Workspace rejection, Source Game/Workspace Undo, and all single/bulk Snap deletion choices.
