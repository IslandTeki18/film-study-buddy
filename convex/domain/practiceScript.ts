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
