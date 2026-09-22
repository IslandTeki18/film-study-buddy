import {
  CORE_FIELDS,
  formatCoreValue,
  getCoreField,
  normalizeCoreValue,
  type CoreFieldKey,
  type CoreValue,
  type OdkValue,
} from './coreFields.ts'
import { parseYardLine } from './fieldZone.ts'

export type ImportTarget = CoreFieldKey | 'playNumber'
export const IMPORT_TARGETS: readonly { key: ImportTarget; label: string }[] = [
  { key: 'playNumber', label: 'Play #' },
  ...CORE_FIELDS.map(({ key, label }) => ({ key, label })),
]
export type ColumnMapping = Readonly<Record<string, ImportTarget | null>>
export const REQUIRED_TARGET_GROUPS: readonly (readonly ImportTarget[])[] = [['clipNumber', 'playNumber']]

type SnapCore = Partial<Record<CoreFieldKey, CoreValue> & { playNumber: string }>

export function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function headerSignature(headers: readonly string[]): string {
  return headers.map(normalizeHeader).sort().join('\x01')
}

const HEADER_ALIASES: Readonly<Record<string, ImportTarget>> = {
  'PLAY #': 'playNumber', PLAY: 'playNumber', 'PLAY NUMBER': 'playNumber',
  'CLIP #': 'clipNumber', CLIP: 'clipNumber', 'CLIP NUMBER': 'clipNumber',
  QTR: 'quarter', QUARTER: 'quarter', CLOCK: 'clock', TIME: 'clock',
  ODK: 'odk', 'O/D/K': 'odk', UNIT: 'odk',
  DN: 'down', DOWN: 'down', DIST: 'distance', DISTANCE: 'distance',
  'YARD LN': 'yardLine', 'YARD LINE': 'yardLine', 'YD LN': 'yardLine', HASH: 'hash',
  PERSONNEL: 'personnel', 'OFF PERS': 'personnel', 'OFF PERSONNEL': 'personnel',
  'OFF FORM': 'formation', FORMATION: 'formation', 'OFF FORMATION': 'formation',
  MOTION: 'motion', 'OFF MOTION': 'motion', 'PLAY TYPE': 'playType',
  'OFF PLAY': 'playConcept', 'PLAY CONCEPT': 'playConcept', CONCEPT: 'playConcept',
  'PLAY DIR': 'direction', DIRECTION: 'direction', 'PLAY DIRECTION': 'direction',
  'GN/LS': 'yards', 'GAIN/LOSS': 'yards', YARDS: 'yards', GAIN: 'yards',
}
const ODK_HEADER_ALIASES = ['ODK', 'O/D/K', 'UNIT'] as const

export const isOdkHeader = (header: string): boolean => HEADER_ALIASES[normalizeHeader(header)] === 'odk'

export function preferredOdkHeader(headers: readonly string[]): string | null {
  for (const alias of ODK_HEADER_ALIASES) {
    const matches = headers.filter((header) => normalizeHeader(header) === alias)
    if (matches.length === 1) return matches[0] ?? null
  }
  return null
}

export function autoMap(headers: readonly string[]): ColumnMapping {
  const counts = new Map<string, number>()
  for (const header of headers) {
    const normalized = normalizeHeader(header)
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  const odkHeader = preferredOdkHeader(headers)
  const claimed = new Set<ImportTarget>()
  return Object.fromEntries(headers.map((header) => {
    const normalized = normalizeHeader(header)
    const target = counts.get(normalized) === 1 ? HEADER_ALIASES[normalized] : undefined
    if (!target || claimed.has(target) || (target === 'odk' && header !== odkHeader)) return [header, null]
    claimed.add(target)
    return [header, target]
  }))
}

export function missingRequiredTargets(mapping: ColumnMapping): ImportTarget[][] {
  const mapped = new Set(Object.values(mapping))
  return REQUIRED_TARGET_GROUPS.filter((group) => !group.some((target) => mapped.has(target)))
    .map((group) => [...group])
}

export type CoerceResult =
  | { readonly ok: true; readonly value: CoreValue | string | undefined }
  | { readonly ok: false; readonly raw: string }

const INTEGER = /^[+-]?\d+(\.0+)?$/
const TEXT_TARGETS: readonly ImportTarget[] = [
  'playNumber', 'clipNumber', 'clock', 'personnel', 'formation', 'motion', 'playConcept',
]
const NUMBER_TARGETS: readonly CoreFieldKey[] = ['quarter', 'down', 'distance', 'yards']
const SHORT_OPTIONS: Readonly<Partial<Record<CoreFieldKey, Readonly<Record<string, string>>>>> = {
  hash: { L: 'Left', M: 'Middle', R: 'Right' },
  direction: { L: 'Left', R: 'Right' },
}

export function coerceValue(target: ImportTarget, raw: string): CoerceResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: undefined }
  if (target === 'playNumber') return { ok: true, value: trimmed }
  if (TEXT_TARGETS.includes(target)) return { ok: true, value: trimmed }

  let candidate: unknown = trimmed
  if (NUMBER_TARGETS.includes(target as CoreFieldKey)) {
    if (!INTEGER.test(trimmed)) return { ok: false, raw }
    candidate = Number(trimmed)
  } else if (target === 'yardLine') {
    const signed = /^[+-]?\d+$/.test(trimmed) ? Number(trimmed) : null
    candidate = signed === 50 ? { side: 'mid', yard: 50 }
      : signed !== null && signed >= 1 && signed <= 49 ? { side: 'opp', yard: signed }
      : signed !== null && signed >= -49 && signed <= -1 ? { side: 'own', yard: -signed }
      : parseYardLine(trimmed)
    if (candidate === null) return { ok: false, raw }
  } else {
    const upper = trimmed.toUpperCase()
    const field = getCoreField(target)
    candidate = SHORT_OPTIONS[target]?.[upper]
      ?? (field.input.kind === 'select'
        ? field.input.options.find((option) => option.toUpperCase() === upper)
        : undefined)
  }

  try {
    const value = normalizeCoreValue(target, candidate)
    return value === undefined ? { ok: false, raw } : { ok: true, value }
  } catch {
    return { ok: false, raw }
  }
}

