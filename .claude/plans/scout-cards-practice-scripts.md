# Scout Cards and Practice Scripts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Execute tasks in order; each task leaves `npm run typecheck` passing.

**Goal:** A new **Practice** tab in the Weekly Opponent Workspace. The coach builds a Practice Script from the Workspace's Play Diagrams. Reps are weighted by how often the opponent ran each play, and each rep defaults to a real down, distance, and hash from film. The coach can then export two PDFs: the Script sheet and a numbered set of full-page Scout Cards.

**Architecture:** One new table, `practiceScripts`, holds named periods of reps. Each rep points at a Play Diagram. Scout Cards are not stored. They are a print view of the distinct Play Diagrams in a Script, numbered in order of first appearance. The pure logic (rep allocation, interleaving, situation defaults, card numbering, validation, card facts) lives in `convex/domain/practiceScript.ts` and is covered by `node --test`. The editor autosaves the whole `periods` array through one mutation (blueprint D5). Both PDFs reuse the existing `printToPDF` IPC (D6), with its allowed-route check widened.

**Tech Stack:** Convex, React 19 + TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), react-router hash routes, Electron `printToPDF`, `node --test`.

---

## Decisions

| # | Decision | Rationale | Reversibility |
|---|---|---|---|
| S1 | A **Practice Script** is the only new entity. **Scout Cards** are derived from a Script's reps. | Cards and script numbers always agree ("Rep 4: Card 7"). There is no second list to keep in sync. | Easy |
| S2 | A card's **weight** is the number of live, included Snaps attached to its Play Diagram. | This is the same frequency the coach charted. It needs no new data entry. A diagram with no attached Snaps has weight 0. | Easy |
| S3 | Reps are allocated by the largest-remainder method. If every selected card has weight 0, reps are split evenly. | The counts always sum exactly to the requested total, and the result is deterministic. | Easy |
| S4 | Rep order is interleaved: the next rep comes from the card with the most reps left, avoiding back-to-back repeats where possible. Ties go to the earlier card. | The scout team does not run the same look five times in a row. | Easy |
| S5 | Each rep's down, distance, and hash default to the card's attached Snaps, in order, cycling. The coach can edit every rep. | Reps look like the situations seen on film. | Easy |
| S6 | The editor autosaves the whole `periods` array with one `savePeriods` mutation. An empty period name is saved as `Period N` rather than rejected. | This matches autosave D5. The coach never loses typing to a validation error on a name. | Easy |
| S7 | PDFs reuse the `report:export-pdf` IPC. Its route check allows `/w/:id/practice/:scriptId/print` and `/cards`. Scout Cards print in landscape through an inline `@page` rule. | No new IPC surface and no new dependency. | Easy |
| S8 | A rep keeps its `diagramId` when the diagram is soft-deleted. The editor shows "Deleted Play Diagram", print skips the rep, and Undo restores it. `get` drops reps whose diagram has been purged. | This matches D12 soft-delete and Undo semantics, and avoids a permanently failing autosave after a purge. | Easy |
| S9 | Scout Cards respect the diagram's `hiddenSide`, the same as the gallery and report blocks. | The coach already chose what the card should show. | Easy |

## Assumptions

| # | Assumption | Consequence if wrong |
|---|---|---|
| A1 | Coaches draw a Play Diagram for each opponent look they want the scout team to run. | If they don't, the Script has no cards. The empty state tells them to draw diagrams from a Source Game's Play Diagrams tab. |
| A2 | 12 periods × 60 reps (720 reps) is enough for one week. | Raise `PRACTICE_SCRIPT_MAX_PERIODS` or `PRACTICE_PERIOD_MAX_REPS`. The document size stays far below Convex limits. |
| A3 | One Scout Card per landscape letter page is the right size for a scout team to read from the huddle. | If they want two per page, change the section height to `3.7in` in `scout-cards-print.tsx`. |
| A4 | Hudl CSV exports rarely include hash for some teams. | Those reps have a blank hash, and the coach fills it in. |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Deletion Undo and the purge cron may not know the new table. | Task 3 adds `practiceScripts` to `softDeleteTables` and to the Workspace cascade, then greps `deletions.ts` to confirm both paths iterate `softDeleteTables`. |
| R2 | Autosave of an invalid value (for example distance 150) keeps failing. | The inputs have `min`/`max`, and the header shows "Not saved" when autosave status is `error`. |
| R3 | The inline `@page` landscape rule leaks into other pages. | The `<style>` element exists only while the Scout Cards route is mounted. HashRouter unmounts it on navigation. |
| R4 | Widening the IPC route regex allows PDF export from unintended pages. | The regex stays anchored and lists exactly three route shapes. |

## Files

| File | Change |
|---|---|
| `convex/domain/practiceScript.ts` | Create. Constants, `allocateReps`, `interleave`, `buildReps`, `patchRep`, `cardNumbers`, `validatePeriods`, `cardFacts`, `cardTitle`, `formatDownDistance`. |
| `convex/domain/practiceScript.test.ts` | Create. `node --test` coverage. |
| `convex/schema.ts` | Modify. Add the `practiceScripts` table. |
| `convex/deletions.ts` | Modify. Add `'practiceScripts'` to `softDeleteTables`. |
| `convex/workspaces.ts` | Modify. Add `'practiceScripts'` to the `collectWorkspaceCascade` table list. |
| `convex/reports.ts` | Modify. Export `liveWorkspace`. |
| `convex/practiceScripts.ts` | Create. `list`, `get`, `cards`, `create`, `rename`, `savePeriods`, `remove`. |
| `electron/main.ts` | Modify. Widen the allowed PDF routes. |
| `src/lib/use-pdf-export.ts` | Create. Shared export hook for the two print pages. |
| `src/features/practice/script-list.tsx` | Create. |
| `src/features/practice/script-editor.tsx` | Create. Editor and period table. |
| `src/features/practice/add-period-dialog.tsx` | Create. |
| `src/features/practice/script-print.tsx` | Create. Script sheet PDF view. |
| `src/features/practice/scout-cards-print.tsx` | Create. Scout Cards PDF view. |
| `src/routes/practice-pages.tsx` | Create. Four route wrappers. |
| `src/routes/routes.tsx`, `src/components/workspace-header.tsx` | Modify. Add the routes and the Practice tab. |
| `ubiquitous-language.md` | Modify. Define Practice Script, Period, Rep, and Scout Card. |

---

## Chunk 1: Domain

### Task 1: Terms

**Files:**
- Modify: `ubiquitous-language.md` (the `## Reporting` section)

- [ ] **Step 1: Add the terms**

```markdown
- **Practice Script** — A named, ordered list of Periods for one Weekly Opponent Workspace. Printed as a
  Script sheet for coaches and as Scout Cards for the scout team.
- **Period** — A named block of Reps inside a Practice Script (for example "Team D vs Scout O").
- **Rep** — One scripted play: a Scout Card plus optional down, distance, hash, and note.
- **Scout Card** — A full-page print of one Play Diagram used in a Practice Script. It is numbered by the diagram's
  first appearance in the Script and shows the opponent's most common formation, personnel, concept,
  situation, hash, and field zone for that play.
```

