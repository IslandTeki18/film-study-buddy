# Tell Finder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Execute tasks in order; each task leaves `npm run typecheck` passing.

**Goal:** A new **Tells** tab in the Weekly Opponent Workspace. It automatically lists the pre-snap looks (one field, or a pair of fields) that predict an outcome, with counts, a baseline, and a small-sample flag. Each Tell can be saved as a Tendency / Alert in one click.

**Architecture:** A pure function, `findTells`, in `convex/domain/tells.ts` does all the counting and is covered by `node --test`. `convex/tells.ts` reuses `loadScope`, `groupingFieldsFor`, and `groupingValuesOf` from Opponent Data to turn Snaps into single values per field, then calls `findTells`. A `promote` mutation recomputes the Tells on the server, finds the requested one by key, and inserts a normal `tendencies` row. The UI is one page plus one dialog, modeled on `create-tendency-dialog.tsx`.

**Tech Stack:** Convex queries and mutations, React 19 + TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), react-router hash routes, `node --test`.

---

## Decisions

| # | Decision | Rationale | Reversibility |
|---|---|---|---|
| T1 | Tells are counts, not AI. There is no model call and no prose generation. | SPEC §2 excludes "Automated AI-generated tendencies". Statistical discovery that the coach confirms is a different thing. This is recorded in the SPEC in Task 1. | Easy |
| T2 | **Indicators** (pre-snap): Personnel, Formation, Motion, Hash, Down and Distance Situation, Field Zone. **Outcomes:** Play Type, Direction, Play Concept, plus every single-valued template field (`select`, `checkbox`, `rating`). | Core fields cover offense scouting. Template select fields (for example Coverage or Pressure) cover defense scouting with no extra code. | Easy |
| T3 | The search covers single indicators and pairs of indicators. There are no triples. | 6 singles + 15 pairs = 21 combinations. With high school sample sizes (40 to 70 snaps per game), triples almost never reach the minimum snap count. | Easy |
| T4 | Thresholds are constants: at least 5 snaps, top share at least 70%, lift over the baseline at least 15 points, a "small sample" label below 8 snaps, and at most 40 results. | They are explainable to a coach. The lift rule removes trivial Tells such as "they pass 90% of the time, and 90% from Trips". | Easy (turn the constants into settings later) |
| T5 | Ranking is by Wilson 95% lower bound minus baseline, then by snaps (descending), then by key. | The lower bound punishes small samples without a hand-tuned weight. The key makes the order deterministic. | Easy |
| T6 | A pair Tell is dropped when either of its single indicators is already a Tell for the same outcome value, with a share at least as high. | The pair adds no information in that case. Pairs are kept only when they reveal something the singles hide. | Easy |
| T7 | A saved Tell becomes an ordinary Tendency. `groupBy` is the joined indicator labels (for example "Formation + Hash") and `groupBy2` is the outcome label. The rows are the outcome breakdown inside the group, and `frequency` is the share within the group, not over all snaps. | This reuses the Tendencies page, report blocks, and AI brief unchanged. The within-group share is the number the coach cares about. | Easy |
| T8 | ODK is a page filter (All / O / D / K) and defaults to All. It is not persisted. | Without ODK filtering, offense and defense snaps mix. Persisting it would add a setting for little value. | Easy |

## Assumptions

| # | Assumption | Consequence if wrong |
|---|---|---|
| A1 | Snap counts per Workspace stay under about 1,000. `findTells` is roughly O(outcomes × 21 × snaps). | If queries slow down, cache results per Workspace in a table, invalidated by Snap writes. |
| A2 | Multi-valued fields (`tags`, `multiSelect`) are excluded from both indicators and outcomes. | If coaches need them, count each value separately, the same way `aggregate` does with `overlapping`. |
| A3 | Template fields match across Source Games by `templateGroupingKey` (type + normalized name), the same way Opponent Data does. | Tells use the same field identity as Opponent Data, so they cannot disagree with it. |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Coaches treat a 5-snap Tell as fact. | Show "Small sample" below 8 snaps, always show "X of N", and state "Counts only: confirm on film" on the page. |
| R2 | A Tell disappears between list and save because a Snap was edited. | `promote` recomputes on the server and throws "That Tell changed…", mirroring `tendencies.create`. |
| R3 | Circular imports: `tells.ts` → `tendencies.ts` → `opponentData.ts`. | There is no cycle back into `tells.ts`. Task 3 runs typecheck and `npx convex dev --once` to confirm the push. |

