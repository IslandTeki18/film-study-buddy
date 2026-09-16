# Phase 10 Reports and PDF — completion report

Implemented on `main`, with one commit per planned step and one small follow-up fix. The supplied
untracked plan remains unchanged and excluded from commits. No dependencies, package scripts,
or persistent tests were added.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 10.1 | `a3fb65e` | Report queries/CRUD, intent defaults, list, create/rename dialogs, optimistic delete/Undo, real route, removed obsolete preview. Live checks verified defaults, name validation, exact Undo restoration, Overview counts and invalid IDs. Electron keyboard creation/rename/delete/Undo passed; empty state and empty-name controls were checked in the final sweep. |
| 10.2 | `84a704e` | Additive snapshot schema, report constants/helpers, shared seven-type renderer and initial Builder. Typecheck/schema sync passed; all seven types were rendered and reloaded through 10.3, including hidden diagram sides. |
| 10.3 | `93c015f` | Server-built insertion, source validation and size guard, five pickers, Add block and focus, shared Play Log value formatting. Electron inserted all types; live snapshots stayed identical across every source edit, scope change and Source Game deletion/Undo. Invalid workspace/source/column/count/empty-scope requests left blocks unchanged. |
| 10.4 | `e6104a9` | ID-based text saves, exact-permutation reorder, block removal/restoration, inline autosave, native drag and keyboard controls. Verified all four editable fields, trailing spaces, draft retention/Retry/recovery, text limits, snapshot edit rejection, stale reorder rejection, exact Undo and concurrent text/reorder. Both mouse and keyboard order survived reload. |
| 10.5 | `8a06de7` | Independent Player duplication from list/Builder and clip toggle. Verified copied blocks, Player defaults, edits/removal/reordering without Coach changes, column hiding/showing and absence/rejection of duplication on Player Reports. |
| 10.6 | `b9a3287` | Light Letter-width Preview, header, empty report behavior, print CSS and chrome hiding. Screen light/dark tokens matched; final PDF checks completed in 10.7. |
| 10.7 | `a7d107c` | CommonJS sandboxed preload, narrow IPC, native Save, filename handling and surfaced errors. Dev and built exports passed. Inspected every page of a nine-page Letter PDF; headers repeated, rows/diagrams stayed intact, margins were white and chrome absent. Light/dark PNGs were byte-identical. Player and empty exports, Cancel, saved-path toast, missing bridge, malformed payload/route rejection and OS write failure passed. |
| Follow-up | `f0d205f` | Reserved the exact Core clip label before suffixing Template Field labels. A live regression first reproduced the collision, then passed with template-before-Core and template-only selections. |

## Verification commands and results

- `npm run typecheck`: passed for every implementation step and after the follow-up fix.
- `npx convex dev --once`: passed before each backend commit, including the final filename helper
  and clip-label fix. Generated API includes `reports`.
- `npx convex data reports --limit 20`: no existing documents before schema changes; the required
  tendency `groupBy` field was therefore safe (R1).
- `npm run build`: final pass includes strict TypeScript, all 15 existing tests and Electron/Vite
  production compilation. `out/preload/preload.cjs` exists; the missing-preload warning is gone.
  Final log: `/tmp/p10-final-build.log`.
- `git diff --check`: passed. Searches for `reports-preview` and the specified interpretive words
  in report UI returned no matches.
- `npx convex run reports:listByWorkspace`: final fixture capture saved to
  `/tmp/p10-final-reports.json`. Other live query/mutation checks used `ConvexHttpClient` against
  the same configured development deployment, rather than spawning a CLI for each call.
- `node /tmp/p10-backend.mjs seed`, `crud`, `freeze`, `editing`, `pdf-fixture`, `clip-collision`,
  `size`, `cleanup`: passed. `clip-collision` deliberately failed before its fix, then passed.
  `size` verified that 270,000 non-ASCII characters exceed the byte limit and are rejected without
  changing blocks. Snapshot capture: `/tmp/p10-before.json`.
