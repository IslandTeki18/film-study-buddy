/** Assumed zone limits use yards from the own goal line; SPEC §22 fixes names only. */
// ponytail: shell boundary checks only; add node --test coverage before Phase 6.
export interface YardLine {
  readonly side: 'own' | 'mid' | 'opp'
  readonly yard: number
}

export const FIELD_ZONES = [
  'Backed Up', 'Own Territory', 'Midfield', 'Plus Territory', 'Red Zone', 'Goal Line',
] as const
export type FieldZone = (typeof FIELD_ZONES)[number]

export const FIELD_ZONE_LIMITS: readonly { readonly zone: FieldZone; readonly max: number }[] = [
  { zone: 'Backed Up', max: 10 },
  { zone: 'Own Territory', max: 39 },
  { zone: 'Midfield', max: 60 },
  { zone: 'Plus Territory', max: 79 },
  { zone: 'Red Zone', max: 94 },
  { zone: 'Goal Line', max: 99 },
]

export function isValidYardLine(value: unknown): value is YardLine {
  if (typeof value !== 'object' || value === null || !('side' in value) || !('yard' in value)) {
    return false
  }
  const { side, yard } = value
  return typeof yard === 'number' && Number.isInteger(yard) && (
    side === 'mid' ? yard === 50 : (side === 'own' || side === 'opp') && yard >= 1 && yard <= 49
  )
}

export function fieldZoneOf(line: YardLine): FieldZone {
  const position = line.side === 'opp' ? 100 - line.yard : line.yard
  return FIELD_ZONE_LIMITS.find(({ max }) => position <= max)?.zone ?? 'Goal Line'
}

export function formatYardLine(line: YardLine): string {
  return line.side === 'mid' ? '50' : `${line.side.toUpperCase()} ${line.yard}`
}

export function parseYardLine(text: string): YardLine | null {
  const trimmed = text.trim()
  if (trimmed === '50') return { side: 'mid', yard: 50 }
  const match = /^(OWN|OPP)\s+(\d{1,2})$/i.exec(trimmed)
  if (!match) return null
  const line = { side: match[1]?.toLowerCase(), yard: Number(match[2]) }
  return isValidYardLine(line) ? line : null
}
