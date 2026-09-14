# Phase 4 Source Games and Play Log — completion report

Implemented on `main` in small, numbered commits. The supplied untracked plan was
left unchanged and excluded from commits. Implementation did not change dependencies, repository test files,
package scripts, credentials, login settings, or environment files. No Git
push, merge, or pull request was performed.

## Per-step verification

| Step | Commit | Changes and evidence |
| --- | --- | --- |
| 4.1 | `244bb0f` | Source Game CRUD, required live Coaching Template, normalized labels, joined live Snap counts, cascading deletion/Undo. Typecheck and development push passed. Live checks rejected missing/deleted templates and blank labels, verified trimmed rename, malformed IDs, empty count, Delete/Undo. Ancestor liveness guards were reviewed. |
| 4.2 | `1dc06f9` | Source Games list, empty actions, Add dialog, Rename and Delete/Undo. Electron checks passed disabled invalid submissions, both creation destinations, exact opener focus after Escape, Rename, Delete Cancel focus, Delete/Undo and reactive Overview counts. |
| 4.3 | `ed62f6b` | Live Snap read model and ordered column descriptors. One-shot assertion verified 14 core keys followed by ten ordered Template Field keys. Live empty query passed; the ten-field fixture was built through Electron's Template Builder. |
| 4.4 | `32cd2fb` | Compact table, fixed column widths, sticky header/first column, temporary fixture mutations. Electron displayed 200 Snaps and 24 columns; geometry checks confirmed inner scrolling, stable sticky coordinates and document width equal to viewport width. Screenshot inspected for layout. No frame-time benchmark or by-eye animation-performance claim. |
| 4.5 | `dbe6646` | Pure normalization, guarded mutations, native typed editors and optimistic updates. Live checks covered all 14 core fields and eight analysis types, clearing, false/zero retention, enum/bound/key rejection. Electron checked all 24 columns, commit/Escape, checkbox/multi-select, invalid Down/Quarter toasts and persistence after reload. |
| 4.6 | `375d746` | Roving cursor, arrow/Home/End navigation, Tab wrapping/exits and printable entry. Electron full 24-column keyboard charting passed; Enter did not create a Snap. First Shift+Tab and last multi-select Tab exited the Play Log. One-shot assertions checked cursor boundaries, wrapping and clamping. |
| 4.7 | `be8188d` | Structured Yard Line and derived Field Zone. OWN 35, 50 and OPP 22 displayed Own Territory, Midfield and Plus Territory. OPP 0/OWN 60 stayed invalid without writing; server rejected invalid structured values. The native side popup was not reliably driven through CDP: verification used native change events for side selection, then verified custom ArrowRight control focus. The full keyboard-only charting check in 4.6 preceded this structured editor. |
| 4.8 | `33e7f3b` | New Snap button/shortcut, optimistic append and exact Carry-Forward values. After deployment access was restored, live creation/carry checks and Electron button/Cmd+N/focus/Enter checks passed. Earlier offline handler checks also covered deleted fields/sections/templates, false values, order and reset provenance/review state. |
| 4.9 | `4796d3a` | Exact Custom Terminology, datalists, inline single/multi-select options and ordered edit persistence. Live duplicate/built-in/blank/length checks passed. Electron verified reusable terminology, deduplication, options in the template, Escape from add mode and Carry-Forward after pending terminology/multi-option writes. A failed Down edit did not permanently block New Snap. |
| 4.10 | `71fa5c8` | Imported/Coach Edited markers and guarded Restore original with optimistic updates. Feature live checks passed, including invalid original rejection. Electron verified Imported → Coach Edited → restored markers, keyboard and mouse Restore, no Template Field markers, and the O25 error preserving the coach value. Two immediate checkbox toggles produced the expected final false value. Restore shares the edit queue; queued checkbox intent preserves two toggles behind an earlier asynchronous edit. A one-shot execution of the actual toggle helper verified writes `[true, false]` and pending-state cleanup. |

Typecheck and code review were performed throughout. Development deployment
checks resumed successfully after the owner restored Convex CLI access during
4.9; the temporary access failure is resolved. No credential or environment
workaround was used. Public queries continued working during the interruption.

