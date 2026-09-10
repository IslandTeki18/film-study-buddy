# Phase 1 foundations — completion report

Implemented the approved Phase 1 plan in small commits on `phase-1-foundations`.
Phase 2 has not started. Steps 1.5 and 1.6 are implemented and statically checked;
their live Convex verification remains deferred as directed by plan §0.3.

## Changes and verification

| Step | Result | Verification performed |
| --- | --- | --- |
| 1.1 | Exactly four approved dependencies added | Typecheck, unchanged six theme tests, Electron launch and theme/sidebar checks |
| 1.2 | Fourteen-field registry, shared formatters and `@convex` alias | Exact keys/options, all lookups, rendered fourteen-row checklist and renderer alias resolution |
| 1.3 | Field Zone, situation, provenance and restoration functions | One-shot boundary/invalid-input assertions below; all 99 valid Yard Line round trips |
| 1.4 | Fifteen Formations, fifteen Motions, ten Play Concepts | Sorted/unique assertions, count 40, all lists rendered |
| 1.5 | Nineteen-table schema with all blueprint indexes | Typecheck and structural inspection; runtime schema push not run |
| 1.6 | Batched soft deletion, idempotent Undo, recent ledger, daily purge | Typecheck and ephemeral fake-database handler checks; live round trip not run |
| 1.10 | Eleven native UI primitives and one-toast provider | Real Electron keyboard checks, dialog focus trap/return, menu/tabs, popover, checkbox, native inputs, both themes; toast eight-second expiry and hover/focus pause |
| 1.7 | Twenty-four screen states, hash routing, sidebar and two tab strips | Every URL and scratch checklist link, all sidebar/tab clicks, repeated arrow navigation retaining focus, deep-link reload and built renderer under `file://` |
| 1.8 | Debounced local drafts and guarded Undo action | 400ms debounce, immediate reload/unmount, Enter retry, error retention/logging, clean external updates, dirty echo protection, serialized slow saves, duplicate-flush prevention, keyboard Undo and visible Undo failure |
| 1.9 | Native drag-and-drop and keyboard reorder | Mouse drag of item 4 above item 2 with indicator; ten Tab/Enter moves reverse the same list; every announcement checked; eight enabled move buttons reachable and disabled boundaries skipped |

No persistent test files were added. `package.json` still runs only the existing
`theme.test.ts`. Temporary scratch controls and their storage were removed at close-out.

Final checks passed: `npm run typecheck`, `npm test` (6/6), `npm run build`, and
`git diff --check aefd624`. `rg -i scratch src/` returns no matches. The final renderer
loads and reloads deep links under `file://`; the dev renderer opens Home.
An extra build with `VITE_CONVEX_URL=''` verified the unconfigured banner, sidebar, and
Light/Dark/System changes without editing an environment file. The normal build was restored.
Electron/Vite still prints the existing missing-preload notice; adding a preload is Phase 10 work.
Whole-branch review and scoped cleanup review found no important unresolved defects.

## Assumptions, tradeoffs and deviations

- The user's explicit authorization to initialize Git and commit each step overrides
  stale plan §0.6. A baseline commit captures the original project before plan changes.
- Domain prerequisites required terminology → Field Zone → registry/aliases → situation/provenance,
  instead of numeric order. This avoids temporary stubs and keeps those commits buildable.
- The working tree acquired external camelCase renames, matching new local Convex naming rules,
  plus changed imports, generated API and plan/convention documentation. Those externally authored
  edits are preserved and excluded from this agent's commits pending explicit permission.
  The verified working tree uses `coreFields.ts` and `fieldZone.ts`. Intermediate scratch commits
  reference those renamed modules; the final scratch page is removed. The Convex-compatible
  filename corrections remain uncommitted, so preserve them before attempting the deferred push.
- The plan's missing-environment/stub-API assumptions were stale: `.env.local` and a generated
  typed API already exist. They were preserved. No Convex dev/deploy/codegen command was run
  by this implementation. The cron uses a typed `makeFunctionReference` because its generated
  module entry was unavailable when the cron was built.
- Native platform UI follows the plan's no-Radix decision. Native select does not yet provide
  inline terminology creation; Phase 4.9 owns that UI. Settings retains its working theme controls.
- Import Preview is the second state of the existing import route, exposed with `?step=preview`:
  twenty-four screens, twenty-three distinct pathname patterns. Create Opponent and Add Source Game
  remain placeholder routes until their planned dialog implementations.
