/** Fifteen charting fields; Play # remains a Hudl Reference outside this registry.
 * Clock stays plain text; number ranges belong to the cell editor.
 */
import { formatYardLine, isValidYardLine, parseYardLine, type YardLine } from './fieldZone.ts'
import type { TerminologyList } from './terminology.ts'

export const HASHES = ['Left', 'Middle', 'Right'] as const
export const PLAY_TYPES = [
  'Run', 'Pass', 'RPO', 'Play Action', 'Screen', 'Draw', 'QB Run', 'Special / Trick', 'Other',
] as const
export const DIRECTIONS = ['Left', 'Right', 'Middle', 'Field', 'Boundary', 'Strong', 'Weak', 'N/A'] as const
export const ODK_VALUES = ['O', 'D', 'K'] as const

export type Hash = (typeof HASHES)[number]
export type PlayType = (typeof PLAY_TYPES)[number]
export type Direction = (typeof DIRECTIONS)[number]
export type OdkValue = (typeof ODK_VALUES)[number]

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
  { key: 'odk', label: 'ODK', input: { kind: 'select', options: ODK_VALUES } },
  { key: 'down', label: 'Down', input: { kind: 'number' } },
  { key: 'distance', label: 'Distance', input: { kind: 'number' } },
  { key: 'yardLine', label: 'Yard Line', input: { kind: 'fieldPosition' } },
  { key: 'hash', label: 'Hash', input: { kind: 'select', options: HASHES } },
  { key: 'personnel', label: 'Personnel', input: { kind: 'terminology', list: 'personnel' } },
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

export const CORE_NUMBER_BOUNDS = {
  quarter: { min: 1, max: 9 }, down: { min: 1, max: 4 },
  distance: { min: 0, max: 99 }, yards: { min: -99, max: 99 },
} as const

export type CoreValue = string | number | YardLine

export function normalizeCoreValue(key: CoreFieldKey, raw: unknown): CoreValue | undefined {
  const field = getCoreField(key)
  const value = typeof raw === 'string' ? raw.trim() : raw
  if (value === undefined || value === null || value === '') return undefined
  if (field.input.kind === 'fieldPosition') {
    const line = typeof value === 'string' ? parseYardLine(value) : value
    if (!isValidYardLine(line)) throw new Error('Yard Line must be OWN 1–49, 50, or OPP 1–49')
    return line
  }
  if (key === 'quarter' || key === 'down' || key === 'distance' || key === 'yards') {
    const { min, max } = CORE_NUMBER_BOUNDS[key]
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (!Number.isInteger(number) || number < min || number > max) {
      throw new Error(`${field.label} must be a whole number between ${min} and ${max}`)
    }
    return number
  }
  if (typeof value !== 'string') throw new Error(`${field.label} must be text`)
  if (field.input.kind === 'select' && !field.input.options.includes(value)) {
    throw new Error(`${field.label} must match an available option`)
  }
  return value
}

export const CARRY_FORWARD_CORE_KEYS = ['personnel', 'formation', 'motion'] as const
