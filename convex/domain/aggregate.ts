import { formatCoreValue, getCoreField, type CoreFieldKey } from './coreFields.ts'
import { hasAnalysisValue, type TemplateFieldType } from './templateFields.ts'
import { fieldZoneOf, isValidYardLine, type YardLine } from './fieldZone.ts'
import { downDistanceSituationOf } from './situation.ts'

export const NONE_GROUP = '(none)'
export const CORE_GROUPING_KEYS = [
  'odk', 'personnel', 'formation', 'motion', 'playType', 'playConcept', 'direction', 'hash',
] as const satisfies readonly CoreFieldKey[]
export type CoreGroupingKey = (typeof CORE_GROUPING_KEYS)[number]
export const DERIVED_GROUPING_KEYS = ['downDistanceSituation', 'fieldZone'] as const
export type DerivedGroupingKey = (typeof DERIVED_GROUPING_KEYS)[number]
export const GROUPABLE_TEMPLATE_TYPES = ['select', 'multiSelect', 'checkbox', 'rating', 'tags'] as const
export type GroupableTemplateType = (typeof GROUPABLE_TEMPLATE_TYPES)[number]
export type GroupingField =
  | { readonly key: `derived:${DerivedGroupingKey}`; readonly kind: 'derived'; readonly label: string; readonly derivedKey: DerivedGroupingKey }
  | { readonly key: `core:${CoreGroupingKey}`; readonly kind: 'core'; readonly label: string; readonly coreKey: CoreGroupingKey }
  | { readonly key: `field:${GroupableTemplateType}:${string}`; readonly kind: 'template'; readonly label: string; readonly type: GroupableTemplateType }
export const DEFAULT_GROUP_BY = 'core:formation'

export interface GroupableSnap {
  readonly core: { readonly [K in CoreFieldKey]?: unknown } & { readonly yardLine?: YardLine; readonly down?: number; readonly distance?: number; readonly yards?: number }
  readonly analysis: Readonly<Record<string, unknown>>
}
export interface TemplateFieldLike { readonly _id: string; readonly name: string; readonly type: TemplateFieldType }

export function templateGroupingKey(field: Pick<TemplateFieldLike, 'name' | 'type'>): GroupingField['key'] | null {
  const type = GROUPABLE_TEMPLATE_TYPES.find((type) => type === field.type)
  return type ? `field:${type}:${field.name.trim().replace(/\s+/g, ' ').toLowerCase()}` : null
}

export function groupingFieldsFor(templates: readonly (readonly TemplateFieldLike[])[]): GroupingField[] {
  const fields: GroupingField[] = CORE_GROUPING_KEYS.map((coreKey) => ({
    key: `core:${coreKey}`, kind: 'core', label: getCoreField(coreKey).label, coreKey,
  }))
  fields.push(
    { key: 'derived:downDistanceSituation', kind: 'derived', label: 'Down and Distance Situation', derivedKey: 'downDistanceSituation' },
    { key: 'derived:fieldZone', kind: 'derived', label: 'Field Zone', derivedKey: 'fieldZone' },
  )
  const seen = new Set<string>()
  for (const template of templates) for (const field of template) {
    const type = GROUPABLE_TEMPLATE_TYPES.find((type) => type === field.type)
    const key = templateGroupingKey(field)
    if (!type || !key || seen.has(key)) continue
    seen.add(key)
    fields.push({ key: `field:${type}:${field.name.trim().replace(/\s+/g, ' ').toLowerCase()}`, kind: 'template', label: field.name, type })
  }
  return fields
}

export function groupingValuesOf(snap: GroupableSnap, field: GroupingField, templateFieldId: string | undefined): string[] {
  if (field.kind === 'derived') return [field.derivedKey === 'downDistanceSituation'
    ? downDistanceSituationOf(snap.core.down, snap.core.distance) ?? NONE_GROUP
    : isValidYardLine(snap.core.yardLine) ? fieldZoneOf(snap.core.yardLine) : NONE_GROUP]
  if (field.kind === 'core') {
    const value = formatCoreValue(field.coreKey, snap.core[field.coreKey])
    return [value.trim() ? value : NONE_GROUP]
  }
  const value = templateFieldId === undefined ? undefined : snap.analysis[templateFieldId]
  if (!hasAnalysisValue(value)) return [NONE_GROUP]
  switch (field.type) {
    case 'checkbox': return [typeof value === 'boolean' ? value ? 'Yes' : 'No' : NONE_GROUP]
    case 'rating': return [typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5 ? String(value) : NONE_GROUP]
    case 'select': return [typeof value === 'string' ? value : NONE_GROUP]
    case 'multiSelect':
    case 'tags':
      if (Array.isArray(value) && value.every((item): item is string => typeof item === 'string' && item.trim().length > 0)) return [...new Set(value)]
      return [NONE_GROUP]
  }
}

export interface AggregateInput { readonly levels: readonly (readonly string[])[]; readonly yards: number | undefined }
export interface AggregateRow { values: string[]; snaps: number; frequency: number; avgYards: number | null }
export interface AggregateResult { totalSnaps: number; rows: AggregateRow[]; overlapping: boolean }

function compareValue(a: string, b: string): number {
  return a === b ? 0 : a === NONE_GROUP ? 1 : b === NONE_GROUP ? -1 : a.localeCompare(b)
}

export function aggregate(inputs: readonly AggregateInput[]): AggregateResult {
  const groups = new Map<string, { values: string[]; snaps: number; yards: number; yardsCount: number }>()
  const firstCounts = new Map<string, number>()
  let overlapping = false
  for (const input of inputs) {
    const first = [...new Set(input.levels[0]?.length ? input.levels[0] : [NONE_GROUP])]
    const second = input.levels[1] ? [...new Set(input.levels[1].length ? input.levels[1] : [NONE_GROUP])] : undefined
    if (first.length * (second?.length ?? 1) > 1) overlapping = true
    for (const value of first) {
      firstCounts.set(value, (firstCounts.get(value) ?? 0) + 1)
      for (const values of second ? second.map((next) => [value, next]) : [[value]]) {
        const key = JSON.stringify(values)
        const group = groups.get(key) ?? { values, snaps: 0, yards: 0, yardsCount: 0 }
        group.snaps += 1
        if (input.yards !== undefined && Number.isFinite(input.yards)) { group.yards += input.yards; group.yardsCount += 1 }
        groups.set(key, group)
      }
    }
  }
  const rows = [...groups.values()].map(({ values, snaps, yards, yardsCount }) => ({
    values, snaps, frequency: snaps / inputs.length, avgYards: yardsCount ? yards / yardsCount : null,
  })).sort((a, b) => {
    const firstA = a.values[0] ?? NONE_GROUP
    const firstB = b.values[0] ?? NONE_GROUP
    return (firstCounts.get(firstB) ?? 0) - (firstCounts.get(firstA) ?? 0) || compareValue(firstA, firstB) ||
      b.snaps - a.snaps || compareValue(a.values[1] ?? NONE_GROUP, b.values[1] ?? NONE_GROUP)
  })
  return { totalSnaps: inputs.length, rows, overlapping }
}

export function formatFrequency(frequency: number): string { return `${Math.round(frequency * 100)}%` }
export function formatAvgYards(avgYards: number | null): string { return avgYards === null ? '—' : avgYards.toFixed(1) }
