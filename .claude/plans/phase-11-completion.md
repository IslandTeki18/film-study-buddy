# Phase 11 — Hardening and Acceptance — completion report

Work is proceeding in plan order on `main`; nothing has been pushed by git. The owner-supplied plan remains untracked and outside the commits.

## Per-step commits

| Step | Commit | Result |
| --- | --- | --- |
| 11.1 | `2f52b1f` | Shortcut map, help dialog, Play Log save/open keys, toast Undo, field Esc cancellation, Blueprint wording. Typecheck and 15 existing tests passed; Electron acceptance checks pending. |
| 11.2 | `8834ece` | Route error recovery, delayed connection banner, missing Convex guards, loading/empty/not-found states. Typecheck and 15 tests passed; offline and route recovery walk pending. |
| 11.3 | `4352134` | Designer keyboard paths, drag handle focus, named menus, roving segmented control and native Snap tables. Typecheck and 15 tests passed; focus, accessibility tree and persistence walk pending. |
| 11.4 | This documentation commit | Eight delete/Undo UI round trips and live Convex checks passed. |

## 11.4 Soft-delete audit

Dedicated fixture: Season `P11 Deletion Audit` (`k175w7abrr0ft7t5wnvay0vkgh8em4c8`), Workspace `kx76cz8p0tdef8s3w1g7zygwas8en667`, and Template `m97bvcqeh6bas14qrtdp8maq898em75j`. It contained two Source Games, one Snap with Must Review and a Cell Note, a Snap-bound Quick Note, a Play Diagram, a Tendency, a Report, one Template Section and one Field. The fixture did not include an Opponent Player or Player Note, and no analysis value was set, so those child types were checked by cascade code inspection only.

| Kind | Children checked | Live count before → deleted → Undo | Undo path | Result |
| --- | --- | --- | --- | --- |
| Workspace | 2 Source Games, 1 Snap, Cell Note, Quick Note, Play Diagram, Tendency, Report | 1 → 0 → 1 | Cmd+Z | Pass |
| Source Game | Snap, Cell Note, Quick Note, Play Diagram | 1 → 0 → 1 | Toast button | Pass |
| Snap | Cell Note, Quick Note, Play Diagram | 1 → 0 → 1 | Toast button | Pass |
| Coaching Template | Section, Field | 1 → 0 → 1 | Toast button | Pass |
| Template Field | No stored value in fixture | 1 → 0 → 1 | Toast button | Pass |
| Tendency / Alert | No children | 1 → 0 → 1 | Toast button | Pass |
| Play Diagram | Snap attachment | 1 → 0 → 1 | Toast button | Pass |
| Report | No children | 1 → 0 → 1 | Toast button and Cmd+Z | Pass |

The Workspace cascade had 2 Source Games, 1 Snap, 1 Cell Note, 1 Quick Note, 1 Play Diagram, 1 Tendency and 1 Report before deletion and after Undo. Queries returned no live descendants while deleted. Real Snap and Report counts were **18 and 2** before and after the audit. The fixture Season and Template were soft-deleted after verification and will be purged by the retention job. No temporary module was deployed.

Known gaps from the approved plan: R6 shared Play Diagram attachment is not restored after one Snap is deleted and undone; R7 undoing a child independently under a deleted parent can leave it orphaned after parent purge; R8 bulk-edit Undo has a backend but no UI since grid removal. Dead `charting-preview.tsx` and `route-placeholder.tsx` and sample-data aside content remain by plan. Cell Note Esc still flushes its draft to avoid silent data loss. Designer route points use the existing Stamp, undo-last-point and clear-route controls.
