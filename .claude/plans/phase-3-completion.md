# Phase 3 Seasons, Workspaces, Home — completion report

Implemented steps 3.1–3.8 in separate commits on `main`. All eight checklist items
are marked `[x]`; no live verification blockers remain. Development pushes succeeded
using the existing deployment, without changing login, credentials, or environment files.

## Changes and verification

| Step | Implemented | Verification performed |
| --- | --- | --- |
| 3.1 | Settings singleton, real theme persistence, active Season validation; shared name normalization and dialog | Initial `get` returned null; three theme writes persisted under one id; administrative cleanup confirmed exactly one settings row; invalid and deleted Season selection rejected; Electron keyboard theme changes, reload, and emulated system appearance passed; old theme function no longer exists |
| 3.2 | Coaching Area picker, first-launch gates, atomic starter installation | Eleven native radios; keyboard-only Linebackers selection; deep-link redirect; matching `getFull` Coaching Area and three sections; one installed template; invalid area and repeated completion rejected; `/welcome` redirects after completion and reload |
| 3.3 | Season list/create/rename and sidebar selection | Created two trimmed Season names by keyboard; blank and overlong names rejected; switched active Season and reloaded; deleted active Season degraded safely to no selection |
| 3.4 | Workspace create/get/list/update/remove and reusable Source Game/Workspace cascade collectors; Season cascade | Missing required arguments and weeks -1, 1.5, 53 rejected; weeks 0 and 52 accepted; omitted fields preserved and empty Notes removed; malformed route ids handled; 20 temporary records covered every cascade table, archived Workspace inclusion, prior-deleted exclusion, repeated Undo, and whole-Season Undo; fixtures and ledgers removed |
| 3.5 | Minimal Home, first-Season creation, recent Workspaces, secondary navigation | Created the first Season from Home by keyboard and observed the reactive empty state; exact secondary links; seven temporary Workspaces rendered only the newest six by week; Archive excluded from Home |
| 3.6 | Season View, URL-scoped Create Opponent dialog, confirmation and deletion Undo | With 2026 active, created Week 3 — Provo under 2025; required controls disabled invalid submission; Escape restored focus to New Opponent; deletion confirmation focused Cancel; Delete/Undo updated the list; malformed Season route showed not found |
| 3.7 | One summary query, compact Overview, newest-game navigation, Notes Autosave | Two Source Games yielded counts 1 and 2, total 3, Must Review 1 after excluding a deleted flagged Snap; zero Tendencies and empty Reports; Continue opened newest Play Log, then Source Games after teardown; Notes survived reload; injected mutation failure retained the draft and Retry persisted it |
| 3.8 | Archive/unarchive, grouped Archived Opponents, shared Archive/Reopen/Delete actions | Keyboard Archive removed a Workspace reactively; duplicate Archive rejected; Archive Undo reopened it; Home exclusion and Season grouping passed; direct archived Overview remained functional; archived Delete/Undo preserved Archive state; Reopen removed `archivedAt` and preserved Overview data |

Strict typecheck and development push passed for every step. Verification scripts and
fixture helpers were temporary; no test files or test-script changes were committed.
The step 3.6 verification script was updated during the final walkthrough to select
Delete by name after step 3.8 added Archive ahead of it in the menu.

## Phase-close checks

- `npm run build` passed: strict TypeScript, all six existing theme tests, and both
  Electron/Vite production bundles. The normal configured build was restored after
  the unconfigured check.
- `VITE_CONVEX_URL='' npm run build` passed. In Electron under `file://`, Home,
  Season View, Create Opponent, Overview, and Archive rendered their configuration
  fallback; `/welcome` returned to Home without a loop; local dark theme survived reload.
- The configured production `file://` Workspace deep link loaded and reloaded.
  Its screenshot was inspected for layout and readable controls.
- Final fresh-launch walkthrough passed: First Launch → Linebackers → first Season
  from Home → two more Seasons → Workspaces in two different Seasons → Overview →
  Archive → Reopen → Delete → Undo. All created data was subsequently removed.
- `git diff --check 69986e1` passed after removing an extra trailing blank line from
  the extracted names module.
- No `verifyPhase3` or `theme_settings` references remain in `convex/` or `src/`.
- The existing build notice `preload config is missing` is unchanged.

## Fixture teardown

Cleanup used fixture ids and their related records, preserving unrelated project data.

- Cascade verification removed its 20 records across all relevant tables and both
  deletion batches, including the deliberately pre-deleted Source Game.
- The separate CRUD Workspace was hard-deleted after validation checks.
- Overview verification removed its two Source Games and four Snaps, including the
  excluded soft-deleted Must Review Snap.
- Before the final walkthrough, cleanup removed three fixture Seasons, eight
  Workspaces (including seven Home-limit fixtures), the installed starter template
  with its fields/sections/views, three ledgers, and verification-created settings.
- After the final walkthrough, cleanup removed its three Seasons, two Workspaces,
  starter tree, two ledgers, and verification-created settings. Both cleanup
  transactions confirmed exactly one settings document before removal.
- The initial settings query returned null. Cleanup restored that original incomplete
  First Launch state; the final Electron reload displayed the Coaching Area picker.
- Final public queries confirmed no verification Seasons, starter template, Workspace,
  or Archive entries. The temporary internal cleanup module was removed locally and
  by a successful development push.
- Local scripts and the screenshot remain under `/tmp/p3-*`, outside the repository.

## Assumptions and tradeoffs

- **P3-2 substitution:** settings are created by the first mutation, not the first
  read. Queries cannot write. The shared upsert and Convex transactions maintain
  the singleton; administrative checks confirmed one row. A theme-only settings
  document does not count as completed First Launch.
- Stored deployment theme wins on initial read; local storage remains the bootstrap
  and unconfigured fallback. This replaces the former auth-gated no-op intentionally.
- Season creation and active selection remain separate mutations, as approved.
  Names need not be unique; names trim to 1–80 characters; Week is an integer 0–52.
- Route-facing Workspace queries accept strings and normalize ids, matching the
  existing template query convention so malformed URLs show not found.
- A shared `src/components/workspace-actions.tsx` avoids duplicating confirmation,
  Delete/Undo, and Archive behavior between Season View and Overview. It also makes
  deletion of an archived Workspace available from its direct Overview URL.
- Overview summary data comes from `getOverview`; a separate existing-record `get`
  supplies Notes and Archive state without expanding the approved summary shape.
  Notes reuse the existing Autosave hook and optimistic cache update.
- Cell Note and per-Source-Game Snap scans retain the approved V1 volume assumption;
  comments identify when batched reads or aggregate counters would be appropriate.
- No dependencies, schema validators, deletion-ledger implementation, crons, shared
  database hooks, UI primitives, route table, Electron code, or package scripts changed.
  Source Game creation, Play Log, Opponent Data, Tendencies, and Reports remain outside
  this phase. No manual Save action was introduced.

## Reviewable commits

```text
457d21d feat: persist settings singleton and migrate theme preference
ab6accb feat: gate first launch and install the selected starter template
668c18d feat: add seasons and persistent sidebar selection
623756d feat: add workspace CRUD and recoverable hierarchy deletion
eb388f6 feat: build minimal Home with active season and recent opponents
3a2d54f feat: add Season View and create opponent dialog with Undo deletion
0a4bd9a feat: add live Workspace Overview and autosaved Notes
b23aeb2 feat: archive and reopen Workspaces with separate Undo
```

The closeout commit adds this report and the names-module whitespace cleanup.
The supplied untracked plan remains unchanged and excluded from commits.
No Git push, merge, or pull request was performed.