- `node --experimental-strip-types /tmp/p10-helpers.mts`: passed filename sanitization/length,
  Player-name limit, duplicate labels, clip visibility and shared value formatting checks.
- Electron was driven through temporary CDP scripts under `/tmp/p10-*.mjs`, initially launched
  with `npm run dev -- --remote-debugging-port=9338`. CRUD, insertion, editing, mouse drag,
  duplication, preview and final empty-state scripts passed.
- Failed autosave was exercised with a programmatically oversized draft: the server rejected it,
  the editor kept it, Retry remained available, and correcting the value saved successfully.
- Native Save/Cancel used macOS Accessibility via `osascript`. No manual user dialog click was
  required. Saving worked reliably by clicking the accessible Save button after choosing the path.
- `pdfinfo` and `pdftoppm -r 70 -png` verified/rendered native exports. Every page of the final
  nine-page Coach PDF was visually inspected. `pdftotext -layout` also confirmed the Player PDF
  omits `Source / Clip #`; the empty report is a one-page header-only PDF.
- All nine rendered dark/light page PNGs compared byte-identically. Gallery and Report Preview
  SVG content matched after removing only accessibility titles and generated marker IDs; the
  exported diagrams were visually inspected. This closes the deferred 8.1/8.5 PDF checks.
- `npm run preview -- -- --remote-debugging-port=9338 --inspect=9231`: built renderer preload,
  sandbox/context isolation and one native export passed. The extra `--` is required for
  electron-vite preview argument passthrough.
- A temporary main-process debugger hook supplied `/System/p10-export.pdf` as the dialog result.
  The real `printToPDF`/`writeFile` path returned an OS write error, the renderer showed its error
  toast, and the complete report query was unchanged. The hook was restored immediately; no
  production test hook was added. A separate hidden renderer without preload verified the
  visible disabled-export message and was destroyed afterward.
- Bridge inspection found exactly `exportReportPdf`; renderer `require` and `ipcRenderer` were
  undefined. Native dialog cancellation left no notification and re-enabled Export.

The first export exposed dark page margins and a missing header on a later table continuation.
The final print rules explicitly set a white `@page` background, avoid breaking the header group,
force light print color scheme and use block layout for the print container. The corrected native
exports passed. Test harness corrections included foregrounding Electron for drag, scoping the
preview toolbar selector, normalizing SVG titles/marker IDs, and matching filename sanitization's
specified control-character removal. These were not suppressed application failures.

Convex access was interrupted twice during execution after its shared CLI login changed. Work
resumed after the owner restored access; no failed sync was treated as a successful verification
or used to justify a commit.

## Decisions and assumptions