- [ ] **Step 2: Commit**

```bash
git add ubiquitous-language.md
git commit -m "docs(practice): define Practice Script, Period, Rep, Scout Card"
```

### Task 2: Practice Script domain functions (TDD)

**Files:**
- Create: `convex/domain/practiceScript.test.ts`
- Create: `convex/domain/practiceScript.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  allocateReps, buildReps, cardFacts, cardNumbers, cardTitle, formatDownDistance, interleave, patchRep,
  PRACTICE_PERIOD_MAX_REPS, validatePeriods, type ScriptPeriod,
} from './practiceScript.ts'

test('allocateReps is proportional and always sums to the total', () => {
  assert.deepEqual(allocateReps([3, 1], 12), [9, 3])
  assert.deepEqual(allocateReps([1, 1, 1], 10), [4, 3, 3])
  assert.deepEqual(allocateReps([5, 0], 4), [4, 0])
  assert.deepEqual(allocateReps([7, 2, 1], 0), [0, 0, 0])
  assert.deepEqual(allocateReps([], 5), [])
})

test('allocateReps splits evenly when every weight is zero', () => {
  assert.deepEqual(allocateReps([0, 0], 5), [3, 2])
})

test('allocateReps rejects negative or fractional totals', () => {
  assert.throws(() => allocateReps([1], -1))
  assert.throws(() => allocateReps([1], 2.5))
})

test('interleave avoids back-to-back repeats when it can', () => {
  assert.deepEqual(interleave([2, 2]), [0, 1, 0, 1])
  assert.deepEqual(interleave([3, 1]), [0, 1, 0, 0])
  assert.deepEqual(interleave([2, 3]), [1, 0, 1, 0, 1])
  assert.deepEqual(interleave([0, 0]), [])
})

test('buildReps cycles each card through its film situations', () => {
  let id = 0
  const reps = buildReps([
    { diagramId: 'a', weight: 3, situations: [{ down: 1, distance: 10, hash: 'Left' }, { down: 3, distance: 7 }] },
    { diagramId: 'b', weight: 1, situations: [] },
  ], 4, () => `r${id++}`)
  assert.deepEqual(reps.map((rep) => rep.diagramId), ['a', 'b', 'a', 'a'])
  assert.deepEqual(reps.filter((rep) => rep.diagramId === 'a').map((rep) => [rep.down, rep.distance, rep.hash]),
    [[1, 10, 'Left'], [3, 7, undefined], [1, 10, 'Left']])
  assert.equal('down' in (reps[1] ?? {}), false)
  assert.deepEqual(reps.map((rep) => rep.id), ['r0', 'r1', 'r2', 'r3'])
})

test('patchRep sets and clears optional fields without leaving undefined keys', () => {
  const rep = { id: 'r', diagramId: 'a', down: 2, distance: 5, hash: 'Left' as const }
  const cleared = patchRep(rep, { down: undefined, note: 'Watch the H' })
  assert.deepEqual(cleared, { id: 'r', diagramId: 'a', distance: 5, hash: 'Left', note: 'Watch the H' })
  assert.equal('down' in cleared, false)
  assert.equal(patchRep(rep, { diagramId: 'b' }).diagramId, 'b')
})

test('cardNumbers numbers live cards by first appearance', () => {
  const periods: ScriptPeriod[] = [
    { id: 'p1', name: 'One', reps: [{ id: '1', diagramId: 'b' }, { id: '2', diagramId: 'x' }, { id: '3', diagramId: 'a' }] },
    { id: 'p2', name: 'Two', reps: [{ id: '4', diagramId: 'a' }, { id: '5', diagramId: 'c' }] },
  ]
  assert.deepEqual([...cardNumbers(periods, (id) => id !== 'x')], [['b', 1], ['a', 2], ['c', 3]])
})

test('validatePeriods normalizes names, trims notes, and rejects bad values', () => {
  const [period] = validatePeriods([{ id: 'p', name: '  ', reps: [{ id: 'r', diagramId: 'a', note: '  ' }] }])
  assert.equal(period?.name, 'Period 1')
  assert.deepEqual(period?.reps[0], { id: 'r', diagramId: 'a' })
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: [{ id: 'r', diagramId: 'a', down: 5 }] }]), /Down/)
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: [{ id: 'r', diagramId: 'a', distance: 100 }] }]), /Distance/)
  const tooMany = Array.from({ length: PRACTICE_PERIOD_MAX_REPS + 1 }, (_, index) => ({ id: String(index), diagramId: 'a' }))
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: tooMany }]), /at most/)
})

test('cardFacts reports the most common value per field; cardTitle falls back to facts', () => {
  const facts = cardFacts([
    { formation: 'Trips Rt', playConcept: 'Mesh', hash: 'Left' },
    { formation: 'Trips Rt', playConcept: 'Mesh', hash: 'Right' },
    { formation: 'Deuce', hash: 'Left', situation: '3rd & Long' },
  ])
  assert.equal(facts.snaps, 3)
  assert.deepEqual(facts.top.find((fact) => fact.label === 'Formation'), { label: 'Formation', value: 'Trips Rt', count: 2 })
  assert.deepEqual(facts.top.find((fact) => fact.label === 'Hash'), { label: 'Hash', value: 'Left', count: 2 })
  assert.equal(facts.top.some((fact) => fact.label === 'Personnel'), false)
  assert.equal(cardTitle('  Y Stick ', facts), 'Y Stick')
  assert.equal(cardTitle(undefined, facts), 'Trips Rt Mesh')
  assert.equal(cardTitle(undefined, cardFacts([])), 'Play Diagram')
})

test('formatDownDistance', () => {
  assert.equal(formatDownDistance(3, 7), '3rd & 7')
  assert.equal(formatDownDistance(1, undefined), '1st')
  assert.equal(formatDownDistance(undefined, 10), '')
  assert.equal(formatDownDistance(5, 1), '')
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --experimental-strip-types --test convex/domain/practiceScript.test.ts`
Expected: FAIL with `Cannot find module '.../convex/domain/practiceScript.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
import type { HASHES } from './coreFields.ts'
import { normalizeName } from './names.ts'

export const PRACTICE_SCRIPT_MAX_PERIODS = 12
export const PRACTICE_PERIOD_MAX_REPS = 60
export const PRACTICE_REP_NOTE_MAX_LENGTH = 120
export type Hash = (typeof HASHES)[number]

export interface RepSituation { readonly down?: number | undefined; readonly distance?: number | undefined; readonly hash?: Hash | undefined }
export interface ScriptRep<Id extends string = string> { id: string; diagramId: Id; down?: number; distance?: number; hash?: Hash; note?: string }
export interface ScriptPeriod<Id extends string = string> { id: string; name: string; reps: ScriptRep<Id>[] }
export interface RepSource<Id extends string = string> { readonly diagramId: Id; readonly weight: number; readonly situations: readonly RepSituation[] }
export interface RepPatch<Id extends string = string> {
  readonly diagramId?: Id; readonly down?: number | undefined; readonly distance?: number | undefined
  readonly hash?: Hash | undefined; readonly note?: string | undefined
}

/** Largest-remainder allocation. Sums exactly to `total`; ties go to the earlier index. All-zero weights split evenly. */
export function allocateReps(weights: readonly number[], total: number): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error('Rep count must be a whole number of 0 or more')
  const clean = weights.map((weight) => Number.isFinite(weight) && weight > 0 ? weight : 0)
  const sum = clean.reduce((a, b) => a + b, 0)
  const basis = sum > 0 ? clean : clean.map(() => 1)
  const basisSum = sum > 0 ? sum : clean.length
  if (basisSum === 0) return []
  const exact = basis.map((weight) => weight * total / basisSum)
  const counts = exact.map(Math.floor)
  let remaining = total - counts.reduce((a, b) => a + b, 0)
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of order) {
    if (remaining === 0) break
    counts[index] = (counts[index] ?? 0) + 1
    remaining -= 1
  }
  return counts
}

/** Sequence of indexes: always the index with the most left, never the same twice in a row unless it is the only one left. */
export function interleave(counts: readonly number[]): number[] {
  const left = [...counts]
  const sequence: number[] = []
  let previous = -1
  for (;;) {
    let pick = -1
    for (let index = 0; index < left.length; index += 1) {
      const count = left[index] ?? 0
      if (count > 0 && index !== previous && (pick === -1 || count > (left[pick] ?? 0))) pick = index
    }
    if (pick === -1 && (left[previous] ?? 0) > 0) pick = previous
    if (pick === -1) return sequence
    sequence.push(pick)
    left[pick] = (left[pick] ?? 0) - 1
    previous = pick
  }
}

function situationFields(situation: RepSituation | undefined): Pick<ScriptRep, 'down' | 'distance' | 'hash'> {
  return {
    ...(situation?.down !== undefined ? { down: situation.down } : {}),
    ...(situation?.distance !== undefined ? { distance: situation.distance } : {}),
    ...(situation?.hash !== undefined ? { hash: situation.hash } : {}),
  }
}

export function buildReps<Id extends string>(sources: readonly RepSource<Id>[], total: number, newId: () => string): ScriptRep<Id>[] {
  const used = sources.map(() => 0)
  return interleave(allocateReps(sources.map((source) => source.weight), total)).flatMap((index) => {
    const source = sources[index]
    if (!source) return []
    const turn = used[index] ?? 0
    used[index] = turn + 1
    const situation = source.situations.length ? source.situations[turn % source.situations.length] : undefined
    return [{ id: newId(), diagramId: source.diagramId, ...situationFields(situation) }]
  })
}

export function patchRep<Id extends string>(rep: ScriptRep<Id>, patch: RepPatch<Id>): ScriptRep<Id> {
  const merged = { ...rep, ...patch }
  return {
    id: rep.id, diagramId: patch.diagramId ?? rep.diagramId, ...situationFields(merged),
    ...(merged.note !== undefined ? { note: merged.note } : {}),
  }
}

export function cardNumbers<Id extends string>(periods: readonly ScriptPeriod<Id>[], isLive: (id: Id) => boolean): Map<Id, number> {
  const numbers = new Map<Id, number>()
  for (const period of periods) for (const rep of period.reps) {
    if (isLive(rep.diagramId) && !numbers.has(rep.diagramId)) numbers.set(rep.diagramId, numbers.size + 1)
  }
  return numbers
}

export function validatePeriods<Id extends string>(periods: readonly ScriptPeriod<Id>[]): ScriptPeriod<Id>[] {
  if (periods.length > PRACTICE_SCRIPT_MAX_PERIODS) throw new Error(`A Practice Script has at most ${PRACTICE_SCRIPT_MAX_PERIODS} periods`)
  return periods.map((period, index) => {
    if (period.reps.length > PRACTICE_PERIOD_MAX_REPS) throw new Error(`A period has at most ${PRACTICE_PERIOD_MAX_REPS} reps`)
    return {
      id: period.id,
      // Plan S6: an empty name while typing is saved as a default, never rejected.
      name: normalizeName(period.name) ?? `Period ${index + 1}`,
      reps: period.reps.map((rep) => {
        if (rep.down !== undefined && (!Number.isInteger(rep.down) || rep.down < 1 || rep.down > 4)) throw new Error('Down must be 1–4')
        if (rep.distance !== undefined && (!Number.isInteger(rep.distance) || rep.distance < 0 || rep.distance > 99)) throw new Error('Distance must be 0–99')
        const note = rep.note?.trim()
        if (note && note.length > PRACTICE_REP_NOTE_MAX_LENGTH) throw new Error(`Rep note must be at most ${PRACTICE_REP_NOTE_MAX_LENGTH} characters`)
        return { id: rep.id, diagramId: rep.diagramId, ...situationFields(rep), ...(note ? { note } : {}) }
      }),
    }
  })
}

export interface FactSnap {
  readonly formation?: string | undefined; readonly personnel?: string | undefined; readonly playConcept?: string | undefined
  readonly situation?: string | undefined; readonly hash?: string | undefined; readonly fieldZone?: string | undefined
}
export interface CardFacts { snaps: number; top: { label: string; value: string; count: number }[] }
const FACT_FIELDS = [
  ['formation', 'Formation'], ['personnel', 'Personnel'], ['playConcept', 'Concept'],
  ['situation', 'Situation'], ['hash', 'Hash'], ['fieldZone', 'Field Zone'],
] as const

export function cardFacts(snaps: readonly FactSnap[]): CardFacts {
  const top = FACT_FIELDS.flatMap(([key, label]) => {
    const counts = new Map<string, number>()
    for (const snap of snaps) {
      const value = snap[key]?.trim()
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    const best = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    return best ? [{ label, value: best[0], count: best[1] }] : []
  })
  return { snaps: snaps.length, top }
}

export function cardTitle(name: string | undefined, facts: CardFacts): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  const pick = (label: string): string | undefined => facts.top.find((fact) => fact.label === label)?.value
  return [pick('Formation'), pick('Concept')].filter(Boolean).join(' ') || 'Play Diagram'
}

const ORDINALS = ['1st', '2nd', '3rd', '4th'] as const
export function formatDownDistance(down?: number, distance?: number): string {
  const ordinal = down === undefined ? undefined : ORDINALS[down - 1]
  if (!ordinal) return ''
  return distance === undefined ? ordinal : `${ordinal} & ${distance}`
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --experimental-strip-types --test convex/domain/practiceScript.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the whole suite and the typecheck**

Run: `npm test && npm run typecheck`
Expected: every test passes and there are no type errors.

- [ ] **Step 6: Commit**

```bash
git add convex/domain/practiceScript.ts convex/domain/practiceScript.test.ts
git commit -m "feat(practice): add rep allocation, interleave, and card facts domain"
```

---

## Chunk 2: Backend

### Task 3: Schema, soft delete, and cascade

**Files:**
- Modify: `convex/schema.ts` (after the `reports` table)
- Modify: `convex/deletions.ts:16-31`
- Modify: `convex/workspaces.ts` (`collectWorkspaceCascade` table list)

- [ ] **Step 1: Add the table to `convex/schema.ts`, directly after `reports`**

```ts
  practiceScripts: defineTable({
    workspaceId: v.id('workspaces'),
    name: v.string(),
    periods: v.array(v.object({
      id: v.string(),
      name: v.string(),
      reps: v.array(v.object({
        id: v.string(),
        diagramId: v.id('diagrams'),
        down: v.optional(v.number()),
        distance: v.optional(v.number()),
        hash: v.optional(hashValidator),
        note: v.optional(v.string()),
      })),
    })),
    updatedAt: v.number(),
    ...softDelete,
  }).index('by_workspace', ['workspaceId']).index('by_deleteBatchId', ['deleteBatchId']),