Live calls used a one-shot ConvexHttpClient script (the same deployed argument validators and handlers as `convex run`). Representative CLI equivalents and local checks:

- `npm run typecheck`; `npx convex dev --once`; `npx convex codegen`.
- `npx convex run sourceGames:create '<args>'` with missing, deleted and live
  `templateId`; `sourceGames:listByWorkspace`, `sourceGames:rename`,
  `sourceGames:remove`, `deletions:undo`.
- `npx convex run snaps:updateCore '<args>'`: Down `"1st"` and invalid Yard Line
  rejected; `snaps:updateAnalysis`, `snaps:create`, `snaps:restoreImportedValue`.
- `npx convex run terminology:list '{}'` and `terminology:add` for exact-string
  duplicate and built-in behavior.
- One-shot Node assertions for column ordering, normalization, cursor navigation
  and queued checkbox toggles; Electron CDP walkthroughs and DOM geometry checks.

Scripts and screenshots were temporary `/tmp/p4-*` files. Offline handler checks
used a small database double and did not substitute for live Convex transaction
or Electron verification after access returned.

## Assumptions and tradeoffs

- Field Zone renders inside Yard Line, retaining exactly 14 core columns. Down
  and Distance Situation remains Phase 9 work.
- The approved `max-h-[calc(100dvh-9rem)]` scroller offset assumes current chrome
  height. Shared tabs/layout were preserved; chrome changes may warrant a flex
  layout. No virtualization was added; windowing remains deferred beyond roughly
  1,000 Snaps. The verified fixture contained 200 Snaps.
- Tags are comma-separated, trimmed and deduplicated. A tag containing a comma
  would require a different editor.
- Whole-number bounds are Quarter 1–9, Down 1–4, Distance 0–99 and Yards −99–99.
  Quarter allows overtime; template Number accepts fractions and Rating remains
  1–5.
- Core Carry-Forward is limited to Personnel, Formation and Motion. Other copied
  values must belong to live Template Fields explicitly marked Carry-Forward.
  Imported originals and Must Review never carry.
- Custom Terminology is notebook-wide and uses exact strings after surrounding
  whitespace is trimmed. No case folding, aliases or guessed normalization.
- A Source Game remains listed when its referenced Coaching Template was
  deleted; its template label becomes “Coaching Template not found.”

## Plan adaptations

- Generated `convex/_generated/api.d.ts` updates accompany new modules; these
  are necessary API typing changes omitted from the plan's file list.
- Installed TanStack Table is v9.2.4. Its included `/legacy` compatibility hook
  supplies the planned table API without changing dependencies.
- Fixture Week 52 and a dedicated fixture Season replace the plan's Week 99,
  which existing 0–52 validation rejects. Real active-Season settings stayed
  unchanged.
- Snap queries return `[]` for missing/deleted Source Game, Workspace or Season
  so reactive subscriptions reach not-found UI without throwing. Mutations still
  enforce throwing liveness guards.
- Disabled submit buttons cannot receive native autofocus with blank required
  data. Intent chooses the autofocus button; native dialog behavior initially
  focuses Label.
- Step 4.6 also changed the editor interface for printable drafts and safe
  boundary/blur focus. Grid/gridcell roles make selected-cell semantics valid.
- ArrowRight/ArrowLeft move between Yard Line side and yard; Tab retains
  commit-and-move behavior. Alt+ArrowDown focuses Restore; ArrowUp returns from
  Restore to the input. Enter/Space on Restore activate the button normally.
- Cmd/Ctrl+N is captured on the Play Log parent, covering empty logs and active
  editors. It waits for captured pending edit promises before creating the Snap.
- Steps 4.9 and 4.10 also change the table integration: complete add-option/edit
  and Restore operations share one submission-order queue. Per-cell tracking
  avoids stale unchanged-value checks; queued checkbox intent preserves rapid
  toggles. Settled failures clear without poisoning later New Snap attempts.
- Add-option sentinel strings are chosen to avoid collisions with real options,
  preserving literal `__add__` values.
- The plan gives conflicting TASKS timing instructions. Verified steps were
  marked in their numbered commits; no unverified checkbox was checked.

