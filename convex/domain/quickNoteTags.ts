export const DEFAULT_QUICK_NOTE_TAGS = [
  'Run', 'Pass', 'Formation', 'Personnel', 'Protection', 'Player', 'Situation', 'Review Later',
] as const

export const QUICK_NOTE_TEXT_MAX_LENGTH = 2000
export const QUICK_NOTE_TAG_MAX_LENGTH = 40

export function normalizeQuickNoteTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().slice(0, QUICK_NOTE_TAG_MAX_LENGTH)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

export function tagVocabulary(existing: readonly string[]): string[] {
  const defaults = new Set(DEFAULT_QUICK_NOTE_TAGS.map((tag) => tag.toLowerCase()))
  const custom = normalizeQuickNoteTags(existing).filter((tag) => !defaults.has(tag.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
  return [...DEFAULT_QUICK_NOTE_TAGS, ...custom]
}