```

- [ ] **Step 2: Register the table for soft delete**

In `convex/deletions.ts`, append `'practiceScripts',` to `softDeleteTables`. In `convex/workspaces.ts` `collectWorkspaceCascade`, change the table list to `['tendencies', 'reports', 'opponentPlayers', 'playerNotes', 'diagrams', 'practiceScripts'] as const`.

- [ ] **Step 3: Confirm Undo and purge iterate `softDeleteTables`**

Run: `grep -n "softDeleteTables\|by_deleteBatchId" convex/deletions.ts`
Expected: `undo` and `purgeExpired` both loop over `softDeleteTables` using the `by_deleteBatchId` index. If either one lists tables by hand, add `practiceScripts` there too.

- [ ] **Step 4: Typecheck and push**

Run: `npm run typecheck && npx convex dev --once`
Expected: no errors, and the schema push succeeds with the new `practiceScripts` table.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/deletions.ts convex/workspaces.ts
git commit -m "feat(practice): add practiceScripts table with soft delete and cascade"
```

### Task 4: `practiceScripts` functions

**Files:**
- Modify: `convex/reports.ts:22` (export `liveWorkspace`)
- Create: `convex/practiceScripts.ts`

- [ ] **Step 1: Export `liveWorkspace` from `convex/reports.ts`**

