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

export const PLAY_CONCEPTS = [
  'Counter', 'Duo', 'Flood', 'Inside Zone', 'Mesh', 'Outside Zone',
  'Power', 'Screen', 'Split Zone', 'Trap',
] as const

export const PERSONNEL = [
  '10', '11', '12', '13', '20', '21', '22', '23', '01', '00',
] as const

export type TerminologyList = 'formations' | 'motions' | 'playConcepts' | 'personnel'

export function builtInTerminology(list: TerminologyList): readonly string[] {
  const lists = { formations: FORMATIONS, motions: MOTIONS, playConcepts: PLAY_CONCEPTS, personnel: PERSONNEL }
  return lists[list]
}

export const TERMINOLOGY_DESCRIPTION_MAX_LENGTH = 200

/** Default descriptions for built-ins. A coach row's description overrides these. */
export const BUILT_IN_DESCRIPTIONS: Readonly<Partial<Record<TerminologyList, Readonly<Record<string, string>>>>> = {
  formations: {
    'Bunch': 'Three receivers clustered tight to one side, usually in a triangle, to create picks and free releases.',
    'Double Tight': 'Two tight ends attached, one on each side of the line. A run-heavy, gap-scheme look.',
    'Double Wing': 'QB under center with a wingback just outside and behind each tight end. Power and misdirection runs.',
    'Empty': 'No backs in the backfield. Five receivers spread out and the QB alone in the gun.',
    'Flexbone': 'QB under center, fullback right behind him, two slotbacks just off each tackle, two split ends. Triple-option base.',
    'I Formation': 'QB under center with the fullback and tailback stacked in a line directly behind him.',
    'Pistol': 'QB about 4 yards deep with the running back directly behind him. Downhill runs with gun passing.',
    'Shotgun': 'QB 5 to 7 yards behind the center, usually with one back beside him.',
    'Singleback': 'QB under center with one running back about 7 yards deep and no fullback. Also called Ace.',
    'Split Backs': 'Two backs side by side behind the QB, one on each side, instead of stacked.',
    'Spread': 'Three or four receivers split wide across the field with the QB in the gun to stretch the defense sideways.',
    'Stack': 'Two receivers lined up one directly behind the other so the back one gets a free release.',
    'Strong I': 'I Formation with the fullback offset toward the tight end (strong) side.',
    'Trips': 'Three receivers to one side of the formation and one or none to the other.',
    'Wing-T': 'QB under center, fullback behind, wingback outside the tight end, and a halfback. Built on buck sweep, traps, and misdirection.',
  },
  playConcepts: {
    'Counter': 'Backfield steps one way, then the ball goes back the other. A pulling guard kicks out and a tackle or H-back leads through.',
    'Duo': 'Inside run with double-teams at the point of attack and no pullers. The back reads the linebacker.',
    'Flood': 'Three receivers at three depths (deep, middle, flat) to one side to overload a zone.',
    'Inside Zone': 'Line steps playside and blocks an area. The back aims at the guard and can cut back.',
    'Mesh': 'Two shallow crossers from opposite sides rub past each other underneath. Built to beat man coverage.',
    'Outside Zone': 'Line reaches playside. The back aims outside the tackle or tight end, then bounces, bends, or cuts back. Also called Stretch.',
    'Power': 'Gap run: double-team at the point of attack, backside guard pulls through the hole, fullback or H-back kicks out the end.',
    'Screen': 'Linemen let the rush through, then release to block for a short throw behind the line.',
    'Split Zone': 'Inside zone with an H-back or tight end crossing the formation to block the backside end.',
    'Trap': 'An interior defender is left unblocked on purpose, then blocked from the side by a pulling lineman.',
  },
}

export function builtInDescription(list: TerminologyList, value: string): string | undefined {
  return BUILT_IN_DESCRIPTIONS[list]?.[value]
}

export const TERMINOLOGY_LISTS = ['formations', 'motions', 'playConcepts', 'personnel'] as const satisfies readonly TerminologyList[]
export interface TerminologyRow {
  readonly list: TerminologyList; readonly value: string; readonly hidden?: boolean | undefined; readonly description?: string | undefined
}
export interface TerminologyEntry { list: TerminologyList; value: string; builtIn: boolean; description?: string }

/** The pick lists the coach sees: built-ins plus coach rows, minus anything the coach removed (a hidden row). */
export function effectiveTerminology(rows: readonly TerminologyRow[]): TerminologyEntry[] {
  const keyOf = (entry: { list: string; value: string }): string => JSON.stringify([entry.list, entry.value])
  const hidden = new Set(rows.filter((row) => row.hidden).map(keyOf))
  const described = new Map(rows.flatMap((row) => row.description ? [[keyOf(row), row.description] as const] : []))
  const withDescription = (entry: TerminologyEntry): TerminologyEntry => {
    const description = described.get(keyOf(entry)) ?? builtInDescription(entry.list, entry.value)
    return description ? { ...entry, description } : entry
  }
  const entries: TerminologyEntry[] = TERMINOLOGY_LISTS.flatMap((list) => builtInTerminology(list).map((value) => ({ list, value, builtIn: true })))
  const seen = new Set(entries.map(keyOf))
  for (const row of rows) {
    if (row.hidden || seen.has(keyOf(row))) continue
    seen.add(keyOf(row))
    entries.push({ list: row.list, value: row.value, builtIn: false })
  }
  return entries.filter((entry) => !hidden.has(keyOf(entry))).map(withDescription)
}