## Files

| File | Change |
|---|---|
| `convex/domain/tells.ts` | Create. Constants, `wilsonLowerBound`, `findTells`, key predicates. |
| `convex/domain/tells.test.ts` | Create. `node --test` coverage for the domain function. The existing `convex/domain/*.test.ts` glob picks it up. |
| `convex/tendencies.ts` | Modify. Export `requireTitle`, `requireNote`, `requireCategory`. |
| `convex/tells.ts` | Create. `list` query and `promote` mutation. |
| `src/features/tells/tells.tsx` | Create. Page and `TellCard`. |
| `src/features/tells/save-tell-dialog.tsx` | Create. Save as Tendency / Alert dialog. |
| `src/routes/tells-page.tsx` | Create. Route wrapper. |
| `src/routes/routes.tsx` | Modify. Add a `tells` child route under `w/:workspaceId`. |
| `src/components/workspace-header.tsx` | Modify. Add a Tells tab to `WORKSPACE_TABS`. |
| `ubiquitous-language.md`, `.claude/SPEC.md` | Modify. Define "Tell" and record decision T1. |

---

## Chunk 1: Domain and backend

### Task 1: Record the term and the SPEC decision

**Files:**
- Modify: `ubiquitous-language.md` (the `## Analysis` section)
- Modify: `.claude/SPEC.md` (§2 "Explicitly Out of Scope for V1")

- [ ] **Step 1: Add the term under `## Analysis` in `ubiquitous-language.md`**

```markdown
- **Tell** — A pre-snap indicator (one field, or a pair of fields) whose Snaps show one outcome value
  far more often than the Workspace baseline. Computed by counting; never generated by AI. Example:
  "Formation: Trips Rt + Hash: Left → Play Type: Pass, 11 of 12 snaps (92%), all snaps 55%."
  A Tell becomes a Tendency / Alert only when the coach saves it.
```

- [ ] **Step 2: Annotate the SPEC out-of-scope bullet**

Replace `- Automated AI-generated tendencies` with:

```markdown
- Automated AI-generated tendencies (Tells, which are deterministic counts the coach confirms, are in scope; see `.claude/plans/tell-finder.md`)
```

- [ ] **Step 3: Commit**

```bash
git add ubiquitous-language.md .claude/SPEC.md
git commit -m "docs(tells): define Tell and scope it against AI tendencies"
```

### Task 2: `findTells` domain function (TDD)