Change `async function liveWorkspace(` → `export async function liveWorkspace(`.

- [ ] **Step 2: Create `convex/practiceScripts.ts`**

```ts
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { attachedSnapIds } from './domain/diagram.ts'
import { fieldZoneOf, isValidYardLine } from './domain/fieldZone.ts'
import { cardFacts, cardTitle, validatePeriods } from './domain/practiceScript.ts'
import { downDistanceSituationOf } from './domain/situation.ts'
import schema from './schema'
import { softDeleteBatch } from './deletions'
import { liveWorkspace, requireName } from './reports'
import { isIncluded } from './sourceGames'
import { requireLiveWorkspace } from './workspaces'

const scriptFields = schema.tables.practiceScripts.validator.fields
const diagramFields = schema.tables.diagrams.validator.fields
const scriptValidator = v.object({ ...scriptFields, _id: v.id('practiceScripts'), _creationTime: v.number() })
const cardValidator = v.object({
  diagramId: v.id('diagrams'), title: v.string(),
  players: diagramFields.players, shapes: diagramFields.shapes, hiddenSide: diagramFields.hiddenSide,
  weight: v.number(),
  situations: v.array(v.object({ down: v.optional(v.number()), distance: v.optional(v.number()), hash: schema.tables.snaps.validator.fields.core.fields.hash })),
  facts: v.object({ snaps: v.number(), top: v.array(v.object({ label: v.string(), value: v.string(), count: v.number() })) }),
})

async function requireLiveScript(ctx: QueryCtx, id: Id<'practiceScripts'>): Promise<Doc<'practiceScripts'>> {
  const script = await ctx.db.get(id)
  if (!script || script.deletedAt !== undefined) throw new Error('Practice Script not found')
  await requireLiveWorkspace(ctx, script.workspaceId)
  return script
}

export const list = query({
  args: { workspaceId: v.string() }, returns: v.array(scriptValidator),
  handler: async (ctx, args) => {
    const id = await liveWorkspace(ctx, args.workspaceId)
    if (!id) return []
    return (await ctx.db.query('practiceScripts').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((script) => script.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const get = query({
  args: { workspaceId: v.string(), scriptId: v.string() }, returns: v.union(scriptValidator, v.null()),
  handler: async (ctx, args) => {
    const workspaceId = await liveWorkspace(ctx, args.workspaceId)
    const id = ctx.db.normalizeId('practiceScripts', args.scriptId)
    const script = workspaceId && id ? await ctx.db.get(id) : null
    if (!script || script.deletedAt !== undefined || script.workspaceId !== workspaceId) return null
    const exists = new Map<Id<'diagrams'>, boolean>()
    for (const rep of script.periods.flatMap((period) => period.reps)) {
      if (!exists.has(rep.diagramId)) exists.set(rep.diagramId, (await ctx.db.get(rep.diagramId)) !== null)
    }
    // Plan S8: purged Play Diagrams are gone for good, so their reps drop out of the view.
    return { ...script, periods: script.periods.map((period) => ({ ...period, reps: period.reps.filter((rep) => exists.get(rep.diagramId)) })) }
  },
})

/** Every live Play Diagram in the Workspace, as a Scout Card with its film weight and situations. */
export const cards = query({
  args: { workspaceId: v.string() }, returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    const id = await liveWorkspace(ctx, args.workspaceId)
    if (!id) return []
    const liveGames = new Map<Id<'sourceGames'>, boolean>()
    const isLiveGame = async (gameId: Id<'sourceGames'>): Promise<boolean> => {
      if (!liveGames.has(gameId)) {
        const game = await ctx.db.get(gameId)
        liveGames.set(gameId, !!game && game.deletedAt === undefined && isIncluded(game))
      }
      return liveGames.get(gameId) === true
    }
    const diagrams = (await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((diagram) => diagram.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
    return Promise.all(diagrams.map(async (diagram) => {
      const snaps: Doc<'snaps'>[] = []
      for (const snapId of attachedSnapIds(diagram)) {
        const snap = await ctx.db.get(snapId)
        if (snap && snap.deletedAt === undefined && await isLiveGame(snap.sourceGameId)) snaps.push(snap)
      }
      const facts = cardFacts(snaps.map(({ core }) => ({
        formation: core.formation, personnel: core.personnel, playConcept: core.playConcept, hash: core.hash,
        situation: downDistanceSituationOf(core.down, core.distance) ?? undefined,
        fieldZone: isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : undefined,
      })))
      return {
        diagramId: diagram._id, title: cardTitle(diagram.name, facts), players: diagram.players, shapes: diagram.shapes,
        ...(diagram.hiddenSide ? { hiddenSide: diagram.hiddenSide } : {}),
        weight: snaps.length, facts,
        situations: snaps.map(({ core }) => ({
          ...(core.down !== undefined ? { down: core.down } : {}),
          ...(core.distance !== undefined ? { distance: core.distance } : {}),
          ...(core.hash !== undefined ? { hash: core.hash } : {}),
        })),
      }
    }))
  },
})

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), name: v.string() }, returns: v.id('practiceScripts'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    return ctx.db.insert('practiceScripts', { workspaceId: args.workspaceId, name: requireName(args.name), periods: [], updatedAt: Date.now() })
  },
})

export const rename = mutation({
  args: { scriptId: v.id('practiceScripts'), name: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    await ctx.db.patch(script._id, { name: requireName(args.name), updatedAt: Date.now() })
    return null
  },
})

export const savePeriods = mutation({
  args: { scriptId: v.id('practiceScripts'), periods: scriptFields.periods }, returns: v.null(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    const periods = validatePeriods(args.periods)
    for (const diagramId of new Set(periods.flatMap((period) => period.reps.map((rep) => rep.diagramId)))) {
      const diagram = await ctx.db.get(diagramId)
      // Soft-deleted diagrams stay valid so Undo of the diagram restores the rep (plan S8).
      if (!diagram || diagram.workspaceId !== script.workspaceId) throw new Error('Play Diagram not found in this Workspace')
    }
    await ctx.db.patch(script._id, { periods, updatedAt: Date.now() })
    return null
  },
})

export const remove = mutation({
  args: { scriptId: v.id('practiceScripts') }, returns: v.string(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    return softDeleteBatch(ctx, { kind: 'practiceScript', label: script.name, records: [{ table: 'practiceScripts', id: script._id }] })
  },
})
```

