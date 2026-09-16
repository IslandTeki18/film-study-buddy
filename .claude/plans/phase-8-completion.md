# Phase 8 Play Designer and Diagrams — completion report

Implemented and verified on `main`, with one small commit per implementation step and a focused
Undo follow-up. The supplied untracked plan remains unchanged and excluded from commits. No schema
or dependency changes. No Git push, branch switch, merge, or pull request.

## Per-step changes and evidence

| Step | Commits | Changes and verification |
| --- | --- | --- |
| 8.1 | `fdd9649`, `fa36f54`, `0c61c1a` | Added pure document normalization, validated diagram APIs, and the shared SVG renderer. Domain tests proved clamping and atomic malformed-shape rejection; typecheck, 13 tests, Convex sync, live backend checks, and Electron renderer/scaling checks passed. |
| 8.2 | `024fa4c` | Added the Play Designer canvas and offense/defense player editing. Electron verified 22 markers, labels, jerseys, side change, four-edge clamping, reload persistence, arrow/Shift nudge, and Delete. |
| 8.3 | `f02144a` | Added the fixed straight-arrow, curved-arrow, blocking-bar, dashed-line, freehand, and erase tools. Electron verified drawing and persistence, zero-length rejection, selection deletion, Escape cancellation, and curve-control persistence. |
| 8.4 | `846baf5` | Added the single Diagram Note to the existing whole-document autosave flow. Electron verified blur/reload persistence, retained draft and visible error on an oversized save, Retry, and recovery after correction. |
| 8.5 | `082529d`, `36dd67a` | Added the Source Game gallery, Snap create/open flow, attachment, detach, delete/Undo, and the Play Detail thumbnail and note. Electron verified every action, invalid Snap handling, row-link reuse, reactive Delete/Undo state, and identical normalized SVG markup across designer, gallery, and Play Detail. |
| Undo follow-up | `58b2cee` | Restoring an older conflicting diagram now leaves it unattached while preserving both diagrams' contents and the replacement attachment. The focused live regression and original conflict reproduction passed. |

The shared `isLiveSourceGame` helper extraction remains the single Source Game liveness path for
notes and diagrams. The renderer remains in the shared component tier, so gallery, Play Detail,
and future reports/PDF use the same SVG markup rather than feature-to-feature imports or copies.

## Verification commands and results

- Final verification at `58b2cee`: `npm run typecheck`, `npx convex dev --once`, and
  `npm run build` passed. The build ran all 13 tests and retained the existing missing-preload
  warning.
- `node --experimental-strip-types --test src/features/designer/geometry.test.ts` passed when run
  separately. It is a focused geometry check kept out of the package test script, avoiding package
  changes for one small TypeScript test.
- `node src/features/designer/diagrams.check.mjs <Source Game ID>` passed against the live backend.
  The broader live roundtrip also passed create uniqueness, clamping, atomic invalid-save rejection,
  note limits, cross-game attachment rejection, and diagram/Snap/Game delete and Undo behavior.
- Electron checks used `/tmp/p8-ui.mjs`; `players`, `shapes`, `curve`, `note`, `gallery`, `row-link`,
  `detail`, and `keys` modes all passed. Normalized SVG object markup was identical on all three
  implemented surfaces.
- `git diff --check` passed. No linter script is configured.
- Final review of `8140c6e..58b2cee` was approved with no blocking or actionable correctness
  findings. It made no source, index, or branch changes and relied on the recorded verification.

## Decisions and assumptions

| Decision | Final behavior and tradeoff |
| --- | --- |
| A1 — one diagram per Snap | Create and attach enforce one live attached diagram. Undo preserves that invariant by restoring a conflicting older diagram unattached. |
| A2 — unattached diagrams | A diagram can be created without a Snap and attached later from the gallery. |
| A3 — name | V1 does not edit the stored name; cards identify diagrams by Snap or as Unattached. |
| A4 — canvas | The fixed 5:3, `1000 × 600` viewBox maps normalized coordinates consistently at every rendered size. |
| A5 — curves | Curves use six normalized values for a quadratic Bézier; new control points use the perpendicular-offset default and remain draggable. |
| A6 — freehand | Samples closer than `0.005` are dropped and strokes are capped at 400 points to bound document size. |
| A7 — PDF | Renderer identity passed for designer, gallery, and Play Detail. The PDF surface does not exist yet, so its identity check is explicitly deferred to Task 10.7. |
| A8 — player markers | Offense uses circles and defense uses triangles, with the label inside and jersey below. |
| Save boundary | The client commits pointer geometry at pointer-up; the server normalizes every save and atomically rejects malformed documents. |
| Local controls | Designer tool keys stay local to the focused canvas, ignore text inputs/dialogs, and do not change the global shortcut map. |
| Tests | Domain tests, one focused geometry test, and one live regression check cover the non-trivial logic without a new test dependency. |

Procedural rulings were followed: work stayed on `main`; brief files were generated directly when
the installed helper was not executable; malformed shapes reject the whole save; IDs are unique
across players and shapes because selection uses one ID namespace; the shared renderer path overrides
the early feature-path shorthand; and the reproduced Undo conflict was fixed narrowly in the existing
restore path without changing cascade collection or other tables.

## Fixtures and cleanup

Fixture identifiers are stored in `/tmp/p8-ids.json` and contain IDs only. The isolated hierarchy is:

- Season: `k171c30f4jnzp2c88z11tv1gkx8ee2qv`.
- Template: `m979f2k0dn5e102m9yryrehexd8eemq6`.
- Workspace: `kx71sz4dgnftwavkr15fah6tg18ef5m5`.
- Source Game: `k9723m6m30r846x1f0e1pew6t98efb01`.
- Cross-game Source Game: `k9785h3x8j19m0a2xvq8vxrqth8efm3c`.

The fixture Season and Template were soft-deleted through existing APIs with
`node /tmp/p8-backend.mjs cleanup`; follow-up queries returned `null` for the Source Game and
Template. Descendants and verification deletion receipts follow the normal purge lifecycle. No
hard-delete utility was added, and existing coaching content was not modified.

## Follow-up

Task 10.7 must render a saved diagram in the PDF through the shared renderer path and compare its
normalized SVG object markup with the designer/gallery/detail output. Re-run the Undo conflict check
when changing deletion restoration or Snap attachment rules.