**Files:**
- Create: `convex/domain/tells.test.ts`
- Create: `convex/domain/tells.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { findTells, isTellIndicatorKey, isTellOutcomeKey, TELL_MIN_SNAPS, wilsonLowerBound, type TellSnap } from './tells.ts'

const FORMATION = { key: 'core:formation', label: 'Formation' }
const HASH = { key: 'core:hash', label: 'Hash' }
const PLAY_TYPE = { key: 'core:playType', label: 'Play Type' }
let next = 0
function snaps(count: number, values: Record<string, string>, yards?: number): TellSnap[] {
  return Array.from({ length: count }, () => ({ id: `s${next++}`, values, ...(yards !== undefined ? { yards } : {}) }))
}

test('wilsonLowerBound is 0 for no data and about 0.72 for 10 of 10', () => {
  assert.equal(wilsonLowerBound(0, 0), 0)
  assert.ok(Math.abs(wilsonLowerBound(10, 10) - 0.7225) < 0.001)
  assert.ok(wilsonLowerBound(12, 12) > wilsonLowerBound(6, 6))
})

test('classifies indicator and outcome keys', () => {
  assert.ok(isTellIndicatorKey('derived:fieldZone'))
  assert.ok(!isTellIndicatorKey('core:playType'))
  assert.ok(isTellOutcomeKey('core:playType'))
  assert.ok(isTellOutcomeKey('field:select:coverage'))
  assert.ok(!isTellOutcomeKey('field:tags:notes'))
})

test('finds a single-indicator Tell with breakdown, baseline, and yards', () => {
  const data = [
    ...snaps(9, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }, 6),
    ...snaps(1, { 'core:formation': 'Trips Rt', 'core:playType': 'Run' }, 2),
    ...snaps(10, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION], [PLAY_TYPE])
  const trips = tells.find((tell) => tell.indicators[0]?.value === 'Trips Rt')
  assert.ok(trips)
  assert.equal(trips.outcome.value, 'Pass')
  assert.equal(trips.hits, 9)
  assert.equal(trips.snaps, 10)
  assert.equal(trips.share, 0.9)
  assert.equal(trips.baseline, 9 / 20)
  assert.equal(trips.smallSample, false)
  assert.equal(trips.snapIds.length, 10)
  assert.deepEqual(trips.breakdown, [{ value: 'Pass', snaps: 9, avgYards: 6 }, { value: 'Run', snaps: 1, avgYards: 2 }])
})

test('ignores groups below the minimum snap count', () => {
  const data = [
    ...snaps(TELL_MIN_SNAPS - 1, { 'core:formation': 'Empty', 'core:playType': 'Pass' }),
    ...snaps(10, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  assert.equal(findTells(data, [FORMATION], [PLAY_TYPE]).some((tell) => tell.indicators[0]?.value === 'Empty'), false)
})

test('ignores a high share that does not beat the baseline', () => {
  const data = [
    ...snaps(9, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }),
    ...snaps(1, { 'core:formation': 'Trips Rt', 'core:playType': 'Run' }),
  ]
  assert.deepEqual(findTells(data, [FORMATION], [PLAY_TYPE]), [])
})

test('Snaps missing the outcome or an indicator do not count toward N', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }),
    ...snaps(3, { 'core:formation': 'Trips Rt' }),
    ...snaps(5, { 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  const trips = findTells(data, [FORMATION], [PLAY_TYPE]).find((tell) => tell.indicators[0]?.value === 'Trips Rt')
  assert.ok(trips)
  assert.equal(trips.snaps, 5)
  assert.equal(trips.smallSample, true)
})

test('finds pair Tells that no single indicator reveals', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Left', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Right', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Left', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Right', 'core:playType': 'Pass' }),
  ]
  const tells = findTells(data, [FORMATION, HASH], [PLAY_TYPE])
  assert.equal(tells.length, 4)
  assert.ok(tells.every((tell) => tell.indicators.length === 2 && tell.share === 1))
})

test('drops a pair Tell when a single indicator already explains it', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Left', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Right', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Left', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Right', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION, HASH], [PLAY_TYPE])
  assert.equal(tells.length, 2)
  assert.ok(tells.every((tell) => tell.indicators.length === 1 && tell.indicators[0]?.key === 'core:formation'))
})

test('results are ranked by confidence floor over baseline and have unique keys', () => {
  const data = [
    ...snaps(12, { 'core:formation': 'Trips', 'core:playType': 'Pass' }),
    ...snaps(6, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
    ...snaps(6, { 'core:formation': 'Ace', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION], [PLAY_TYPE])
  const scores = tells.map((tell) => tell.confidenceFloor - tell.baseline)
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
  assert.equal(new Set(tells.map((tell) => tell.key)).size, tells.length)
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --experimental-strip-types --test convex/domain/tells.test.ts`
Expected: FAIL with `Cannot find module '.../convex/domain/tells.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
/** Tell Finder: deterministic search for pre-snap indicators that predict an outcome. Counts only; the coach interprets. */
export const TELL_INDICATOR_KEYS = [
  'core:personnel', 'core:formation', 'core:motion', 'core:hash', 'derived:downDistanceSituation', 'derived:fieldZone',
] as const
export const TELL_CORE_OUTCOME_KEYS = ['core:playType', 'core:direction', 'core:playConcept'] as const
const TELL_TEMPLATE_OUTCOME_PREFIXES = ['field:select:', 'field:checkbox:', 'field:rating:'] as const
export const TELL_MIN_SNAPS = 5
export const TELL_SMALL_SAMPLE_BELOW = 8
export const TELL_MIN_SHARE = 0.7
export const TELL_MIN_LIFT = 0.15
export const TELL_MAX_RESULTS = 40

export function isTellIndicatorKey(key: string): boolean {
  return TELL_INDICATOR_KEYS.some((candidate) => candidate === key)
}
export function isTellOutcomeKey(key: string): boolean {
  return TELL_CORE_OUTCOME_KEYS.some((candidate) => candidate === key) || TELL_TEMPLATE_OUTCOME_PREFIXES.some((prefix) => key.startsWith(prefix))
}

export interface TellField { readonly key: string; readonly label: string }
/** One Snap projected to a single value per field key. An absent key means no usable value. */
export interface TellSnap { readonly id: string; readonly values: Readonly<Record<string, string>>; readonly yards?: number }
export interface TellPart { key: string; label: string; value: string }
export interface TellBreakdownRow { value: string; snaps: number; avgYards: number | null }
export interface Tell {
  key: string
  indicators: TellPart[]
  outcome: TellPart
  hits: number
  snaps: number
  share: number
  baseline: number
  confidenceFloor: number
  smallSample: boolean
  snapIds: string[]
  breakdown: TellBreakdownRow[]
}

/** Lower bound of the Wilson score interval: the share we are ~95% sure the true rate exceeds. */
export function wilsonLowerBound(hits: number, n: number, z = 1.96): number {
  if (n === 0) return 0
  const p = hits / n
  const z2 = z * z
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n)
}

function tellKey(indicators: readonly TellPart[], outcome: TellPart): string {
  return JSON.stringify([indicators.map(({ key, value }) => [key, value]), [outcome.key, outcome.value]])
}

function breakdownOf(group: readonly TellSnap[], outcomeKey: string): TellBreakdownRow[] {
  const rows = new Map<string, { snaps: number; yards: number; yardsCount: number }>()
  for (const snap of group) {
    const value = snap.values[outcomeKey]
    if (value === undefined) continue
    const row = rows.get(value) ?? { snaps: 0, yards: 0, yardsCount: 0 }
    row.snaps += 1
    if (snap.yards !== undefined && Number.isFinite(snap.yards)) { row.yards += snap.yards; row.yardsCount += 1 }
    rows.set(value, row)
  }
  return [...rows].map(([value, row]) => ({ value, snaps: row.snaps, avgYards: row.yardsCount ? row.yards / row.yardsCount : null }))
    .sort((a, b) => b.snaps - a.snaps || a.value.localeCompare(b.value))
}

export function findTells(snaps: readonly TellSnap[], indicators: readonly TellField[], outcomes: readonly TellField[]): Tell[] {
  const combos: TellField[][] = indicators.flatMap((first, index) => [[first], ...indicators.slice(index + 1).map((second) => [first, second])])
  const found: Tell[] = []
  for (const outcome of outcomes) {
    const charted = snaps.filter((snap) => snap.values[outcome.key] !== undefined)
    const baseline = new Map(breakdownOf(charted, outcome.key).map((row) => [row.value, row.snaps / charted.length]))
    for (const combo of combos) {
      const groups = new Map<string, { values: string[]; snaps: TellSnap[] }>()
      for (const snap of charted) {
        const values = combo.map((field) => snap.values[field.key])
        if (!values.every((value): value is string => value !== undefined)) continue
        const key = JSON.stringify(values)
        const group = groups.get(key)
        if (group) group.snaps.push(snap)
        else groups.set(key, { values, snaps: [snap] })
      }
      for (const group of groups.values()) {
        if (group.snaps.length < TELL_MIN_SNAPS) continue
        const breakdown = breakdownOf(group.snaps, outcome.key)
        const top = breakdown[0]
        if (!top) continue
        const share = top.snaps / group.snaps.length
        const base = baseline.get(top.value) ?? 0
        if (share < TELL_MIN_SHARE || share - base < TELL_MIN_LIFT) continue
        const parts = combo.map((field, index) => ({ key: field.key, label: field.label, value: group.values[index] ?? '' }))
        const outcomePart = { key: outcome.key, label: outcome.label, value: top.value }
        found.push({
          key: tellKey(parts, outcomePart), indicators: parts, outcome: outcomePart,
          hits: top.snaps, snaps: group.snaps.length, share, baseline: base,
          confidenceFloor: wilsonLowerBound(top.snaps, group.snaps.length),
          smallSample: group.snaps.length < TELL_SMALL_SAMPLE_BELOW,
          snapIds: group.snaps.map((snap) => snap.id), breakdown,
        })
      }
    }
  }
  const singles = new Map(found.filter((tell) => tell.indicators.length === 1).map((tell) => [tell.key, tell.share]))
  return found
    .filter((tell) => tell.indicators.length === 1 || !tell.indicators.some((part) => (singles.get(tellKey([part], tell.outcome)) ?? -1) >= tell.share))
    .sort((a, b) => (b.confidenceFloor - b.baseline) - (a.confidenceFloor - a.baseline) || b.snaps - a.snaps || a.key.localeCompare(b.key))
    .slice(0, TELL_MAX_RESULTS)
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --experimental-strip-types --test convex/domain/tells.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite and the typecheck**

Run: `npm test && npm run typecheck`
Expected: every test passes and there are no type errors.

- [ ] **Step 6: Commit**

```bash
git add convex/domain/tells.ts convex/domain/tells.test.ts
git commit -m "feat(tells): add deterministic Tell Finder domain function"
```

### Task 3: `tells.list` query and `tells.promote` mutation

**Files:**
- Modify: `convex/tendencies.ts:14-31` (export three helpers)
- Create: `convex/tells.ts`

- [ ] **Step 1: Export the validation helpers in `convex/tendencies.ts`**

Change `function requireTitle` → `export function requireTitle`, `function requireNote` → `export function requireNote`, and `async function requireCategory` → `export async function requireCategory`. Nothing else changes.

- [ ] **Step 2: Create `convex/tells.ts`**

```ts
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { groupingFieldsFor, groupingValuesOf, NONE_GROUP, templateGroupingKey } from './domain/aggregate.ts'
import { findTells, isTellIndicatorKey, isTellOutcomeKey, type Tell, type TellSnap } from './domain/tells.ts'
import { loadScope, type OpponentScope } from './opponentData'
import schema from './schema'
import { requireCategory, requireNote, requireTitle } from './tendencies'
import { requireLiveWorkspace } from './workspaces'