- [ ] **Step 3: Typecheck and push**

Run: `npm run typecheck && npx convex dev --once`
Expected: no errors, and the `practiceScripts:*` functions are deployed.

- [ ] **Step 4: Smoke test**

Run: `npx convex run practiceScripts:cards '{"workspaceId":"<a workspace id with Play Diagrams>"}'`
Expected: one entry per live diagram, with `weight` equal to its count of live attached Snaps and `situations.length === weight`.

- [ ] **Step 5: Commit**

```bash
git add convex/reports.ts convex/practiceScripts.ts
git commit -m "feat(practice): add Practice Script queries and mutations"
```

### Task 5: Allow PDF export from the print routes

**Files:**
- Modify: `electron/main.ts:75`
- Create: `src/lib/use-pdf-export.ts`

- [ ] **Step 1: Widen the route check in `exportReportPdf`**

Replace `!/^#\/w\/[^/]+\/reports\/[^/]+\/preview$/.test(url.hash)` with
`!/^#\/w\/[^/]+\/(reports\/[^/]+\/preview|practice\/[^/]+\/(print|cards))$/.test(url.hash)`,
and change the error message `'Open a Report Preview to export PDF'` to `'Open a printable page to export PDF'`.

- [ ] **Step 2: Create `src/lib/use-pdf-export.ts`**

```ts
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

/** Exports the current printable route through the desktop app's printToPDF IPC. */
export function usePdfExport(): { readonly pending: boolean; readonly available: boolean; readonly exportPdf: (fileName: string) => Promise<void> } {
  const { show } = useToast()
  const [pending, setPending] = useState(false)
  async function exportPdf(fileName: string): Promise<void> {
    if (!window.filmStudy || pending) return
    setPending(true)
    try {
      const result = await window.filmStudy.exportReportPdf(fileName)
      if (result.status === 'saved') show({ message: `Saved PDF to ${result.filePath}` })
      else if (result.status === 'error') show({ message: `Could not export PDF. ${result.message}` })
    } catch (error) {
      show({ message: `Could not export PDF. ${error instanceof Error ? error.message : String(error)}` })
    } finally { setPending(false) }
  }
  return { pending, available: !!window.filmStudy, exportPdf }
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add electron/main.ts src/lib/use-pdf-export.ts
git commit -m "feat(practice): allow PDF export from Practice Script print routes"
```

---

## Chunk 3: UI

### Task 6: Script list, routes, and tab

**Files:**
- Create: `src/features/practice/script-list.tsx`
- Create: `src/routes/practice-pages.tsx`
- Modify: `src/routes/routes.tsx`, `src/components/workspace-header.tsx`

- [ ] **Step 1: Create `src/features/practice/script-list.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'

export function ScriptList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const navigate = useNavigate()
  const { show } = useToast()
  const [creating, setCreating] = useState(false)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const scripts = useQuery(api.practiceScripts.list, { workspaceId })
  const create = useMutation(api.practiceScripts.create)
  const remove = useMutation(api.practiceScripts.remove)
  const undo = useMutation(api.deletions.undo)
  const deleteScript = useUndoableMutation((scriptId: Id<'practiceScripts'>) => remove({ scriptId }), async (args) => { await undo(args) }, () => 'Deleted Practice Script')
  if (workspace === undefined || scripts === undefined) return <div role="status" aria-label="Loading Practice Scripts" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">Practice Scripts</h1><Meta>{scripts.length}</Meta>
      <Button className="ml-auto" onClick={() => setCreating(true)}>New Practice Script</Button>
    </header>
    {scripts.length === 0
      ? <p>No Practice Scripts yet. A script turns this week's Play Diagrams into scout-team reps and printable Scout Cards.</p>
      : <ul className="grid gap-2">{scripts.map((script) => <li key={script._id}><Panel className="flex items-center gap-3 p-3">
          <Link className="font-semibold underline" to={`/w/${workspaceId}/practice/${script._id}`}>{script.name}</Link>
          <Meta>{script.periods.length} periods · {script.periods.reduce((sum, period) => sum + period.reps.length, 0)} reps</Meta>
          <Button className="ml-auto" size="sm" variant="outline" onClick={() => {
            void deleteScript(script._id).catch((error: unknown) => show({ message: `Could not delete Practice Script. ${error instanceof Error ? error.message : String(error)}` }))
          }}>Delete</Button>
        </Panel></li>)}</ul>}
    <NameDialog open={creating} title="New Practice Script" label="Name" initialValue={`Week ${workspace.week} Scout Script`} confirmLabel="Create"
      onOpenChange={setCreating} onConfirm={async (name) => {
        const id = await create({ workspaceId: workspace._id, name })
        void navigate(`/w/${workspaceId}/practice/${id}`)
      }} />
  </Page>
}
```