## Deliberate ceilings (`ponytail:` comments added)

- `convex/sourceGames.ts`: per-game Snap scans fit V1; use aggregate counters if
  query latency grows.
- `src/features/play-log/play-log-table.tsx`: fixed viewport offset; switch tabs
  to a flex column if chrome changes. No virtualization; add windowing if a
  Source Game exceeds approximately 1,000 Snaps.
- `src/features/play-log/cell-editors.tsx`: comma-separated tags; add a chip input
  if coaches need commas inside a tag.

## Deferred scope

`sourceGames.changeTemplate` remains unimplemented: the blueprint specifies it,
but TASKS schedules no phase for it. `src/lib/shortcuts.ts` remains Phase 11 work.
CSV import destinations still lead to the existing Phase 6 placeholder.

## Fixture inventory and teardown

Initial settings already contained completed Defensive Line setup and no active
Season. Verification did not alter them. Exact fixture IDs are recorded in
`/tmp/p4-ids.json`; teardown must target these IDs only.

- Dedicated `Phase 4 Fixture Season` and `Week 52 — Phase 4 Fixture` Workspace.
- `Phase 4 — Ten Fields`, configured through Template Builder with all eight
  types, ten fields and a Carry-Forward field.
- Source Games `Fixture — 200`, `Fixture — UI Manual`, `Fixture — Renamed` and
  `Fixture — Imported`; additional created Snaps remained inside fixture games.
- `Phase 4 deleted template`, already soft-deleted in 4.1.
- Custom terminology and select options created during checks require explicit
  fixture-scoped cleanup; real notebook vocabulary must remain.

Cleanup completed after the final interaction checks:

- `npx convex run devFixtures:removeFixtures` hard-deleted 206 Snaps from
  `k9764pxd6717cvz2f5ye9f4qg98edw3m`, ten from
  `k977p4yw6qyfxgs4y8ntf7ekws8ede30`, and one from
  `k97fk4scsw1fzc88zxzvmj48458ed24q`: 217 total. The fourth fixture game had no
  Snaps. Successful command results preceded container deletion.
- A temporary `removeTerminologyFixtures` internal mutation removed only the
  three exact test Formations: `Phase 4 Custom Formation`, `Phase 4 UI Formation`,
  and `Phase 4 Carry Formation`. `terminology:list` returned `[]` afterwards.
- All four Source Games and the fixture Workspace were deleted through their
  UI confirmation dialogs. The ten-field template was deleted through the UI,
  cascading to its section, fields and views. Fixture select options disappeared
  with that template. The extra fixture Season was removed by its public mutation.
- `sourceGames:listByWorkspace` returned `[]`; `workspaces:get` returned `null`;
  `templates:list` and `seasons:list` excluded the fixture IDs. Each fixture
  `snaps:listBySourceGame` returned `[]`. The original settings document matched
  the before-verification snapshot exactly.
- Parent records and deletion ledgers retain the normal 24-hour soft-deletion
  lifetime, as permitted by the plan. The seeded Snaps and test terminology were
  hard-deleted. Original notebook data was preserved.
- Deleted `convex/devFixtures.ts`, regenerated the API declaration and completed
  a development push. `rg -n devFixtures convex src` returned no matches. No
  temporary fixture module remains locally or in the deployment.

## Final checks

- `npm run build` passed, including strict typecheck, all six existing theme
  tests and both Electron/Vite production bundles. The existing `preload config
  is missing` notice remains unchanged.
- `git diff --check` and `git diff --check 244bb0f^` passed.
- Final review approved the phase after resolving edit ordering, Restore queue
  integration and pending checkbox intent. Electron keyboard Restore and rapid
  double-toggle checks passed on the final implementation.
- Empty-log Cmd/Ctrl+N created and focused its first Snap. Literal `__add__`
  remained a usable select option. The native OS side-select popup itself remains
  a recommended manual keyboard check; CDP verified the surrounding custom
  focus/commit behavior as described above.
- All 4.1–4.10 TASKS items are checked and linked to this report. The closeout
  commit records this report and fixture-module removal. The supplied plan remains
  the sole untracked file; no Git push was performed.
