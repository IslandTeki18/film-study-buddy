# Phase 6 Hudl CSV Import — completion report

Implemented on `main`, with a commit per numbered step and three small review fixes.
The supplied untracked plan remains unchanged and excluded from commits. No schema,
dependencies, package scripts, persistent tests, or shared UI primitives changed.
No Git push, merge, or pull request was performed.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 0 | `8926e25` | Added `fixtures/` to `.gitignore`. The named real CSV was absent, so no file was moved or committed. |
| 6.1 | `14102d4` | Pure header signatures, aliases, required mappings, coercion, canonical originals, row flags, and duplicate precedence. Scratch assertions covered the supplied headers, renamed headers, numeric bounds, dirty cells, signed Yard Line, zero values, blanks, and flags. |
| 6.2 | `80ef6d2` | Papa Parse upload with named errors and game-scoped wizard state; replaced placeholder routes. Electron rejected PNG, empty, one-column, and malformed files without creating Snaps; the synthetic CSV advanced with 135 rows and 19 columns. |
| 6.3 | `610d590` | Native column selects with samples and unique targets. Electron verified 11 auto-mapped / 8 ignored columns, Play # removal disabling Continue, and restoration enabling it. |
| 6.4 | `e516a2a` | Mapping lookup/upsert by normalized signature and safe reuse. Backend rejected invalid targets. Electron verified mapping skip, Change mapping, renamed-header fallback, case/spacing reconciliation, and re-pick messaging after reload. |
| 6.5 | `c6a09c0`, `c33f034` | Full preview, row flags, rejected values, individual inclusion, Include all, and Exclude flagged. All 135 synthetic rows remained visible; 115 were included by default. Visual review prompted bounded two-axis scrolling and sticky headers, verified in production Electron. |
| 6.6 | `e0e9090` | Duplicate chips, summary, exclusion action, query loading state, and import link for populated games. Re-import marked all 115 matching Snaps while retaining their inclusion until Exclude duplicates was clicked. |
| 6.7 | `1deacb4`, `665029d` | Atomic validated import, contiguous order, reusable terminology, remembered mapping, pending guard, toast/navigation, and retained preview on failure. Backend checked invalid-batch rollback, append starting at 3, blank rows, long text, and canonical provenance. Electron imported 115 Snaps, then verified duplicates and failure retention. A live check caught and fixed the zero-selected Import button state. |
| Final review | `850e1c4` | Added the planned configuration guard to the import route, matching Play Log. Scoped re-review passed. |

Each implementation step passed strict type checking and a Convex development push.
The final route-only fix initially encountered lost CLI project access; after the user
restored login, the final push succeeded. Temporary agent reports were removed from the
tracked tree in the documentation close-out; this report is the lasting verification record.

## Verification commands and results

- `npm run build` passed on the final application code: TypeScript, all seven existing tests,
  and Electron/Vite production compilation. The existing missing-preload warning remains.
- `npx convex dev --once` passed after login was restored, including the final route guard.
- Domain and parser checks used runnable scratch scripts with Node's
  `--experimental-strip-types`; no test suite or dependency was added.
- `npm run dev -- --remoteDebuggingPort 9222` launched the development Electron app.
- `npm run preview -- --skipBuild -- --remote-debugging-port=9223` launched production
  Electron from `file://`. It passed mapping reuse, full preview, duplicate flags,
  bounded scrolling/sticky headers, Imported markers, original-value display after an edit,
  and the Play Detail Restore original action.
- Backend checks used `ConvexHttpClient` against the deployed handlers: invalid rows and
  mismatched originals rejected atomically, orders continued after two existing Snaps,
  all three terminology lists gained eligible imported values, and blank/long-text rows
  survived import. Down changed Imported → Coach Edited → Imported after restore.
- A synthetic 135-row file produced 13 special-teams flags, seven no-play flags, and one
  included row containing three rejected cells. The 115 imported rows had contiguous
  orders `1..115`, increasing source Play # values, and canonical originals. Rejected
  Down/Yard Line/Yards values were absent from both `core` and `imported`.
- An import attempted while the dedicated verification template was deleted displayed
  the backend error, retained all rows and inclusion choices, and created no Snaps.
  The template was restored afterward.