- [ ] **Step 2: Create `src/routes/practice-pages.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { ScoutCardsPrint } from '@/features/practice/scout-cards-print'
import { ScriptEditor } from '@/features/practice/script-editor'
import { ScriptList } from '@/features/practice/script-list'
import { ScriptPrint } from '@/features/practice/script-print'

const NOT_CONFIGURED = <p className="p-6">Convex is not configured</p>
export function PracticeListPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <ScriptList workspaceId={workspaceId} /> : NOT_CONFIGURED
}
export function PracticeEditorPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScriptEditor workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
export function PracticePrintPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScriptPrint workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
export function ScoutCardsPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScoutCardsPrint workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
```

- [ ] **Step 3: Register the routes and the tab**

In `src/routes/routes.tsx`, import the four pages and add this child of `w/:workspaceId`, after the `reports` entry:

```tsx
          {
            path: 'practice',
            children: [
              { index: true, element: <PracticeListPage /> },
              {
                path: ':scriptId',
                children: [
                  { index: true, element: <PracticeEditorPage /> },
                  { path: 'print', element: <PracticePrintPage /> },
                  { path: 'cards', element: <ScoutCardsPage /> },
                ],
              },
            ],
          },
```

In `src/components/workspace-header.tsx`, add `{ segment: 'practice', label: 'Practice' },` after the `reports` entry of `WORKSPACE_TABS`.

The editor and print modules do not exist yet, so typecheck fails until Task 8. **Do not commit this task on its own.** Continue to Task 7, and commit Tasks 6 to 8 together at the end of Task 8.

### Task 7: Script editor and Add Period dialog

**Files:**
- Create: `src/features/practice/add-period-dialog.tsx`
- Create: `src/features/practice/script-editor.tsx`

- [ ] **Step 1: Create `src/features/practice/add-period-dialog.tsx`**

```tsx
import { useId, useState, type ReactNode } from 'react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { buildReps, PRACTICE_PERIOD_MAX_REPS, type ScriptPeriod } from '@convex/domain/practiceScript'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Meta } from '@/components/ui/panel'

export type Card = FunctionReturnType<typeof api.practiceScripts.cards>[number]

export function AddPeriodDialog({ open, onOpenChange, cards, periodNumber, onAdd }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly cards: readonly Card[]
  readonly periodNumber: number; readonly onAdd: (period: ScriptPeriod<Id<'diagrams'>>) => void
}): ReactNode {
  const id = useId()
  const [name, setName] = useState(`Period ${periodNumber}`)
  const [reps, setReps] = useState('12')
  const [selected, setSelected] = useState(() => {
    const weighted = cards.filter((card) => card.weight > 0)
    return new Set((weighted.length ? weighted : cards).map((card) => card.diagramId))
  })
  const total = Number(reps)
  const valid = Number.isInteger(total) && total >= 1 && total <= PRACTICE_PERIOD_MAX_REPS && selected.size > 0
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`}>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault()
      if (!valid) return
      const chosen = cards.filter((card) => selected.has(card.diagramId))
      onAdd({ id: crypto.randomUUID(), name: name.trim() || `Period ${periodNumber}`, reps: buildReps(chosen, total, () => crypto.randomUUID()) })
      onOpenChange(false)
    }}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Add period</h2>
      <div><label htmlFor={`${id}-name`}>Period name</label><Input id={`${id}-name`} autoFocus maxLength={NAME_MAX_LENGTH} value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label htmlFor={`${id}-reps`}>Reps</label><Input id={`${id}-reps`} type="number" min={1} max={PRACTICE_PERIOD_MAX_REPS} value={reps} onChange={(event) => setReps(event.target.value)} /></div>
      <fieldset className="grid max-h-72 gap-1 overflow-y-auto">
        <legend className="mb-1">Scout Cards (reps are weighted by charted snaps)</legend>
        {cards.map((card) => <label key={card.diagramId} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.has(card.diagramId)} onChange={(event) => {
            const next = new Set(selected)
            if (event.target.checked) next.add(card.diagramId); else next.delete(card.diagramId)
            setSelected(next)
          }} />
          {card.title} <Meta>{card.weight} snaps</Meta>
        </label>)}
      </fieldset>
      {!valid && <p role="alert" className="text-sm">Choose at least one card and 1–{PRACTICE_PERIOD_MAX_REPS} reps.</p>}
      <div className="flex gap-2"><Button type="submit" disabled={!valid}>Add</Button><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></div>
    </form>
  </Dialog>
}
```

- [ ] **Step 2: Create `src/features/practice/script-editor.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { HASHES } from '@convex/domain/coreFields'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { cardNumbers, patchRep, PRACTICE_PERIOD_MAX_REPS, PRACTICE_REP_NOTE_MAX_LENGTH, PRACTICE_SCRIPT_MAX_PERIODS } from '@convex/domain/practiceScript'
import { NameDialog } from '@/components/name-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { useAutosave } from '@/lib/db/use-autosave'
import { useReorder } from '@/lib/reorder'
import { AddPeriodDialog, type Card } from './add-period-dialog'

type Script = NonNullable<FunctionReturnType<typeof api.practiceScripts.get>>
type Period = Script['periods'][number]
type Rep = Period['reps'][number]

export function ScriptEditor({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  if (script === undefined || cards === undefined) return <div role="status" aria-label="Loading Practice Script" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!script) return <main className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></main>
  return <Editor key={script._id} workspaceId={workspaceId} script={script} cards={cards} />
}

