# Phase 7 Observations and Must Review — completion report

Implemented and verified on `main`, with small commits for each implementation step and
review fixes. The supplied untracked plan remains unchanged and excluded from commits.
No schema or dependency changes. No Git push, branch switch, merge, or pull request.

## Per-step changes and evidence

| Step | Commits | Changes and verification |
| --- | --- | --- |
| 7.1 | `6aca11c`, `d8ea383`, `9e1860c`, `3bb3675`, `1d5b147`, `fbe57ee` | Quick Note tags and validated CRUD; oldest-first list, used-tag filter, inline edit, delete/Undo. Live backend rejected blank/oversized text and cross-game Snap associations. Electron verified chronological order, custom tags, filter/All, edit persistence, Delete/Undo, and Snap links. |
| 7.2 | `de91b0e`, `d4084e1` | Create-only popup from Snap actions and Play Detail; Snap-specific list. Electron verified the Play Log stayed mounted, blank Save was disabled, custom-tag Enter did not submit, Escape discarded drafts, and failed saves retained text and showed errors. |
| 7.3 | `f082f84`, `dd37b7b`, `4203fac`, `a5ca751`, `5d9fb88` | Fixed shortcut map, Electron menu without Reload, shared optimistic Must Review hook, palette and Play Detail shortcuts. Electron Cmd+R toggled both surfaces; Play Detail button still worked; dialog guard prevented changes. Reload sentinel survived on Home, Play Log, Play Detail, and Focused Review. |
| 7.4 | `523bf94` | Review Queue reuses charted Snap cells and existing Snap query, ordered by `order`. Electron showed exactly five Must Review Snaps in order, correct links/count, and an empty state after resolution. Quick Notes did not appear. |
| 7.5 | `523bf94`, `466fee5` | Embedded Play Detail, Previous/Next/Skip/Resolve, J/K, session-local Skip order. Electron verified buttons, repeated Skip, editing, and final resolution. A second five-Snap walkthrough used only J, K, Shift+Tab/Enter for Skip, and five Cmd+R presses to empty the queue. |
| 7.6 | `c2cfda9`, `a30c439` | Applicable Required Template Field count and Finish study session warning. Live count was exactly three; blank pass-only fields did not penalize Run Snaps. Electron verified Keep charting, Finish anyway, and direct navigation at zero. |
| Review fixes | `154d83b`, `466fee5` | Quick Notes respect linked Snap liveness after independent Undo batches. Review advancement awaits pending field saves, preventing shortcut resolution from dropping an active draft. Both fixes passed scoped re-review and live regression checks. |

## Verification commands and results

- `npm run build` passed on final application commit `466fee5`: strict TypeScript, all
  12 tests, and Electron/Vite production compilation. Existing missing-preload warning remains.
- `npx convex dev --once` passed after backend changes and again on the final application.
- `node src/features/review/review.check.mjs` passed: order, Skip order, resolved/deleted
  membership, empty queue, and no input-array mutation.
- `node src/features/notes/quick-notes.check.mjs <Source Game ID>` passed against an isolated
  fixture. It creates and soft-deletes its own temporary Snap and Quick Note, verifies independent
  deletion/Undo batches, and confirms hidden/rejected access until the parent Snap is restored.
- Electron launched with `npm run dev -- --remoteDebuggingPort 9222`. Live checks used the
  Chromium debugging protocol for pointer/keyboard input and DOM inspection, with actual Convex
  persistence checked through `ConvexHttpClient`.
- Create and inline-edit failures were induced with oversized Quick Note text. Drafts and error
  messages remained visible; Escape cancelled edits and reset the popup.
- The active-editor regression typed a Template Field and pressed Cmd+R without blur: the value
  persisted before resolution. Invalid Yards `999` retained the same Snap, draft, and Must Review
  state; correcting it to `7` saved and advanced.
- Snap deletion removed associated Quick Notes; Undo restored both. Independent Quick Note Undo
  while its Snap was deleted did not expose an orphan Quick Note.
- `git diff --check` passed. No linter script is configured.

Scratch acceptance scripts and fixture identifiers are in `/tmp/p7-*`. This is macOS Electron
verification, not Windows/Linux or native OS menu-event coverage. The menu configuration retains
Force Reload for development; native Cmd+Shift+R remains a release smoke-test item.

## Decisions and assumptions

| Decision | Behavior and tradeoff |
| --- | --- |
| Approved plan takes precedence | Its stale Draft status and older blanket autosave/confirmation wording were superseded by the user's approval. Quick Note create/edit uses Save; deletion uses Undo without confirmation. Reversing either choice needs a UI change. |
| Tags | Eight defaults plus custom tags on live Quick Notes; case-insensitive normalization. Filtering is single-select and only shows tags in use. Unused custom tags disappear from the picker. |
| Chronology | Oldest-first Quick Notes; Review Queue uses ascending stored Snap order. The existing Play Log reverse display order is preserved. |
| Skip | Local to the review visit; leaving or reloading forgets skips. No backend queue state. |
| Finish | Explicit button returns to Source Games. No session record or general route blocker. Only applicable Required Template Fields count; Core Snap Data never does. |
| Pending saves | Popup dismissal is disabled during Save so a failure retains its draft. Review navigation waits for deferred field edits and stays put on failure; standalone editor behavior remains unchanged. |
| Linked Snap checks | Listing linked Quick Notes performs a parent read per linked record to respect independent Undo batches. No schema/index addition. |
| Tests | Small domain/shortcut tests plus two runnable checks; no new testing dependency. |

## Fixtures and cleanup

Dedicated fixture hierarchy:

- Season: `k177cf6n7s4mvhfvcbr9kj0w7n8eeh4t`.
- Template: `m97fej96qwe0yvps7zv3dr5stx8ef69r`.
- Workspace: `kx7d77zp93d8g3dqcg8rxy6qhx8eeptd`.
- Source Game: `k97e4jnce4k3vzxqpzpkt0e1hx8efct7`.

The fixture Season and Template were soft-deleted through existing APIs after verification;
queries confirmed the Source Game and Template were no longer live. Their descendants and
verification deletion receipts follow the normal purge lifecycle. No hard-delete utility was
added. Tests used separate data and did not modify existing coaching content.

## Follow-up

Before cross-platform release, smoke-test native Cmd/Ctrl+R and development Force Reload on
supported operating systems. Re-run the focused-edit failure check when changing editor save
behavior, and the independent Undo check when changing deletion cascades.
