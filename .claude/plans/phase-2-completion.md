# Phase 2 Coaching Templates — progress report

Phase 2 is **not complete**. Implemented Step 0 and 2.1–2.5 on `main`, following the
user's branch instruction. Steps 2.6–2.8 and final acceptance remain unimplemented.

## Current blocker

The development schema pushes and live checks through 2.4 succeeded. During 2.5,
`npx convex run templates:getFull` failed twice with:

```text
✖ You don't have access to the selected project. Run `npx convex dev` to select a different project.
```

The second attempt was the same read-only query outside the sandbox. No deployment
selection, environment file, login, or access setting was changed. Restore access to the
configured development project before resuming required live verification and pushes.
Earlier sandbox DNS failures were resolved by approved execution outside the sandbox;
this later project-access denial persisted there.

## Changes and verification

| Step | Result | Verification performed |
| --- | --- | --- |
| 0 | Phase 1 schema and deletion ledger verified | Development push; real delete, Undo, repeated Undo; PASS returned; temporary module removed and final push passed |
| 2.1 | Eleven Starter Coaching Templates and shared field/column rules; equivalent schema validator | One-shot assertions below; pure imports; typecheck; development push |
| 2.2 | Template list/get/create/install/rename/duplicate/remove | All eleven live trees compared field-for-field with approved content; invalid route returns null; copied field IDs differ; template delete and Undo restore the full tree |
| 2.3 | Section/field edits, ordering, option management, type-change protection | Live persisted reorders; stale list rejected without changes; duplicate options rejected/idempotent; field and section delete/Undo; editing copied field leaves original unchanged; typecheck and push |
| 2.4 | Coaching Templates list and name dialog | Electron create; keyboard rename, duplicate and delete; Undo; reload persistence; typecheck |
| 2.5 | Builder structure, autosaved names, optimistic reordering, add/remove/Undo | Typecheck and production build passed. Electron drag sequence sent, but backend comparison failed with access denial. Full UI verification remains pending |
| 2.6 | Not started | Field editor remains to implement |
| 2.7 | Not started | Usage query, confirmation dialogs, populated fixtures and type-lock UI remain to implement |
| 2.8 | Not started | Play Log View CRUD/editor remain to implement |

`npm run build` passed after 2.5: strict typecheck, all six existing theme tests,
and Electron/Vite production build. `git diff --check` passed. The existing missing-preload
notice remains. No dependencies, test files, package scripts, shared UI primitives,
shared hooks, routing table, deletion ledger, crons, or environment files changed.

## Resume and cleanup

1. Restore access and rerun the development-only read check. Do not switch deployments
   or invoke interactive login without the owner's intervention.
2. Finish 2.5 verification: native field drag, keyboard section ordering, optimistic
   behavior, name blur/Enter/Escape and error retention, new-item focus, field/section
   Undo, and reload/backend agreement. The failed run may already have moved
   `Backside Action` above `Puller` in `P2 verify Defensive Line`; read current order first.
3. Exercise remaining 2.4 acceptance details: loading/empty states, full Tab focus trap
   and focus return, mutation failures, and exact list agreement with the backend.
4. Implement and verify 2.6–2.8 in separate commits. Check the existing server type lock
   against actual Snap values during 2.7; it has not yet been exercised with populated Snaps.
5. Complete all fixture cleanup and final acceptance before calling Phase 2 complete.

Live verification templates **remain** because project access failed before cleanup.
Expected live names: `P2 verify <Coaching Area>` for all eleven areas,
`P2 verify Defensive Line (copy)`, `P2 verify UI renamed`, and
`P2 verify UI renamed (copy)`. Verify the actual list before removing them through
`templates:remove`. Step 2.3 also created and soft-deleted a temporary section/field;
the ordinary 24-hour ledger purge applies. No Phase 2 Snap/source-game/workspace fixtures
were created. The Step 0 season and ledger fixtures were removed in its successful transaction.
No `convex/verify*.ts` files remain locally or in the last successful backend push.

Temporary driver scripts and fixture IDs are in `/tmp/p2-*.mjs` and `/tmp/p2-ids.json`;
they are not committed or required for the app. The Electron driver needed
`Emulation.setFocusEmulationEnabled` for native keyboard/mouse events in the verification
window. Earlier driver failures were not recorded as passing UI checks.

## Assumptions and tradeoffs

- B1–B4 hold: exact approved starter content, optional/non-carry-forward defaults,
  blank general templates on Create, trimmed 1–80 character non-unique names.
- B5 is implemented on the server; populated-data verification and disabled UI await 2.7.
- B6 holds for backend option management; its UI awaits 2.6.
- B7 holds: field reordering is within its Section only.
- B8–B9 hold in template CRUD: views stay through soft delete; Source Games and Snap
  analysis values are not changed. View CRUD remains pending.
- B10 awaits 2.7 deletion confirmation. Current 2.4/2.5 deletes execute immediately
  with Undo, as the intermediate plan steps specify; they are not final Phase 2 behavior.
- B11 passed domain assertions: false and zero count as data; blank strings/empty arrays do not.
- B12's catalog and reconciliation are implemented; the view creation UI awaits 2.8.
- B13 default names are implemented; focus/inline rename still need full 2.5 UI verification.
- Explicit user instruction to stay on `main` overrides plan §0.6. The user's untracked
  approved plan was preserved and excluded from commits. No attribution trailer was
  supplied in this session, so none was invented.
- Return validators reuse the existing schema fields instead of duplicating stored shapes.
  Sections and fields also require live parents at the shared mutation boundary.

## Risks carried into Phase 4

- R1: Usage checks scan Source Games and their Snaps. Fine for V1 volume; add an index
  or usage read model if measured latency or transaction limits require it.
- R2: A Source Game may reference a soft-deleted template. Phase 4 must handle that state
  and offer template reassignment without silently discarding Core Snap Data.
- R3: Saved views survive template Undo but become unreachable after template purge.
  Orphan cleanup is deferred as explicitly approved.

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
```

The following documentation commit records the access blocker and incomplete acceptance;
it does not close out Phase 2.
