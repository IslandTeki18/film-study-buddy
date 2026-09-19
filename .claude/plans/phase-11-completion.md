# Phase 11 — Hardening and Acceptance — completion report

Work is proceeding in plan order on `main`; nothing has been pushed by git. The owner-supplied plan remains untracked and outside the commits.

## Per-step commits

| Step | Commit | Result |
| --- | --- | --- |
| 11.1 | `2f52b1f` | Shortcut map, help dialog, Play Log save/open keys, toast Undo, field Esc cancellation, Blueprint wording. Typecheck and 15 existing tests passed; Electron acceptance checks pending. |
| 11.2 | `8834ece` | Route error recovery, delayed connection banner, missing Convex guards, loading/empty/not-found states. Typecheck and 15 tests passed; offline and route recovery walk pending. |
| 11.3 | `4352134` | Designer keyboard paths, drag handle focus, named menus, roving segmented control and native Snap tables. Typecheck and 15 tests passed; focus, accessibility tree and persistence walk pending. |
| 11.4 | This documentation commit | Eight delete/Undo UI round trips and live Convex checks passed. |
| 11.5 | This code commit | Indexed batch lookup and bounded purge. Typecheck and Convex push passed; live purge fixture assertions passed. |
| 11.6 | This build commit | Added only `electron-builder`, unsigned macOS app/DMG packaging, and Blueprint dependency documentation. Build, launch, navigation, shortcut overlay and PDF export passed. |

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

## 11.5 Purge verification

Added `by_deleteBatchId` on all 14 soft-deletable tables and `by_createdAt` on `bulkEdits`. Undo and purge use those indexes. Purge handles one oldest expired ledger row per invocation, deletes at most 500 records, and schedules its next invocation until expired ledgers and bulk edits are cleared. The daily cron entry was unchanged. `npx convex dev --once` completed after index backfill and after removal of the temporary verification module.

The temporary module seeded one expired, active Source Game batch with **520 Snaps, one Quick Note, and the Source Game** (522 records over three tables); one expired, undone Source Game batch; one fresh, active Source Game batch; and one expired bulk edit. After purge, every active expired fixture record and ledger row was gone, the undone Snap and Source Game were live with the same values and their old ledger was gone, the fresh batch and its ledger remained soft-deleted, and the bulk edit was gone. Undo on the fresh batch restored its Snap and Source Game. The timed fresh Undo round trip was **320 ms**. Convex logs recorded **140 purge invocations** in the verification chain, including work on preexisting expired ledgers; the 522-record batch required more than one invocation. All temporary fixture records and the temporary module were removed, then Convex was repushed.

Real **live** Snap and Report counts stayed 18 and 2 before and after. The purge also processed preexisting expired deletion ledgers, so this count does not establish whether older already-deleted records outside the P11 fixture were present.

## 11.6 Build and packaged app

Installed `electron-builder` 26.15.3 as the only new dependency. `npm run build` passed TypeScript, all **15 existing tests**, and the Electron/Vite production build in about 6.4 seconds. The packaging script repeats that build, then created the unsigned arm64 artifacts:

- `dist/mac-arm64/Film Study Buddy.app`: about 392 MB.
- `dist/Film Study Buddy-0.1.0-arm64.dmg`: 154,848,666 bytes (about 148 MB), plus its block map.

The packaged app launched from inside the `.app` with its `file://…/app.asar/out/renderer/index.html` URL, loaded the real Orem 2026 deployment data baked in from `.env.local`, opened the keyboard shortcut dialog, and navigated from Home to the Timpview Reports and AI Overview Report Preview. Export through the packaged IPC bridge produced a valid PDF 1.4 file with five pages and 56,296 bytes, confirming the `app.asar` sender URL check. The temporary PDF was deleted. Theme controls were already present in the packaged bundle but were not toggled in this check. Network-off disconnected-banner behavior remains pending with step 11.2 acceptance.

Packaging used the default Electron icon and emitted informational warnings that package description and author are absent. Those fields and a custom icon were outside the approved configuration. Build output is unsigned, without notarization or auto-update. `VITE_CONVEX_URL` was inlined from the current local environment as expected.
