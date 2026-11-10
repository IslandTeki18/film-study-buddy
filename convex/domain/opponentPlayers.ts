/** The opponent's offense, ordered the way a defensive line coach studies it: the men blocking him first. */
export const POSITION_GROUPS = [
  { key: 'OL', label: 'Offensive line' },
  { key: 'TE', label: 'Tight ends' },
  { key: 'RB', label: 'Backs' },
  { key: 'QB', label: 'Quarterback' },
  { key: 'WR', label: 'Receivers' },
] as const
export type PositionGroup = (typeof POSITION_GROUPS)[number]
export type PositionGroupKey = PositionGroup['key']
/** Defensive groups from the multi-coach build. Still readable so old rows validate; never offered. */
export const LEGACY_POSITION_GROUP_KEYS = ['DL', 'LB', 'DB'] as const
export const PLAYER_GRADES = ['A', 'B', 'C'] as const
export const PLAYER_JERSEY_PATTERN = /^\d{1,2}$/
export const PLAYER_POSITION_MAX_LENGTH = 12
export const PLAYER_NAME_MAX_LENGTH = 80
export const PLAYER_DETAILS_MAX_LENGTH = 80
export const PLAYER_TRAIT_MAX_LENGTH = 30
export const PLAYER_TRAITS_MAX = 8
export const PLAYER_PROFILE_TEXT_MAX_LENGTH = 1000
export const PLAYER_NOTE_TEXT_MAX_LENGTH = 2000
export const PLAYER_NOTE_SNAPS_MAX = 20

export function normalizeJersey(value: string): string {
  const jersey = value.trim()
  if (!PLAYER_JERSEY_PATTERN.test(jersey)) throw new Error('Jersey # must be 1–2 digits')
  return jersey
}

export function normalizePosition(value: string): string {
  const position = value.trim()
  if (!position || position.length > PLAYER_POSITION_MAX_LENGTH) throw new Error(`Position must be 1–${PLAYER_POSITION_MAX_LENGTH} characters`)
  return position
}

export function normalizeTraits(values: readonly string[]): string[] {
  const traits = new Map<string, string>()
  for (const value of values) {
    const trait = value.trim()
    if (!trait) continue
    if (trait.length > PLAYER_TRAIT_MAX_LENGTH) throw new Error(`Trait must be at most ${PLAYER_TRAIT_MAX_LENGTH} characters`)
    if (!traits.has(trait.toLowerCase())) traits.set(trait.toLowerCase(), trait)
  }
  if (traits.size > PLAYER_TRAITS_MAX) throw new Error(`Choose at most ${PLAYER_TRAITS_MAX} traits`)
  return [...traits.values()]
}

export function compareJersey(a: string, b: string): number {
  return Number(a) - Number(b) || a.localeCompare(b)
}