- One unkeyed route error boundary preserves mounted tab-layout keyboard focus during navigation.
  No Phase 0 theme, Electron host, button primitive or error-boundary implementation was changed.
- `useAutosave` exposes `flush`; consumers wire blur and Enter/Tab to it. It serializes saves and
  retains failed/dirty drafts. It invokes save on unmount/beforeunload, but remote asynchronous
  persistence at window close is best-effort: a browser does not wait for a mutation promise.
- Undo/purge scan twelve soft-deletable tables. This follows the approved simple design;
  add batch indexes and bounded batch processing if data volume makes scans slow or hits
  Convex transaction limits.
  The single-toast design replaces the previous notification when another action occurs.
- Schema enums derive directly from domain constants; no duplicate literal fallback was needed.
  `gameDate` is optional text. Report diagram snapshots contain drawing content without live IDs;
  tendency blocks reuse the statistical row snapshot shape.
- Yard Line text accepts canonical `OWN N`, `OPP N`, or `50`, case-insensitively with whitespace;
  ambiguous bare side-yard numbers are rejected. Invalid structured values are checked at boundaries.
  Situation buckets use contiguous numeric thresholds for fractional distances, with invalid or
  missing inputs returning `null`. Provenance uses own keys and trimmed canonical display text,
  while Restore returns the original raw string.
- Verification used temporary Node assertions and Electron's debugging protocol, without adding
  project dependencies or changing the test script. Missing-backend behavior was checked in
  the built app using a process environment override, because the existing dev environment is configured. An isolated hidden Electron window avoided
  changing the user's theme/storage during later UI checks. Agent thread limits required reusing
  existing implementer/reviewer agents for the final hooks; each change still received review.

The plan's A1–A11 assumptions remain in force: exported Field Zone thresholds are own 1–10,
own 11–39, own 40 through opponent 40, opponent 39–21, opponent 20–6, and opponent 5–1;
distance is Short ≤3, Medium >3–6, Long >6 on downs 2–4; first down is unsplit and zero is Short.
`playNumber` is a Hudl reference outside the fourteen-field registry. Clock/personnel remain text;
quarter/down have no registry maximum. Purge runs daily at 08:00 UTC. The fifteen-entry Formation
and Motion lists are a content judgment that can be reviewed by the coach; no aliases were added.

## Deferred regression coverage

Add `node --test` coverage for Field Zone/parser boundaries, situation buckets, provenance and
restoration, plus the fourteen registry fields/options before Phase 6 depends on these modules.
The derived modules carry the requested `ponytail:` reminders. The assertions run for this phase
are evidence for this change, not persistent regression coverage.


## One-shot domain output

```text
formations 15 sorted, unique: Bunch, Double Tight, Double Wing, Empty, Flexbone, I Formation, Pistol, Shotgun, Singleback, Split Backs, Spread, Stack, Strong I, Trips, Wing-T
motions 15 sorted, unique: Across, Arc, Fly, Glide, In, Jet, Orbit, Out, Return, Rocket, Short, Shuffle, Trade, Yo-Yo, Zip
playConcepts 10 sorted, unique: Counter, Duo, Flood, Inside Zone, Mesh, Outside Zone, Power, Screen, Split Zone, Trap
OWN 1    Backed Up
OWN 10   Backed Up
OWN 11   Own Territory
OWN 20   Own Territory
OWN 39   Own Territory
OWN 40   Midfield
50       Midfield
OPP 40   Midfield
OPP 39   Plus Territory
OPP 21   Plus Territory
OPP 20   Red Zone
OPP 6    Red Zone
OPP 5    Goal Line
OPP 1    Goal Line
field-zone invalid inputs and all 99 valid positions: OK
core-fields OK clipNumber,quarter,clock,down,distance,yardLine,hash,personnel,formation,motion,playType,playConcept,direction,yards
1&10 -> 1st Down
2&3 -> 2nd & Short
2&4 -> 2nd & Medium
2&6 -> 2nd & Medium
2&7 -> 2nd & Long
3&1 -> 3rd & Short
3&5 -> 3rd & Medium
3&12 -> 3rd & Long
4&2 -> 4th & Short
4&5 -> 4th & Medium
4&9 -> 4th & Long
missing -> null null
provenance -> Coach Entered Imported Coach Edited
restored -> 3
situation invalid inputs and provenance own-key/whitespace checks: OK
```

