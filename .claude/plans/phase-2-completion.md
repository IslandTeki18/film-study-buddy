# Phase 2 Coaching Templates — completion report

Implemented Step 0 and all eight Phase 2 steps in separate commits on `main`.
All step-specific live verifications passed. The final administrative table rescan
remains pending because the owner switched the Convex CLI login to their work account.
The app's normal API remained available for final UI checks and template cleanup.

## Changes and verification

| Step | Result | Verification performed |
| --- | --- | --- |
| 0 | Closed Phase 1 schema and deletion-ledger verification | Development push; real delete, Undo, repeated Undo; PASS returned; temporary module removed and cleanup push passed |
| 2.1 | Eleven Starter Coaching Templates; shared field types, normalization, value-presence rules and column reconciliation; equivalent schema validator | One-shot assertions below; pure imports; strict typecheck; development push |
| 2.2 | Template list/get/create/install/rename/duplicate/remove | All eleven installed trees compared field-for-field; invalid route returns null; independent copied IDs and edits; delete/Undo restores full tree; later checks verified copied view IDs and view preservation through Undo |
| 2.3 | Section/field editing, ordering, options and server type protection | Live persisted reorders; stale lists rejected without changes; exact option deduplication; field and section deletion/Undo; typecheck and development push |
| 2.4 | Coaching Templates list and name dialog | Electron create, keyboard rename/duplicate/delete, Undo and reload; list/backend agreement; Tab focus trap and focus return; server failure retains dialog draft; loading skeleton and actual empty state |
| 2.5 | Builder structure, inline autosave, add/remove/Undo and optimistic ordering | Native mouse field drag; keyboard section moves; reload/backend agreement; inline rename/Escape; new-item focus; field/section Undo; rejected autosave retains draft; observed optimistic order never reverts |
| 2.6 | All eight field types; option controls, fixed rating scale, Required and Carry-Forward | Created all eight types in Electron; reloaded and compared settings with getFull; duplicate options remain unique; add/remove works; changing select to Short Text clears options; keyboard edit activation and form submission |
| 2.7 | Usage counts, deletion confirmations and disabled type selection for fields holding data | Three seeded Snaps produced field/section/template counts 2/3/3; Cancel receives focus; explicit populated and empty confirmations; Undo restores records and unchanged values; UI and server type locks; hierarchy teardown and module-removal push passed |
| 2.8 | Named Play Log Views with visibility/order only | Quick Chart retains five visible columns; Run Study puts Run Game fields first; views persist independently after reload; keyboard and mouse reorder; new columns appear hidden and deleted columns disappear; invalid keys/subsets/duplicates rejected; hard deletion confirms and has no Undo |

Final `npm run build` passed: strict typecheck, all six existing theme tests, and
Electron/Vite production builds. A separate build with `VITE_CONVEX_URL=''` verified
both template routes under `file://` without a provider. The normal configured build
was restored and its template deep link loaded and reloaded successfully.
`git diff --check 3fe2945` passed. No `verifyTemplates` or `verifyFoundations` references
remain in `convex/` or `src/`. The existing missing-preload notice is unchanged.

No dependencies, persistent tests, package scripts, shared UI primitives, shared hooks,
router table, deletion ledger, crons, or environment files changed. The schema's stored
shape is unchanged; only the field-type validator now derives from the domain tuple.

## Cleanup and remaining administrative check

- Step 0 removed its season and deletion-ledger fixtures within the successful verification.
- Step 2.7's teardown removed every fixture Snap, Source Game, workspace and season.
  The temporary internal module was then removed locally and from the development deployment.
- Final cleanup soft-deleted all 15 remaining live `P2 verify …` templates through the
  app's existing public `templates:remove` API. A fresh `templates:list` query returned
  zero live verification templates, and Electron rendered the real empty state.
- Soft-deleted verification templates/sections/fields remain recoverable until the
  existing 24-hour purge. Views follow the approved retention/orphan policy below.
- Temporary checks, screenshots and fixture IDs under `/tmp/p2-*` are not committed.
  They are not application dependencies. The verification Electron process was stopped.
- After restoring the personal Convex login, the remaining CLI-only close-out scan is:

```sh
npx convex run templates:list '{}'
npx convex data seasons
npx convex data workspaces
npx convex data sourceGames
```

These should contain no live `P2 verify` templates and no `P2 verify` hierarchy fixtures.
The final CLI attempt failed with:

```text
✖ You don't have access to the selected project. Run `npx convex dev` to select a different project.
```

The owner confirmed the account switch. No credentials, deployment selection, login,
or environment files were changed to work around it. Every backend implementation
step had already passed its required development push before this final account switch.

## Assumptions and tradeoffs

B1–B13 hold:

- B1–B2: Exact approved starter content and Coaching Area names; starter fields are
  optional and do not carry forward.
- B3–B4: Create produces a blank general template; names are trimmed, 1–80 characters,
  and not unique. Starter installation remains for Phase 3.
- B5–B6: Recorded values prevent field-type changes. Select options support exact-string
  add/remove, not renaming or reordering; removing an option leaves recorded values intact.
- B7: Fields reorder only within their Section.
- B8–B10: Templates, Sections and Template Fields use the deletion ledger and Undo;
  populated deletion requires confirmation. Views use confirmed hard deletion, and
  template soft deletion preserves their rows. Source Games and Snap values remain intact.
- B11: False and zero count as data; empty/whitespace strings and empty arrays do not.
- B12: New views start with all fourteen Core Snap fields and current template fields
  visible in catalog order. Reconciliation appends later fields hidden.
- B13: New sections/fields use the approved default names and focus their inline name.

The explicit instruction to stay on `main` overrides the plan's branch instruction.
The supplied untracked plan is preserved and excluded from commits. No attribution
trailer was supplied in this session, so none was invented.

Return validators reuse the schema's fields. Shared mutation guards also require live
parents. Usage queries return zero for disappeared targets so reactive subscribers can
unmount cleanly after deletion; foreign template/section references are rejected.
Native controls and the existing one-toast/Undo design are reused. No Save button exists.

## Risks carried into Phase 4

- R1: Usage scans Source Games and their Snaps at V1 volume. Add an index/read model if
  measured latency or transaction limits justify it.
- R2: A Source Game can reference a soft-deleted template. Phase 4 must handle this state
  and template reassignment while preserving Core Snap Data.
- R3: Views survive template Undo but become unreachable after template purge. Orphan
  cleanup remains deferred as approved; the deletion ledger was not changed.

## One-shot domain output

```text
starter templates OK Quarterbacks:3, Running Backs:3, Wide Receivers:3, Tight Ends:3, Offensive Line:3, Offensive Coordinator:3, Defensive Line:2, Linebackers:3, DB / Secondary:3, Defensive Coordinator:3, Custom / General:1
names, options, analysis values, catalog and reconciliation OK
```

## Reviewable commits

```text
10ddb74 chore: verify phase one schema and deletion ledger live
0d5c34b feat: add starter coaching templates and template field domain
c0a0ab0 feat: add coaching template queries and mutations
69a9cd1 feat: add section and field template mutations
349cc7a feat: build coaching templates screen
197c40b feat: build template builder structure with reordering
b47f9c5 chore: document phase two progress and verification blocker
4e80576 feat: add template field editor
2995ad9 feat: protect template deletions that hold snap data
fe8ff3f feat: add play log views to coaching templates
```

The close-out commit updates this report and the checklist. No push, merge, or PR was performed.