const odkArg = schema.tables.snaps.validator.fields.core.fields.odk
type Odk = Doc<'snaps'>['core']['odk']
const partValidator = v.object({ key: v.string(), label: v.string(), value: v.string() })
const tellValidator = v.object({
  key: v.string(), indicators: v.array(partValidator), outcome: partValidator,
  hits: v.number(), snaps: v.number(), share: v.number(), baseline: v.number(), confidenceFloor: v.number(), smallSample: v.boolean(),
  snapIds: v.array(v.string()),
  breakdown: v.array(v.object({ value: v.string(), snaps: v.number(), avgYards: v.union(v.number(), v.null()) })),
  clipLabels: v.array(v.string()),
})

async function computeTells(ctx: QueryCtx, workspaceId: Id<'workspaces'>, odk: Odk): Promise<{ scope: OpponentScope; tells: Tell[] } | null> {
  const scope = await loadScope(ctx, workspaceId)
  if (!scope) return null
  const catalog = groupingFieldsFor([...scope.templateFields.values()])
  const indicators = catalog.filter((field) => isTellIndicatorKey(field.key))
  const outcomes = catalog.filter((field) => isTellOutcomeKey(field.key))
  const fields = [...indicators, ...outcomes]
  const templateIds = new Map(scope.games.map((game) => [game._id, fields.map((field) =>
    scope.templateFields.get(game._id)?.find((candidate) => templateGroupingKey(candidate) === field.key)?._id)]))
  const snaps: TellSnap[] = scope.snaps.filter((snap) => odk === undefined || snap.core.odk === odk).map((snap) => {
    const values: Record<string, string> = {}
    fields.forEach((field, index) => {
      const found = groupingValuesOf(snap, field, templateIds.get(snap.sourceGameId)?.[index])
      // ponytail: multi-value fields are excluded (plan A2); count each value separately if coaches need them.
      if (found.length === 1 && found[0] !== undefined && found[0] !== NONE_GROUP) values[field.key] = found[0]
    })
    return { id: snap._id, values, ...(snap.core.yards !== undefined ? { yards: snap.core.yards } : {}) }
  })
  return { scope, tells: findTells(snaps, indicators, outcomes) }
}

