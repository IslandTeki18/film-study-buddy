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