export interface CoercedRow {
  readonly index: number
  readonly core: SnapCore
  readonly imported: Record<string, string>
  readonly rejected: readonly { target: ImportTarget; label: string; raw: string }[]
  readonly flag: 'specialTeams' | 'noPlay' | null
}
export type OdkFilter = 'all' | OdkValue

export function includeForOdkFilter(row: CoercedRow, filter: OdkFilter, hasOdkMapping: boolean): boolean {
  return filter === 'all' || !hasOdkMapping ? row.flag === null
    : row.core.odk === filter && row.flag !== 'noPlay'
}

export function coerceRow(
  row: Record<string, string>, mapping: ColumnMapping, index: number,
): CoercedRow {
  const core: SnapCore = {}
  const imported: Record<string, string> = {}
  const rejected: { target: ImportTarget; label: string; raw: string }[] = []
  const normalizedMapping = new Map<string, ImportTarget | null>()
  for (const [header, target] of Object.entries(mapping)) {
    const normalized = normalizeHeader(header)
    normalizedMapping.set(normalized, normalizedMapping.has(normalized) ? null : target)
  }
  for (const [header, raw] of Object.entries(row)) {
    const target = normalizedMapping.get(normalizeHeader(header))
    if (!target) continue
    const result = coerceValue(target, raw)
    if (!result.ok) {
      rejected.push({ target, label: IMPORT_TARGETS.find(({ key }) => key === target)?.label ?? target, raw })
    } else if (result.value !== undefined) {
      Object.assign(core, { [target]: result.value })
      imported[target] = target === 'playNumber' ? String(result.value) : formatCoreValue(target, result.value)
    }
  }
  if (core.clipNumber === undefined && core.playNumber !== undefined) {
    core.clipNumber = core.playNumber
    imported.clipNumber = core.playNumber
  }
  const flag = core.odk !== undefined && core.odk !== 'O' && core.odk !== 'D' ? 'specialTeams'
    : core.down === undefined && core.distance === undefined && core.playType === undefined ? 'noPlay' : null
  return { index, core, imported, rejected, flag }
}

export type DuplicateReason = 'clipNumber' | 'playNumber' | 'quarterClock'

export function findLikelyDuplicates(
  existing: readonly { core: SnapCore }[], rows: readonly CoercedRow[],
): ReadonlyMap<number, DuplicateReason> {
  const result = new Map<number, DuplicateReason>()
  const text = (value: CoreValue | string | undefined) => typeof value === 'string' ? value.trim() : value
  for (const row of rows) {
    const match = existing.find(({ core }) =>
      text(row.core.clipNumber) !== '' && row.core.clipNumber !== undefined && text(core.clipNumber) === text(row.core.clipNumber))
    if (match) result.set(row.index, 'clipNumber')
    else if (row.core.playNumber !== undefined && text(row.core.playNumber) !== '' &&
      existing.some(({ core }) => text(core.playNumber) === text(row.core.playNumber))) result.set(row.index, 'playNumber')
    else if (row.core.quarter !== undefined && row.core.clock !== undefined && text(row.core.clock) !== '' &&
      existing.some(({ core }) => core.quarter === row.core.quarter && text(core.clock) === text(row.core.clock))) {
      result.set(row.index, 'quarterClock')
    }
  }
  return result
}