export const list = query({
  args: { workspaceId: v.string(), odk: odkArg }, returns: v.array(tellValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    const computed = id ? await computeTells(ctx, id, args.odk) : null
    if (!computed) return []
    const games = new Map(computed.scope.games.map((game) => [game._id, game.label]))
    const snaps = new Map<string, Doc<'snaps'>>(computed.scope.snaps.map((snap) => [snap._id, snap]))
    return computed.tells.map((tell) => ({ ...tell, clipLabels: tell.snapIds.map((snapId) => {
      const snap = snaps.get(snapId)
      return snap ? `${games.get(snap.sourceGameId) ?? ''} #${snap.core.clipNumber ?? snap.order}` : ''
    }) }))
  },
})

export const promote = mutation({
  args: { workspaceId: v.id('workspaces'), odk: odkArg, tellKey: v.string(), title: v.string(), category: v.string(), note: v.string() },
  returns: v.id('tendencies'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    const title = requireTitle(args.title)
    const note = requireNote(args.note)
    const category = await requireCategory(ctx, args.category)
    const computed = await computeTells(ctx, args.workspaceId, args.odk)
    const tell = computed?.tells.find((candidate) => candidate.key === args.tellKey)
    if (!computed || !tell) throw new Error('That Tell changed. Review the updated list and try again.')
    const indicatorValue = tell.indicators.map((part) => part.value).join(' · ')
    return ctx.db.insert('tendencies', {
      workspaceId: args.workspaceId, title, note, category, includeInReport: true, createdAt: Date.now(),
      snapshot: {
        gameIds: computed.scope.games.map((game) => game._id),
        groupBy: tell.indicators.map((part) => part.label).join(' + '), groupBy2: tell.outcome.label,
        // Plan T7: frequency is the share inside the indicator group, not over all Snaps.
        rows: tell.breakdown.map((row) => ({ values: [indicatorValue, row.value], snaps: row.snaps, frequency: row.snaps / tell.snaps, avgYards: row.avgYards })),
      },
    })
  },
})
```

- [ ] **Step 3: Typecheck and push to the dev deployment**

Run: `npm run typecheck && npx convex dev --once`
Expected: no type errors, and Convex reports the functions as deployed, with `tells:list` and `tells:promote` listed.

- [ ] **Step 4: Smoke test against real data**

Run: `npx convex run tells:list '{"workspaceId":"<a workspace id with charted snaps>"}'`
Expected: a JSON array. Every entry has `snaps >= 5`, `share >= 0.7`, and `share - baseline >= 0.15`, and `clipLabels.length === snapIds.length`. An empty array is valid if the Workspace has fewer than 10 charted snaps.

- [ ] **Step 5: Commit**

```bash
git add convex/tendencies.ts convex/tells.ts
git commit -m "feat(tells): add list query and promote-to-Tendency mutation"
```

---

## Chunk 2: UI

### Task 4: Save Tell dialog

**Files:**
- Create: `src/features/tells/save-tell-dialog.tsx`

- [ ] **Step 1: Create the dialog, modeled on `src/features/opponent-data/create-tendency-dialog.tsx`**

```tsx
import { useId, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ODK_VALUES } from '@convex/domain/coreFields'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { TENDENCY_NOTE_MAX_LENGTH } from '@convex/domain/tendencyCategories'
import { TendencyCategorySelect } from '@/components/tendency-category-select'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