| ID | Final choice and tradeoff |
| --- | --- |
| A1 | Used `update` and ID-based block mutations instead of whole-array `setBlocks`, preventing text saves from replacing structural changes. |
| A2 | Sources are copied on the server. Restore accepts the removed block under the existing single-coach deployment boundary, with schema/text/size validation. |
| A3 | Continuous 8.5-inch Preview; real Letter pagination happens in print. No simulated screen page frames. |
| A4 | Printed the requesting window's Preview; no second production window was needed. |
| A5 | Light color tokens are scoped to the report sheet. Explicit white page background and light print color scheme were also required by native export. |
| A6 | Coach defaults clips on; Player and duplicates default clips off. All reports can toggle. |
| A7 | Exact Core label identifies clip references. That label is reserved even when a same-named Template Field is selected first or by itself; template labels receive suffixes. |
| A8 | Selected Plays copies chosen Core/template display values, with label suffixes and the specified default columns. Cell Notes are excluded. The existing 14-field Core catalog is reused. |
| A9 | One Source Game per Selected Plays block; 200 Snaps/20 columns maximum. Select all selects up to the limit; additional blocks can cover remaining plays. |
| A10 | Opponent Data recomputes from the included games at insertion; title and formatted cells are copied. Empty scope is rejected. |
| A11 | Tendency picker filters `includeInReport`; no changes to the Tendencies screen. |
| A12 | Added required `groupBy`, optional `groupBy2`, optional diagram `hiddenSide`. R1 found no existing reports. |
| A13 | Tendency copies coaching content and grouping labels/rows; attached diagram is copied only while live. |
| A14 | Diagram snapshots preserve content and hidden side; only the caption is editable. |
| A15 | Quick Notes picker uses one Source Game and copies chronological text/tags, up to 200. |
| A16 | Text limits enforced on client/server without trimming drafts. Empty text/heading blocks print nothing. Empty captions remove the optional property. |
| A17 | New blocks append and receive focus; text inputs receive focus once inline editing is available. |
| A18 | Report Undo uses the ledger; block Undo is single-use and toast/session-only. Pending text saves settle before block deletion. |
| A19 | Coach-only duplicate deep-copies blocks and uses the capped `(Player)` name; editing the copy leaves the source unchanged. |
| A20 | Two create buttons reuse `NameDialog` and open the Builder. |
| A21 | Preview prints report intent/name and workspace details. Reused `workspaces.get.seasonName`, avoiding the redundant planned `seasons.list` query. |
| A22 | Preview-only Export with sanitized capped filename and Documents default. Native handler additionally validates filename, exact application URL/main frame and Preview route, then waits for fonts/readiness. |
| A23 | Without the bridge, Export is disabled with `PDF export requires the desktop app`. |

Additional deviations: the 800 KB guard counts actual UTF-8 bytes rather than JavaScript string
length, so non-ASCII text cannot undercount storage. Block-editor keys include report identity to
keep drafts separate when navigating between independent reports whose copied block IDs match.
No persistent tests were added, as the approved plan explicitly excluded them; runnable checks
were retained under `/tmp` for this session. Existing cascade, ledger, purge and source screens
were reused without changes.

## Fixture and cleanup

Fixture identifiers are recorded in `/tmp/p10-ids.json` (including all 70 original Snap IDs):

- Season: `k17487nb7jypkxzc67a0gfwxgh8ehqey`.
- Workspace: `kx73jbdp249xwv1v1jg19hbfjd8egw97`.
- Template: `m97aadfvs6eaasb83rqxfvwe1s8eh0y5`.
- Game A: `k977at6s61qf5ejetn1mve13js8egh01`; Game B: `k979j4a8xqf3j0znn2vbn0b0218eg5vk`.
- Coach Report: `jx772m6m8a4xvwjtxhf5r3mmw98ehm75`.
- Empty Player Report: `jx70c4gsscj9nrqhn92k8z48458ehwk4`.
- Duplicated Player Report: `jx79hrgr83t5aw5ev2j3q9vt5d8egpc1`.

Cleanup uses `workspaces.remove`, `seasons.remove` and `templates.remove` through
`node /tmp/p10-backend.mjs cleanup`. Follow-up queries verify null/empty results for the fixture
Workspace, Template, Games, Reports and Tendencies, and absence from the Season list. Temporary
boundary/empty Workspaces, size/collision Reports and collision Template Fields were separately
soft-deleted by their checks. Descendants and receipts follow the existing purge lifecycle.
No custom categories or live fixture records are intentionally left behind.

Verification PDFs, screenshots, scripts and captures remain only under `/tmp`. Final examples:
`/tmp/p10-white.pdf` (nine-page Coach), `/tmp/p10-dark.pdf` (identical rendering),
`/tmp/p10-player.pdf` (clips hidden), `/tmp/p10-empty.pdf` (one page) and
`/tmp/p10-built.pdf` (built renderer). Earlier `p10-coach*` exports are diagnostic versions,
not the final print output.

## Follow-up

Phase 11 retains the planned shortcut/help and disconnected-banner work. Recheck native export
when upgrading Electron: white page backgrounds and repeated header groups need the explicit
print rules verified here. Larger reports would require moving inline blocks to their own table;
persistent block Undo and simulated screen page frames remain outside V1 scope.