The prefixed terminology `sort -u | wc -l` check printed `40`, equal to 15 + 15 + 10.
Registry assertions included exact Hash, Play Type and Direction arrays, every lookup and invalid values.

## Confirmed hash URLs

All twenty-four were checked by direct URL and by clicking the temporary checklist links.
The four sidebar links and both nested tab strips were also exercised.

| Hash URL | Screen |
| --- | --- |
| `#/welcome` | First Launch Setup |
| `#/` | Home |
| `#/seasons/x` | Season View |
| `#/seasons/x/new` | Create Opponent |
| `#/w/x` | Weekly Opponent Overview |
| `#/w/x/games` | Source Games List |
| `#/w/x/games/new` | Add Source Game |
| `#/w/x/games/y/import` | Hudl CSV Import / Mapping |
| `#/w/x/games/y/import?step=preview` | Hudl Import Preview |
| `#/w/x/games/y` | Play Log |
| `#/w/x/games/y/snap/z` | Play Detail |
| `#/w/x/games/y/notes` | Quick Notes |
| `#/w/x/games/y/review` | Must Review Queue |
| `#/w/x/games/y/diagrams` | Play Diagram Gallery |
| `#/w/x/games/y/diagrams/z` | Play Designer |
| `#/w/x/data` | Opponent Data |
| `#/w/x/tendencies` | Tendencies / Alerts |
| `#/w/x/reports` | Report List |
| `#/w/x/reports/z` | Report Builder |
| `#/w/x/reports/z/preview` | Report Preview |
| `#/templates` | Coaching Templates |
| `#/templates/z` | Template Builder |
| `#/settings` | Settings |
| `#/archive` | Archived Opponents |

## Deferred live Convex verification

Run this only against the development deployment after resolving any Convex login prompt. It creates a temporary internal verification mutation, checks a real soft-delete/Undo round trip, then removes the fixture. It does not need a later-phase CRUD module.

```sh
cat > convex/verifyFoundations.ts <<'TS'
import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { softDeleteBatch } from './deletions'

export const roundTrip = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const id = await ctx.db.insert('seasons', {
      name: 'Phase 1 verification', createdAt: Date.now(),
    })
    const batchId = await softDeleteBatch(ctx, {
      kind: 'season', label: 'Phase 1 verification', records: [{ table: 'seasons', id }],
    })
    const hidden = await ctx.db.get(id)
    if (hidden?.deletedAt === undefined || hidden.deleteBatchId !== batchId) {
      throw new Error('Soft deletion did not stamp the record')
    }
    const undo = makeFunctionReference<'mutation', { batchId: string }, null>('deletions:undo')
    await ctx.runMutation(undo, { batchId })
    await ctx.runMutation(undo, { batchId })
    const restored = await ctx.db.get(id)
    if (!restored || restored.deletedAt !== undefined || restored.deleteBatchId !== undefined) {
      throw new Error('Undo did not remove both deletion fields')
    }
    const ledger = await ctx.db.query('deletions')
      .withIndex('by_batchId', (q) => q.eq('batchId', batchId)).unique()
    if (!ledger || ledger.undoneAt === undefined) throw new Error('Undo did not stamp the ledger')
    await ctx.db.delete(id)
    await ctx.db.delete(ledger._id)
    return 'PASS: hidden, restored, repeated Undo; fixture records removed'
  },
})
TS
npx convex dev --once
npx convex run verifyFoundations:roundTrip '{}'
rm convex/verifyFoundations.ts
npx convex dev --once
```

The first schema push verifies step 1.5; the returned PASS verifies the real patch/removal path in step 1.6. A thrown error rolls back that verification mutation. The temporary module must be removed and the final push completed even if verification fails. This block has not been run during Phase 1 implementation.

## Reviewable commits

```text
aefd624 chore: capture existing project baseline
d1f493b chore: add phase one foundation dependencies
39700f1 feat: add built-in football terminology
217a2ed feat: add field position and zone derivation
fbaae76 feat: define core snap fields and shared import alias
b60a325 feat: derive snap situations and imported provenance
0f366ea feat: define foundation data schema
299cd7c feat: add soft deletion ledger and daily purge
f2af728 feat: add native UI foundation primitives
2b315e1 feat: route foundation screens with hash navigation
cd0e096 feat: add autosave and undo mutation hooks
4500764 feat: add native and keyboard reorder hook
```

The close-out commit removes the scratch route, trims seven added EOF blank lines,
updates the checklist, and adds this report. All implementation work remains on
`phase-1-foundations` in the existing workspace.
