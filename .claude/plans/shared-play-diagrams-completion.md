# Shared Play Diagrams — completion report

Implemented on `main`, with one commit per plan step. The supplied untracked plan was left
unchanged and excluded from commits. No dependencies, tables, migrations, or new test files.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 1. Schema and helper | `5b6a44f` | Optional `snapIds` and one pure legacy-compatible reader; typecheck and Convex sync passed. |
| 2. Backend reads | `b71e281` | Lookup and uniqueness scan the Source Game through the helper; typecheck and Convex sync passed. |
| 3. Backend writes | `4f329ac` | Create/save use the array, attach deduplicates, detach removes one Snap, legacy field clears; typecheck and Convex sync passed. |
| 4. Deletion and Undo | `882d05d` | Shared diagrams survive individual Snap deletion; sole attachments cascade; Undo drops only occupied attachments; typecheck and Convex sync passed. |
| 5. Gallery | `7494f18` | Pick mode, New/Cancel, multi-Snap chips, per-Snap detach, always-visible attach select; typecheck passed. |
| 6. Designer and detail | `19dd39c` | Linked Snap list in designer; separate Add and Use existing links in Play Detail; typecheck passed. |
| 7. Acceptance script | `4f536fa` | Existing live script covers sharing, conflicts, idempotence, deletion and Undo, with fixture cleanup; typecheck and live run passed. |
| 8. Documentation | This report's commit | SPEC §55, glossary, and this completion report; typecheck and whitespace check passed. |

## Verification commands and results

- `npx tsc --noEmit` passed after every step.
- `npx convex dev --once` passed after each backend step (1–4).
- `npm run build` passed: strict TypeScript, all 15 existing tests, and Electron/Vite compilation.
  The existing missing-preload warning remains.
- `node src/features/designer/diagrams.check.mjs k97b7a9kqaxfs1fhxzdx0tvtcx8ecycv` passed.
  It checks two-Snap attachment, duplicate create/attach rejection, idempotent attach/detach,
  shared and sole-Snap deletion, the documented shared-detach Undo limitation, and partial
  attachment conflicts during diagram Undo.
- Electron launched with `npm run dev -- --remoteDebuggingPort 9222`; checks used hash routes
  and `Page.reload` via CDP, as in Phase 8. `/tmp/shared-diagrams-ui.mjs` and
  `/tmp/shared-diagrams-conflict.mjs` passed:
  - Choose an existing diagram and return to the requested Play Detail.
  - Edit its note once and see it on both attached Snaps; linked designer header and gallery chips.
  - Per-Snap detach, attach select, diagram Delete and toast Undo.
  - Pick-mode Cancel/New, forced New from Play Detail, existing attachment redirect, invalid Snap.
  - Row menu enters pick mode with diagrams, and auto-creates when the game has none.
  - A competing attachment produces the required toast and preserves both the route and data.
  - Shared and sole-Snap deletion through the row menu and Undo controls.
  - Partial-conflict Undo appears correctly in the gallery.
  - Whole Source Game deletion and Undo retain both attachments (on a temporary Source Game).
- Legacy diagram `jh73adkhc1s8dtq69nw53zrbgd8ehga0`, recorded before backend changes, still has
  `snapId: k572ga2vbshse3pps2p3gm0nnn8efgvh` and no `snapIds`. It resolves through `getBySnap`
  and renders in the gallery, designer header, and Play Detail without rewriting it.
- `git diff --check` passed. No linter is configured. No diagram-related direct legacy reads
  remain outside `attachedSnapIds` (the acceptance script explicitly asserts field removal).

Screenshots, captured and visually inspected:

- [Pick mode banner and card action](/tmp/shared-diagrams-pick.png)
- [Gallery card with two Snap chips](/tmp/shared-diagrams-card.png)

## Decisions and deviations

| Decision | Behavior and tradeoff |
| --- | --- |
| Additive compatibility | No migration. `snapIds` wins when present; otherwise the legacy field supplies the attachment. Save also normalizes the legacy field. |
| Source Game scans | Matches the approved small per-game volume assumption; no array index or join table. |
| Shared Snap deletion | Removes only that attachment. Undo restores the Snap but does not reattach it to the surviving diagram, as approved in A3. |
| Whole-game deletion | Added a `deletingSourceGame` argument to the existing cascade helper and changed its whole-game caller to skip per-Snap diagram handling. Without this small departure from the plan's “unchanged” caller, game deletion would silently discard shared attachments before Undo. The existing game-level diagram cascade still collects every diagram. |
| Commit order | Moved the gallery's nullable-attach caller to `detach` in step 3, keeping the API change type-correct before the full gallery update in step 5. |
| Helper typing | Generic string IDs preserve Convex's branded IDs without importing Convex into the domain helper or adding casts at every write. |
| Route resolution | Cache the initial pick decision so reactive attachment updates cannot redirect to the designer before the successful picker action returns to Play Detail. |
| Scope | All repository edits are in §3 plus the completion report explicitly requested by step 8. Temporary CDP scripts and screenshots live in `/tmp`. `row-actions.tsx`, `diagram-svg.tsx`, `playbook.ts`, and `formations.ts` are unchanged. |

## Fixtures and cleanup

UI checks used new Snaps and diagrams in the Timpview Source Game
`k97b7a9kqaxfs1fhxzdx0tvtcx8ecycv`; the empty-gallery and whole-game cascade checks used a new,
temporary Source Game. Both UI scripts and the acceptance script soft-deleted their fixtures
through existing APIs. Existing coaching diagrams were only read. No hard-delete utility was added.

## What to test when changing this area

Re-run the live acceptance script and the Electron picker, detach, conflict-toast, and Undo flows.
Keep a legacy row available when changing attachment reads. Verify whole-game Undo whenever
changing cascade collection. The unchanged Snap deletion dialog still describes the former
single-diagram cascade generally; a copy follow-up can explain the shared-detach Undo exception.
