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
