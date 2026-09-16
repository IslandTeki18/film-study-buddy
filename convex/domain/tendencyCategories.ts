import { normalizeName } from './names.ts'

export const DEFAULT_TENDENCY_CATEGORIES = [
  'Run Game', 'Pass Game', 'Personnel', 'Formation', 'Protection',
  'Situational', 'Player / Matchup', 'Trick / Constraint', 'Red Zone',
] as const
export const TENDENCY_NOTE_MAX_LENGTH = 2000
export function normalizeCategoryName(value: string): string | null { return normalizeName(value) }

export function categoryVocabulary(custom: readonly string[]): string[] {
  const seen = new Set<string>(DEFAULT_TENDENCY_CATEGORIES.map((name) => name.toLowerCase()))
  const names: string[] = []
  for (const value of custom) {
    const name = normalizeCategoryName(value)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    names.push(name)
  }
  return [...DEFAULT_TENDENCY_CATEGORIES, ...names.sort((a, b) => a.localeCompare(b))]
}

export function resolveCategory(vocabulary: readonly string[], value: string): string | null {
  return vocabulary.find((name) => name.toLowerCase() === value.trim().toLowerCase()) ?? null
}
