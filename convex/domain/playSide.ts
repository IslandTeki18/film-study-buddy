/** Which side of the offense a Play Type and a Coaching Template Section belong to. */
import type { PlayType } from './coreFields.ts'

export type PlaySide = 'run' | 'pass' | 'both'

// ponytail: fixed table; Draw is a run, Screen is a pass. Change here if a coach disagrees.
const PLAY_TYPE_SIDES: Readonly<Record<PlayType, PlaySide>> = {
  'Run': 'run', 'QB Run': 'run', 'Draw': 'run',
  'Pass': 'pass', 'Play Action': 'pass', 'Screen': 'pass',
  'RPO': 'both', 'Special / Trick': 'both', 'Other': 'both',
}

export function playSideOf(playType: unknown): PlaySide {
  return typeof playType === 'string' && Object.hasOwn(PLAY_TYPE_SIDES, playType)
    ? PLAY_TYPE_SIDES[playType as PlayType]
    : 'both'
}

// ponytail: name rule ("Run Game", "Pass Protection"); add a playSide column on
// templateSections if coaches need explicit control.
export function sectionSideOf(sectionName: string): PlaySide {
  const run = /\brun\b/i.test(sectionName)
  const pass = /\bpass\b/i.test(sectionName)
  return run === pass ? 'both' : run ? 'run' : 'pass'
}

export function sectionAppliesTo(sectionName: string, playType: unknown): boolean {
  const side = playSideOf(playType)
  const section = sectionSideOf(sectionName)
  return side === 'both' || section === 'both' || side === section
}