function Editor({ workspaceId, script, cards }: { readonly workspaceId: string; readonly script: Script; readonly cards: readonly Card[] }): ReactNode {
  const savePeriods = useMutation(api.practiceScripts.savePeriods)
  const rename = useMutation(api.practiceScripts.rename)
  const { draft, setDraft, status } = useAutosave(script.periods, async (periods) => { await savePeriods({ scriptId: script._id, periods }) })
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const numbers = cardNumbers(draft, (id) => live.has(id))
  const base = `/w/${workspaceId}/practice/${script._id}`
  const outline = buttonVariants({ variant: 'outline', size: 'sm' })
  return <Page width="max-w-[1100px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">{script.name}</h1>
      <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>Rename</Button>
      <Meta role="status">{status === 'error' ? 'Not saved. Check down (1–4) and distance (0–99).' : status === 'idle' ? 'Saved' : 'Saving…'}</Meta>
      <Link className={`${outline} ml-auto`} to={`${base}/print`}>Print script</Link>
      <Link className={outline} to={`${base}/cards`}>Print Scout Cards</Link>
    </header>
    {cards.length === 0 && <p>No Play Diagrams in this Workspace yet. Draw them from a Source Game's Play Diagrams tab. Each one becomes a Scout Card.</p>}
    {draft.map((period, index) => <PeriodEditor key={period.id} period={period} cards={cards} numbers={numbers}
      onChange={(next) => setDraft(draft.map((item, itemIndex) => itemIndex === index ? next : item))}
      onRemove={() => setDraft(draft.filter((_, itemIndex) => itemIndex !== index))} />)}
    <div><Button disabled={cards.length === 0 || draft.length >= PRACTICE_SCRIPT_MAX_PERIODS} onClick={() => setAdding(true)}>Add period</Button></div>
    {adding && <AddPeriodDialog open onOpenChange={setAdding} cards={cards} periodNumber={draft.length + 1} onAdd={(period) => setDraft([...draft, period])} />}
    <NameDialog open={renaming} title="Rename Practice Script" label="Name" initialValue={script.name} confirmLabel="Rename"
      onOpenChange={setRenaming} onConfirm={async (name) => { await rename({ scriptId: script._id, name }) }} />
  </Page>
}

function PeriodEditor({ period, cards, numbers, onChange, onRemove }: {
  readonly period: Period; readonly cards: readonly Card[]; readonly numbers: ReadonlyMap<Id<'diagrams'>, number>
  readonly onChange: (next: Period) => void; readonly onRemove: () => void
}): ReactNode {
  const setReps = (reps: Rep[]): void => onChange({ ...period, reps })
  const setRep = (index: number, next: Rep): void => setReps(period.reps.map((rep, repIndex) => repIndex === index ? next : rep))
  const reorder = useReorder({
    itemCount: period.reps.length, label: (index) => `Rep ${index + 1}`,
    onReorder: (from, to) => { const reps = [...period.reps]; const [moved] = reps.splice(from, 1); if (moved) reps.splice(to, 0, moved); setReps(reps) },
  })
  const firstCard = cards[0]
  return <Panel className="grid gap-3 p-4">
    <div className="flex items-center gap-2">
      <Input aria-label="Period name" maxLength={NAME_MAX_LENGTH} className="max-w-sm font-semibold" value={period.name} onChange={(event) => onChange({ ...period, name: event.target.value })} />
      <Meta>{period.reps.length} reps</Meta>
      <Button className="ml-auto" size="sm" variant="outline" onClick={onRemove}>Remove period</Button>
    </div>
    <p aria-live="polite" className="sr-only">{reorder.announcement}</p>
    <table className="w-full text-sm">
      <thead><tr><th className="text-left">Rep</th><th className="text-left">Card</th><th>Down</th><th>Dist</th><th>Hash</th><th className="text-left">Note</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{period.reps.map((rep, index) => <tr key={rep.id} {...reorder.getItemProps(index)} className={reorder.dragOverIndex === index ? 'bg-muted' : ''}>
        <td>{index + 1}</td>
        <td><Select aria-label={`Rep ${index + 1} card`} value={rep.diagramId} onChange={(event) => {
          const card = cards.find((item) => item.diagramId === event.target.value)
          if (card) setRep(index, patchRep(rep, { diagramId: card.diagramId }))
        }}>
          {!numbers.has(rep.diagramId) && !cards.some((card) => card.diagramId === rep.diagramId) && <option value={rep.diagramId} disabled>Deleted Play Diagram</option>}
          {cards.map((card) => <option key={card.diagramId} value={card.diagramId}>{numbers.has(card.diagramId) ? `#${numbers.get(card.diagramId)} ` : ''}{card.title}</option>)}
        </Select></td>
        <td><Select aria-label={`Rep ${index + 1} down`} value={rep.down ?? ''} onChange={(event) => setRep(index, patchRep(rep, { down: event.target.value ? Number(event.target.value) : undefined }))}>
          <option value="">–</option>{[1, 2, 3, 4].map((down) => <option key={down} value={down}>{down}</option>)}
        </Select></td>
        <td><Input aria-label={`Rep ${index + 1} distance`} type="number" min={0} max={99} className="w-20" value={rep.distance ?? ''}
          onChange={(event) => setRep(index, patchRep(rep, { distance: event.target.value === '' ? undefined : Number(event.target.value) }))} /></td>
        <td><Select aria-label={`Rep ${index + 1} hash`} value={rep.hash ?? ''} onChange={(event) => setRep(index, patchRep(rep, { hash: HASHES.find((hash) => hash === event.target.value) }))}>
          <option value="">–</option>{HASHES.map((hash) => <option key={hash} value={hash}>{hash}</option>)}
        </Select></td>
        <td><Input aria-label={`Rep ${index + 1} note`} maxLength={PRACTICE_REP_NOTE_MAX_LENGTH} value={rep.note ?? ''}
          onChange={(event) => setRep(index, patchRep(rep, { note: event.target.value || undefined }))} /></td>
        <td className="whitespace-nowrap">
          <Button size="sm" variant="ghost" aria-label={`Move rep ${index + 1} up`} disabled={!reorder.canMoveUp(index)} onClick={() => reorder.moveUp(index)}>↑</Button>
          <Button size="sm" variant="ghost" aria-label={`Move rep ${index + 1} down`} disabled={!reorder.canMoveDown(index)} onClick={() => reorder.moveDown(index)}>↓</Button>
          <Button size="sm" variant="ghost" aria-label={`Remove rep ${index + 1}`} onClick={() => setReps(period.reps.filter((_, repIndex) => repIndex !== index))}>×</Button>
        </td>
      </tr>)}</tbody>
    </table>
    <div><Button size="sm" variant="outline" disabled={!firstCard || period.reps.length >= PRACTICE_PERIOD_MAX_REPS}
      onClick={() => { if (firstCard) setReps([...period.reps, { id: crypto.randomUUID(), diagramId: firstCard.diagramId }]) }}>Add rep</Button></div>
  </Panel>
}
```

Do not commit yet. Task 8 completes the modules imported by `practice-pages.tsx`.

### Task 8: Script sheet and Scout Cards print views

**Files:**
- Create: `src/features/practice/script-print.tsx`
- Create: `src/features/practice/scout-cards-print.tsx`

- [ ] **Step 1: Create `src/features/practice/script-print.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cardNumbers, formatDownDistance } from '@convex/domain/practiceScript'
import { pdfFileName } from '@convex/domain/reportBlocks'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/lib/use-pdf-export'

