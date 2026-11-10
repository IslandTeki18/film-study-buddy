/** Built-ins only; coaches extend these exact values inline, without aliases. */
export const FORMATIONS = [
  'Bunch', 'Double Tight', 'Double Wing', 'Empty', 'Flexbone', 'I Formation',
  'Pistol', 'Shotgun', 'Singleback', 'Split Backs', 'Spread', 'Stack',
  'Strong I', 'Trips', 'Wing-T',
] as const

export const MOTIONS = [
  'Across', 'Arc', 'Fly', 'Glide', 'In', 'Jet', 'Orbit', 'Out',
  'Return', 'Rocket', 'Short', 'Shuffle', 'Trade', 'Yo-Yo', 'Zip',
] as const

/** Weighted toward what the defensive line has to defeat: run schemes first, then pass families. */
export const PLAY_CONCEPTS = [
  'Counter', 'Draw', 'Duo', 'Inside Zone', 'Iso', 'Outside Zone', 'Pin and Pull',
  'Power', 'Split Zone', 'Sweep', 'Toss', 'Trap', 'Wham',
  'Bootleg', 'Dropback', 'Play Action', 'Quick Game', 'RPO', 'Screen', 'Sprint Out',
] as const

export const PERSONNEL = [
  '10', '11', '12', '13', '20', '21', '22', '23', '01', '00',
] as const

export type TerminologyList = 'formations' | 'motions' | 'playConcepts' | 'personnel'

export function builtInTerminology(list: TerminologyList): readonly string[] {
  const lists = { formations: FORMATIONS, motions: MOTIONS, playConcepts: PLAY_CONCEPTS, personnel: PERSONNEL }
  return lists[list]
}

export const TERMINOLOGY_LISTS = ['formations', 'motions', 'playConcepts', 'personnel'] as const satisfies readonly TerminologyList[]
export interface TerminologyRow { readonly list: TerminologyList; readonly value: string; readonly hidden?: boolean | undefined }
export interface TerminologyEntry { list: TerminologyList; value: string; builtIn: boolean }

/** The pick lists the coach sees: built-ins plus coach rows, minus anything the coach removed (a hidden row). */
export function effectiveTerminology(rows: readonly TerminologyRow[]): TerminologyEntry[] {
  const keyOf = (entry: { list: string; value: string }): string => JSON.stringify([entry.list, entry.value])
  const hidden = new Set(rows.filter((row) => row.hidden).map(keyOf))
  const entries: TerminologyEntry[] = TERMINOLOGY_LISTS.flatMap((list) => builtInTerminology(list).map((value) => ({ list, value, builtIn: true })))
  const seen = new Set(entries.map(keyOf))
  for (const row of rows) {
    if (row.hidden || seen.has(keyOf(row))) continue
    seen.add(keyOf(row))
    entries.push({ list: row.list, value: row.value, builtIn: false })
  }
  return entries.filter((entry) => !hidden.has(keyOf(entry)))
}
