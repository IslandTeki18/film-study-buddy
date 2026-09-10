/** Fourteen charting fields; Play # remains a Hudl Reference outside this registry.
 * Clock/personnel stay plain text; number ranges belong to the cell editor.
 */
import { formatYardLine, isValidYardLine } from './field-zone.ts'
import type { TerminologyList } from './terminology.ts'

export const HASHES = ['Left', 'Middle', 'Right'] as const
export const PLAY_TYPES = [
  'Run', 'Pass', 'RPO', 'Play Action', 'Screen', 'Draw', 'QB Run', 'Special / Trick', 'Other',
] as const
export const DIRECTIONS = ['Left', 'Right', 'Middle', 'Field', 'Boundary', 'Strong', 'Weak', 'N/A'] as const

export type Hash = (typeof HASHES)[number]
export type PlayType = (typeof PLAY_TYPES)[number]
export type Direction = (typeof DIRECTIONS)[number]

export type CoreFieldInput =
  | { readonly kind: 'shortText' }
  | { readonly kind: 'number' }
  | { readonly kind: 'select'; readonly options: readonly string[] }
  | { readonly kind: 'terminology'; readonly list: TerminologyList }
  | { readonly kind: 'fieldPosition' }

export interface CoreField {
  readonly key: CoreFieldKey
  readonly label: string
  readonly input: CoreFieldInput
}

export const CORE_FIELDS = [
  { key: 'clipNumber', label: 'Source / Clip #', input: { kind: 'shortText' } },
  { key: 'quarter', label: 'Quarter', input: { kind: 'number' } },
  { key: 'clock', label: 'Clock', input: { kind: 'shortText' } },
  { key: 'down', label: 'Down', input: { kind: 'number' } },
  { key: 'distance', label: 'Distance', input: { kind: 'number' } },
  { key: 'yardLine', label: 'Yard Line', input: { kind: 'fieldPosition' } },
  { key: 'hash', label: 'Hash', input: { kind: 'select', options: HASHES } },
  { key: 'personnel', label: 'Personnel', input: { kind: 'shortText' } },
  { key: 'formation', label: 'Formation', input: { kind: 'terminology', list: 'formations' } },
  { key: 'motion', label: 'Motion', input: { kind: 'terminology', list: 'motions' } },
  { key: 'playType', label: 'Play Type', input: { kind: 'select', options: PLAY_TYPES } },
  { key: 'playConcept', label: 'Play Concept', input: { kind: 'terminology', list: 'playConcepts' } },
  { key: 'direction', label: 'Direction', input: { kind: 'select', options: DIRECTIONS } },
  { key: 'yards', label: 'Yards Gained / Lost', input: { kind: 'number' } },
] as const satisfies readonly { readonly key: string; readonly label: string; readonly input: CoreFieldInput }[]

export type CoreFieldKey = (typeof CORE_FIELDS)[number]['key']

export function isCoreFieldKey(value: unknown): value is CoreFieldKey {
  return CORE_FIELDS.some(({ key }) => key === value)
}

export function getCoreField(key: CoreFieldKey): CoreField {
  const field = CORE_FIELDS.find((field) => field.key === key)
  if (!field) throw new Error(`Unknown Core Snap field: ${key}`)
  return field
}

export function formatCoreValue(key: CoreFieldKey, value: unknown): string {
  if (value === undefined || value === null) return ''
  if (key === 'yardLine') return isValidYardLine(value) ? formatYardLine(value) : ''
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}