export type TellRow = FunctionReturnType<typeof api.tells.list>[number]
export type Odk = (typeof ODK_VALUES)[number]

export function defaultTellTitle(tell: TellRow): string {
  return `${tell.indicators.map((part) => part.value).join(' + ')}: ${tell.outcome.value} ${tell.hits}/${tell.snaps}`.slice(0, NAME_MAX_LENGTH)
}

export function SaveTellDialog({ open, onOpenChange, workspaceId, odk, tell }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void
  readonly workspaceId: Id<'workspaces'>; readonly odk: Odk | undefined; readonly tell: TellRow
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const promote = useMutation(api.tells.promote)
  const [title, setTitle] = useState(defaultTellTitle(tell))
  const [category, setCategory] = useState('Formation')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`} onCancel={(event) => { if (pending) event.preventDefault() }}>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !title.trim()) return
      setPending(true); setError('')
      void promote({ workspaceId, ...(odk ? { odk } : {}), tellKey: tell.key, title, category, note }).then(() => {
        show({ message: 'Saved Tell as a Tendency / Alert' }); onOpenChange(false)
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setError(message); show({ message })
      }).finally(() => setPending(false))
    }}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Save Tell as Tendency / Alert</h2>
      <p className="text-sm">{tell.hits} of {tell.snaps} snaps ({Math.round(tell.share * 100)}%). All snaps: {Math.round(tell.baseline * 100)}%.</p>
      <fieldset disabled={pending} className="grid gap-3">
        <div><label htmlFor={`${id}-title`}>Title</label><Input id={`${id}-title`} autoFocus maxLength={NAME_MAX_LENGTH} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div><label htmlFor={`${id}-category`}>Category</label><TendencyCategorySelect id={`${id}-category`} value={category} onChange={setCategory} /></div>
        <div><label htmlFor={`${id}-note`}>Coach explanation</label><Textarea id={`${id}-note`} maxLength={TENDENCY_NOTE_MAX_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} /></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={pending || !title.trim()}>Save</Button><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button></div>
    </form>
  </Dialog>
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tells/save-tell-dialog.tsx
git commit -m "feat(tells): add Save Tell as Tendency dialog"
```

### Task 5: Tells page, route, and workspace tab

**Files:**
- Create: `src/features/tells/tells.tsx`
- Create: `src/routes/tells-page.tsx`
- Modify: `src/routes/routes.tsx` (import, plus a child route after `{ path: 'data', ... }`)
- Modify: `src/components/workspace-header.tsx:12-17` (`WORKSPACE_TABS`)

- [ ] **Step 1: Create `src/features/tells/tells.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatFrequency } from '@convex/domain/aggregate'
import { ODK_VALUES } from '@convex/domain/coreFields'
import { TELL_MIN_SNAPS } from '@convex/domain/tells'
import { Button } from '@/components/ui/button'
import { Chip, Meta, Page, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { SaveTellDialog, type Odk, type TellRow } from './save-tell-dialog'

export function Tells({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const [odk, setOdk] = useState<Odk | undefined>(undefined)
  const [saving, setSaving] = useState<TellRow | null>(null)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const tells = useQuery(api.tells.list, { workspaceId, ...(odk ? { odk } : {}) })
  if (workspace === undefined || tells === undefined) return <div role="status" aria-label="Loading Tells" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">Tells</h1><Meta>{tells.length} found</Meta>
      <label className="ml-auto flex items-center gap-2 text-sm">ODK
        <Select className="w-28" value={odk ?? ''} onChange={(event) => setOdk(ODK_VALUES.find((value) => value === event.target.value))}>
          <option value="">All</option>{ODK_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
      </label>
    </header>
    <p className="text-sm">Pre-snap looks that predict what comes next. A Tell needs at least {TELL_MIN_SNAPS} snaps. These are counts only, so confirm on film before you coach it.</p>
    {tells.length === 0
      ? <p>No Tells yet. Chart more snaps, or choose a different ODK.</p>
      : <ol className="grid gap-3">{tells.map((tell) => <li key={tell.key}><TellCard tell={tell} onSave={() => setSaving(tell)} /></li>)}</ol>}
    {saving && <SaveTellDialog open onOpenChange={(open) => { if (!open) setSaving(null) }} workspaceId={workspace._id} odk={odk} tell={saving} />}
  </Page>
}

function TellCard({ tell, onSave }: { readonly tell: TellRow; readonly onSave: () => void }): ReactNode {
  return <Panel className="grid gap-2 p-4">
    <p className="font-semibold">{tell.indicators.map((part) => `${part.label}: ${part.value}`).join(' + ')} → {tell.outcome.label}: {tell.outcome.value}</p>
    <p className="flex flex-wrap items-center gap-2 text-sm">{tell.hits} of {tell.snaps} snaps ({formatFrequency(tell.share)}). All snaps: {formatFrequency(tell.baseline)}.{tell.smallSample && <Chip>Small sample</Chip>}</p>
    <details>
      <summary className="cursor-pointer text-sm">Evidence</summary>
      <ul className="text-sm">{tell.breakdown.map((row) => <li key={row.value}>{row.value}: {row.snaps}</li>)}</ul>
      <p className="font-mono text-xs">{tell.clipLabels.join(', ')}</p>
    </details>
    <div><Button size="sm" variant="outline" onClick={onSave}>Save as Tendency</Button></div>
  </Panel>
}
```

- [ ] **Step 2: Create `src/routes/tells-page.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { Tells } from '@/features/tells/tells'

export function TellsPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <Tells workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
```

- [ ] **Step 3: Register the route**

In `src/routes/routes.tsx`, add `import { TellsPage } from './tells-page'` and insert `{ path: 'tells', element: <TellsPage /> },` directly after `{ path: 'data', element: <OpponentDataPage /> },`.

- [ ] **Step 4: Add the tab**

In `src/components/workspace-header.tsx`, insert `{ segment: 'tells', label: 'Tells' },` between the `data` and `tendencies` entries of `WORKSPACE_TABS`.

- [ ] **Step 5: Typecheck, test, build**

Run: `npm run build`
Expected: typecheck passes, all `node --test` suites pass, and electron-vite finishes the build.

- [ ] **Step 6: Verify in the running app with the fixture**

Setup:
1. Run `npx convex dev` in one terminal and `npm run dev` in another.
2. Create a throwaway opponent, **Test Opp**, and add a Source Game.
3. Import `.claude/plans/fixtures/tell-finder-fixture.csv` with the ODK filter set to **All**. Expect 44 snaps.

Fixture contents (every row is 1st & 10):

| Plays | ODK | Formation | Hash | Play Type |
|---|---|---|---|---|
| 1–11 | O | Trips Rt | blank | Pass |
| 12 | O | Trips Rt | blank | Run |
| 13–18 / 19–24 | O | Pro | Left / Right | Run |
| 25–29 / 30–34 | O | Ace | Left / Right | Pass / Run |
| 35–38 | O | Empty | Middle | Pass |
| 39–44 | D | 4-3 | blank | Run |

Checks:
1. **Tells tab, ODK = O.** Exactly these four, in this order:
   | # | Tell | Count | All snaps |
   |---|---|---|---|
   | 1 | Formation: Pro → Run | 12 of 12 | 47% |
   | 2 | Hash: Right → Run | 11 of 11 | 47% |
   | 3 | Formation: Trips Rt → Pass | 11 of 12 | 53% |
   | 4 | Formation: Ace + Hash: Left → Pass, Small sample | 5 of 5 | 53% |
2. **Absent on purpose:** Empty (4 snaps, below the minimum); Ace + Right (Hash: Right already explains it); Pro + Left and Pro + Right (Formation: Pro already explains them); anything about 1st Down (no variation).
3. **ODK = All.** A fifth Tell appears, "Formation: 4-3 → Run, 6 of 6, Small sample". Baselines become 55% Run and 45% Pass.
4. **Evidence on the Trips Tell:** breakdown Pass 11 and Run 1, plus 12 clip labels (#1–#12).
5. **Save as Tendency, then Save:** a toast confirms it. On Tendencies / Alerts, the card shows "Formation" / "Play Type" with rows Trips Rt / Pass 92% and Trips Rt / Run 8%.
6. **Stale save:** open Save on the Ace + Left Tell, change play #25 to Run in the Play Log, then click Save. It shows "That Tell changed…", and the Tell leaves the list.
7. **Keyboard:** Tab reaches the ODK select, Evidence, and Save; Escape closes the dialog.
8. **Cleanup:** delete the Test Opp workspace.

- [ ] **Step 7: Commit**

```bash
git add src/features/tells/tells.tsx src/routes/tells-page.tsx src/routes/routes.tsx src/components/workspace-header.tsx
git commit -m "feat(tells): add Tells tab with evidence and save-to-Tendency"
```

---

## Out of scope for this plan

- Coach-adjustable thresholds (T4). Add these to `settings` if coaches ask.
- Triple-indicator combinations (T3).
- Linking a Tell to a filtered Play Log view. The Play Log has no snap-id filter today.
- Self-Scout mode. It reuses this feature through a Workspace `kind` flag in a later plan.