export function ScriptPrint({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  const { pending, available, exportPdf } = usePdfExport()
  if (workspace === undefined || script === undefined || cards === undefined) return <div role="status" aria-label="Loading Practice Script" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !script) return <div className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></div>
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const numbers = cardNumbers(script.periods, (id) => live.has(id))
  return <>
    <div className="flex flex-wrap items-center gap-4 px-6 pt-6 print:hidden">
      <Link className="underline" to={`/w/${workspaceId}/practice/${scriptId}`}>Back to Script</Link>
      <Button disabled={pending || !available} onClick={() => { void exportPdf(pdfFileName({ opponentName: workspace.opponentName, week: workspace.week, reportName: script.name })) }}>{pending ? 'Exporting…' : 'Export PDF'}</Button>
      {!available && <p>PDF export requires the desktop app</p>}
    </div>
    <article data-report-ready className="report-sheet mx-auto my-6 w-[8.5in] shrink-0 space-y-6 p-[0.5in] shadow print:m-0 print:w-auto print:p-0 print:shadow-none">
      <header className="report-avoid-break space-y-1 border-b border-border pb-4"><h1 className="text-2xl font-bold">{script.name}</h1><p className="text-sm">{workspace.opponentName} · Week {workspace.week} · {workspace.seasonName}</p></header>
      {script.periods.map((period) => <section key={period.id} className="space-y-2">
        <h2 className="report-heading text-lg font-semibold">{period.name}</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left">Rep</th><th className="text-left">Card</th><th className="text-left">Play</th><th className="text-left">Down &amp; Distance</th><th className="text-left">Hash</th><th className="text-left">Note</th></tr></thead>
          <tbody>{period.reps.filter((rep) => live.has(rep.diagramId)).map((rep, index) => <tr key={rep.id}>
            <td>{index + 1}</td><td>{numbers.get(rep.diagramId)}</td><td>{live.get(rep.diagramId)?.title}</td>
            <td>{formatDownDistance(rep.down, rep.distance)}</td><td>{rep.hash ?? ''}</td><td>{rep.note ?? ''}</td>
          </tr>)}</tbody>
        </table>
      </section>)}
    </article>
  </>
}
```

- [ ] **Step 2: Create `src/features/practice/scout-cards-print.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cardNumbers } from '@convex/domain/practiceScript'
import { pdfFileName } from '@convex/domain/reportBlocks'
import { DiagramSvg } from '@/components/diagram-svg'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/lib/use-pdf-export'

// Mounted only on this route, so the landscape rule never reaches other printable pages (plan R3).
const LANDSCAPE = '@page { size: letter landscape; margin: 0.4in; }'

export function ScoutCardsPrint({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  const { pending, available, exportPdf } = usePdfExport()
  if (workspace === undefined || script === undefined || cards === undefined) return <div role="status" aria-label="Loading Scout Cards" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !script) return <div className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></div>
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const ordered = [...cardNumbers(script.periods, (id) => live.has(id))].flatMap(([diagramId, number]) => {
    const card = live.get(diagramId)
    return card ? [{ card, number }] : []
  })
  return <>
    <style>{LANDSCAPE}</style>
    <div className="flex flex-wrap items-center gap-4 px-6 pt-6 print:hidden">
      <Link className="underline" to={`/w/${workspaceId}/practice/${scriptId}`}>Back to Script</Link>
      <Button disabled={pending || !available || ordered.length === 0} onClick={() => { void exportPdf(pdfFileName({ opponentName: workspace.opponentName, week: workspace.week, reportName: `${script.name} Scout Cards` })) }}>{pending ? 'Exporting…' : 'Export PDF'}</Button>
      {!available && <p>PDF export requires the desktop app</p>}
    </div>
    {ordered.length === 0 && <p className="p-6">Add reps to this Practice Script to print Scout Cards.</p>}
    <article data-report-ready className="report-sheet mx-auto my-6 w-[11in] shrink-0 print:m-0 print:w-auto">
      {ordered.map(({ card, number }) => <section key={card.diagramId} className="report-avoid-break flex h-[7.7in] break-after-page flex-col gap-3 p-[0.4in] print:p-0">
        <header className="flex items-baseline gap-4"><span className="text-6xl font-bold">{number}</span><h2 className="text-3xl font-bold">{card.title}</h2></header>
        <DiagramSvg diagram={card} title={card.title} className="min-h-0 w-full flex-1" {...(card.hiddenSide ? { hideSide: card.hiddenSide } : {})} />
        <p className="text-lg">{card.facts.snaps === 0 ? 'No charted snaps attached' : card.facts.top.map((fact) => `${fact.label}: ${fact.value} (${fact.count}/${card.facts.snaps})`).join(' · ')}</p>
      </section>)}
    </article>
  </>
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: typecheck passes, every `node --test` suite passes, and electron-vite finishes the build.

- [ ] **Step 4: Verify in the running app with the fixture**

Setup:
1. Run `npx convex dev` and `npm run dev`.
2. Create a **Test Opp** workspace and import `.claude/plans/fixtures/tell-finder-fixture.csv` (ODK filter **All**, 44 snaps). The row layout is in `tell-finder.md`, Task 5 Step 6.
3. In the Source Game's **Play Diagrams** tab, create these and use **Attach to Snap…**:
   | Diagram name | Attach to plays | Expected weight |
   |---|---|---|
   | Trips Mesh | 1, 2, 3, 4 | 4 |
   | Pro Power | 13 (Left hash), 19 (Right hash) | 2 |
   | Ace Stick | none | 0 |

Checks:
1. **Practice tab, New Practice Script.** The editor opens empty.
2. **Add period** shows Trips Mesh and Pro Power checked and Ace Stick unchecked, with 12 reps. Click **Add**. Expect:
   - 8 Trips reps and 4 Pro reps, in the order T P T P T P T P T T T T.
   - Trips reps are 1st & 10 with no hash.
   - Pro reps alternate Left, Right, Left, Right.
   - Trips Mesh is card #1 and Pro Power is card #2.
3. **Weight-0 card:** add a period with all three cards checked. Ace Stick gets 0 reps.
4. **Even split:** detach the Trips and Pro snaps so every weight is 0, then add a 12-rep period. Expect 4/4/4. Attach them again.
5. **Autosave:** edit a down, a hash, and a note, and reorder with ↑/↓ and by dragging. The header goes Saving… → Saved, and the changes survive a reload.
6. **Bad value:** distance 150 shows "Not saved…". Fixing it returns to Saved.
7. **Print script, then Export PDF:** portrait, one table per period, and card numbers match the editor.
8. **Print Scout Cards, then Export PDF:** 2 landscape pages.
   - Card 1 is Trips Mesh: "Formation: Trips Rt (4/4) · Situation: 1st Down (4/4)".
   - Card 2 is Pro Power: "Formation: Pro (2/2) · Situation: 1st Down (2/2) · Hash: Left (1/2)".
9. **Deleted diagram:** delete Pro Power. Its reps show "Deleted Play Diagram" and both printouts skip them. Undo restores them.
10. **Cascade:** delete the script, then Undo. Delete the workspace, then Undo. The script comes back with it.
11. **Keyboard:** every rep control is reachable by Tab, and Escape closes Add period.
12. **Cleanup:** delete the Test Opp workspace.

- [ ] **Step 5: Commit Tasks 6 to 8**

```bash
git add src/features/practice src/routes/practice-pages.tsx src/routes/routes.tsx src/components/workspace-header.tsx
git commit -m "feat(practice): add Practice Script editor, script sheet, and Scout Cards PDFs"
```

---

## Out of scope for this plan

- Moving `report-preview.tsx` onto `usePdfExport`. It works as is; migrate it in a cleanup pass.
- Two or four Scout Cards per page (A3).
- Adding a Play Diagram to a Script from the Tells page. Build this after the Tell Finder ships.
- Reusing scripts across Workspaces. SPEC excludes reusable play-diagram templates.