Scripts and screenshots are under `/tmp/p6-*`; per-step domain/parser assertions also used
`/tmp/task-6.*`. File inputs were supplied through Electron's debugging protocol; native
select changes used DOM change events, and buttons/checkboxes used pointer events.
This does not claim manual native file-dialog or Windows/Linux verification.

## Decisions and assumptions

| Decision | Implemented behavior |
| --- | --- |
| D1 | `convex/hudlImport.ts` owns mapping memory and commit. |
| D2 | Originals are canonical display strings; rejected values appear only in Preview. The backend also validates original/current equality. |
| D3 | Signature is sorted, normalized headers joined with `\u0001`, without hashing. |
| D4 | Targets are the 14 Core fields plus Play #; ODK only supplies flags. |
| D5 / A1 | Map at least Play # or Clip #; other mappings are optional. `REQUIRED_TARGET_GROUPS` owns this rule. |
| D6 / A2 | Explicit coercion only. Signed Yard Line assumes negative means own and positive means opponent; no real Yard Line fixture was available. |
| D7 | Duplicate detection is client-side against the existing Snap query. |
| D8 / A4 | File and wizard state are in memory. Reloading Preview asks for the file again. |
| D9 | Special-teams/no-play flags start excluded; duplicates do not cause exclusion. Rejected cells alone do not exclude an otherwise playable row. |
| D10 | Formation, Motion, and Play Concept become reusable using existing terminology naming and membership rules. |
| D11 | Even an empty coerced row remains previewable and can be explicitly imported. |
| A3 | Unknown ODK values such as S are flagged using the actual value; the coach decides whether to include them. |
| A5 | One transaction per file; chunk only if Convex write limits become relevant. |
| A6 | The approved plan excluded persistent tests, so assertions remain scratch checks; persistent domain/parser coverage is follow-up work. |
| A7 | Remembered mappings skip mapping, with Change mapping available in Preview. |

Additional rulings and their limits:

1. Follow the explicit no-play rule: Down, Distance, and Play Type must all be absent.
   The plan's row-20 example contradicts that rule; rows with Down/Distance and no Play Type
   remain included. If the intended heuristic differs, these defaults need adjustment.
2. Use synthetic verification because `PlaylistData_2026-09-14.csv` was absent. The real
   sample's exact row counts and anomalies remain unverified.
3. Preserve the existing charted list's reverse display order and read-only field values
   in Play Detail. Stored import order follows the file; this phase does not restore the
   previously removed spreadsheet editor. Routine editing limitations remain unchanged.
4. Reconcile remembered headers using the same normalization as the signature and reject
   ambiguous duplicate normalized headers. Ambiguous files require corrected headers.
5. Preserve text longer than the existing 80-character terminology limit in Snap data,
   but skip its picker entry. Such values remain readable without becoming reusable options.

## Fixtures and cleanup

Dedicated verification ids:

- Season: `k17a0f4wpwq51vrjnjmzvvpt598ec3p4`
- Workspace: `kx7fg5mb9a1a7wgyczycnpqekd8edjt6`
- Template: `m972nnbttr9fztzswxvghfzqzs8ed15k`
- Import game: `k976b8r52rc33k85r6phxg72v58ecrvx`
- Append game: `k979nkyyxdjpaezp4a2j0a03n98edsx8`

The fixture Season, Workspace, both games, all 120 fixture Snaps, the template and its
children, and the three fixture deletion receipts were removed. Only newly added
verification terminology was deleted (P6 Unique Formation/Motion/Concept and DEUCES);
pre-existing terminology was retained. Both mapping signatures were absent before the
checks and were restored to that absent state. Queries confirmed fixture content and new
terminology were gone, remembered mappings matched their original state, and settings
matched the pre-verification snapshot.

A temporary internal `p6Verification:cleanup` mutation performed the narrowly scoped hard
cleanup after the public soft-delete checks. The temporary module was never committed and
was removed from both disk and the deployment. The final Convex push, cleanup assertions,
and typecheck all passed after removal.

## Follow-up

Run the actual Hudl export through the wizard when available, particularly the no-play
heuristic and signed Yard Line assumption. Add persistent CSV/domain/parser regression
coverage when lifting the approved plan's test exclusion. Before cross-platform release,
smoke-test native file selection and keyboard navigation on each supported OS.
