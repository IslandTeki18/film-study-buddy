import { DIAGRAM_ASPECT, type DiagramPlayer, type PlayerSide } from '@convex/domain/diagram'

/** Everything here is authored in canvas pixels (620×400, 1 yd = 10 px) and normalized at the edge. */
export interface Px { readonly x: number; readonly y: number }
export const toPx = (player: Pick<DiagramPlayer, 'x' | 'y'>): Px => ({ x: player.x * DIAGRAM_ASPECT.width, y: player.y * DIAGRAM_ASPECT.height })
export const toNorm = (point: Px): { x: number; y: number } => ({ x: point.x / DIAGRAM_ASPECT.width, y: point.y / DIAGRAM_ASPECT.height })
export const routeToNorm = (points: readonly Px[]): number[] => points.flatMap((point) => [point.x / DIAGRAM_ASPECT.width, point.y / DIAGRAM_ASPECT.height])
export function routeToPx(route: readonly number[] | undefined): Px[] {
  const out: Px[] = []
  for (let index = 0; index + 1 < (route?.length ?? 0); index += 2) out.push({ x: (route?.[index] ?? 0) * DIAGRAM_ASPECT.width, y: (route?.[index + 1] ?? 0) * DIAGRAM_ASPECT.height })
  return out
}

const CENTER_X = 306
const LINE = [226, 262, 298, 334, 370].map((x) => ({ x: x + 8.5, y: 252.5 }))
const LINE_IDS = ['LT', 'LG', 'C', 'RG', 'RT'] as const

interface SkillSpot { id: string; x: number; y: number; job: string }
interface Formation { personnel: string; skill: SkillSpot[]; qb: Px }

export const FORMATIONS: Record<string, Formation> = {
  'Gun Trips': { personnel: '11', skill: [
    { id: 'X', x: 96, y: 248, job: 'Go' }, { id: 'Y', x: 424, y: 248, job: 'Drag' }, { id: 'Z', x: 470, y: 264, job: 'Out' },
    { id: 'H', x: 516, y: 248, job: 'Post' }, { id: 'R', x: 350, y: 300, job: 'Swing' }], qb: { x: 306, y: 298 } },
  'Gun Spread': { personnel: '11', skill: [
    { id: 'X', x: 96, y: 248, job: 'Post' }, { id: 'S', x: 168, y: 262, job: 'Drag' }, { id: 'Y', x: 416, y: 248, job: 'Hitch' },
    { id: 'Z', x: 512, y: 248, job: 'Go' }, { id: 'R', x: 350, y: 300, job: 'Block' }], qb: { x: 306, y: 298 } },
  'Gun Empty': { personnel: '10', skill: [
    { id: 'X', x: 88, y: 248, job: 'Go' }, { id: 'S', x: 152, y: 262, job: 'Out' }, { id: 'Y', x: 424, y: 248, job: 'Slant' },
    { id: 'Z', x: 486, y: 262, job: 'Hitch' }, { id: 'H', x: 540, y: 248, job: 'Go' }], qb: { x: 306, y: 298 } },
  'Pistol Ace': { personnel: '12', skill: [
    { id: 'X', x: 108, y: 248, job: 'Go' }, { id: 'Y', x: 400, y: 244, job: 'Block' }, { id: 'U', x: 196, y: 244, job: 'Block' },
    { id: 'Z', x: 512, y: 248, job: 'Corner' }, { id: 'R', x: 306, y: 330, job: 'Swing' }], qb: { x: 306, y: 290 } },
}
export const FORMATION_NAMES = Object.keys(FORMATIONS)

type Template = (out: number) => readonly (readonly [number, number])[]

const OFFENSE_TEMPLATES: Record<string, Template> = {
  Go: () => [[0, -156]], Seam: (o) => [[-o * 16, -156]],
  Post: (o) => [[0, -80], [-o * 74, -152]], Corner: (o) => [[0, -80], [o * 58, -148]],
  Out: (o) => [[0, -62], [o * 62, -62]], Dig: (o) => [[0, -70], [-o * 96, -72]],
  Comeback: (o) => [[0, -102], [o * 28, -70]], Curl: (o) => [[0, -80], [o * 10, -52]],
  Slant: (o) => [[-o * 66, -70]], Hitch: (o) => [[0, -58], [-o * 18, -42]],
  Drag: (o) => [[0, -30], [-o * 150, -34]], Flat: (o) => [[o * 58, -32]],
  Swing: (o) => [[o * 40, -4], [o * 86, -40]], 'Check-release': (o) => [[o * 40, -12], [o * 66, -30]],
  Stalk: () => [[0, -36]], Crack: (o) => [[-o * 62, -28]], Arc: (o) => [[o * 30, -42], [o * 50, -66]], Block: () => [[0, -14]],
}
const DEFENSE_TEMPLATES: Record<string, Template> = {
  Rush: () => [[0, 22]], Contain: (o) => [[o * 26, 20]], Spike: (o) => [[-o * 20, 22]],
  'Blitz A': (o) => [[-o * 40, 48]], 'Blitz B': (o) => [[-o * 12, 52]], 'Blitz C': (o) => [[o * 30, 50]],
  Flat: (o) => [[o * 40, 26]], Hook: (o) => [[-o * 10, -20]], Curl: (o) => [[o * 30, -16]],
  'Deep half': (o) => [[o * 20, -70]], 'Deep third': () => [[0, -78]], 'Deep quarter': (o) => [[-o * 10, -66]],
  Spy: () => [[0, 12]],
}

export const JOB_GROUPS: Record<PlayerSide, readonly { name: string; jobs: readonly string[] }[]> = {
  offense: [
    { name: 'Vertical', jobs: ['Go', 'Seam', 'Post', 'Corner'] },
    { name: 'Breaking', jobs: ['Out', 'Dig', 'Comeback', 'Curl'] },
    { name: 'Underneath', jobs: ['Slant', 'Hitch', 'Drag', 'Flat'] },
    { name: 'Backfield', jobs: ['Swing', 'Check-release'] },
    { name: 'Blocking', jobs: ['Stalk', 'Crack', 'Arc', 'Block'] },
  ],
  defense: [
    { name: 'Coverage', jobs: ['Man', 'Zone'] },
    { name: 'Rush', jobs: ['Rush', 'Contain', 'Spike'] },
    { name: 'Blitz', jobs: ['Blitz A', 'Blitz B', 'Blitz C'] },
    { name: 'Underneath', jobs: ['Flat', 'Hook', 'Curl', 'Spy'] },
    { name: 'Deep', jobs: ['Deep half', 'Deep third', 'Deep quarter'] },
  ],
}

/** Jobs whose route ends in a block bar instead of an arrowhead. */
export const BLOCK_JOBS: ReadonlySet<string> = new Set(['Block', 'Stalk', 'Crack', 'Rush', 'Contain', 'Spike', 'Blitz A', 'Blitz B', 'Blitz C'])

export const ADD_KINDS: Record<PlayerSide, readonly string[]> = {
  offense: ['QB', 'RB', 'FB', 'TE', 'WR', 'OL'],
  defense: ['DE', 'DT', 'DN', 'LB', 'CB', 'FS', 'SS'],
}

/** Where a freshly added man appears before the coach drags him. */
export function spawnPoint(kind: string, side: PlayerSide): Px {
  if (side === 'defense') return { x: CENTER_X, y: ['DE', 'DT', 'DN'].includes(kind) ? 228 : kind === 'LB' ? 190 : 140 }
  return kind === 'OL' ? { x: 410, y: 252 } : { x: CENTER_X, y: 330 }
}

const DEFENSE_BASE: readonly { id: string; kind: string; x: number; y: number; job: string }[] = [
  { id: 'dE', kind: 'DE', x: 212, y: 228, job: 'Contain' }, { id: 'dT', kind: 'DT', x: 262, y: 228, job: 'Rush' },
  { id: 'dN', kind: 'DN', x: 322, y: 228, job: 'Rush' }, { id: 'dE2', kind: 'DE', x: 396, y: 228, job: 'Contain' },
  { id: 'dW', kind: 'LB', x: 240, y: 190, job: 'Hook' }, { id: 'dM', kind: 'LB', x: 306, y: 190, job: 'Hook' },
  { id: 'dS', kind: 'LB', x: 380, y: 190, job: 'Curl' },
  { id: 'dC', kind: 'CB', x: 96, y: 196, job: 'Deep third' }, { id: 'dC2', kind: 'CB', x: 516, y: 196, job: 'Deep third' },
  { id: 'dFS', kind: 'FS', x: 306, y: 118, job: 'Deep third' }, { id: 'dSS', kind: 'SS', x: 400, y: 150, job: 'Flat' },
]

/** Route waypoints for a named job, relative to the man's position. Undefined for Man, Zone, and unknown jobs. */
export function stampRoute(side: PlayerSide, job: string, at: Px): number[] | undefined {
  const template = (side === 'defense' ? DEFENSE_TEMPLATES : OFFENSE_TEMPLATES)[job]
  if (!template) return undefined
  const out = at.x < CENTER_X ? -1 : 1
  return routeToNorm(template(out).map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })))
}

function player(id: string, side: PlayerSide, kind: string, at: Px, job?: string): DiagramPlayer {
  const route = job ? stampRoute(side, job, at) : undefined
  return { id, side, kind, ...toNorm(at), ...(job ? { job } : {}), ...(route ? { route } : {}) }
}

export function baseDefense(): DiagramPlayer[] {
  return DEFENSE_BASE.map((spot) => player(spot.id, 'defense', spot.kind, spot, spot.job))
}

export function buildFormation(name: string): DiagramPlayer[] {
  const formation = FORMATIONS[name]
  if (!formation) return []
  const kindFor = (id: string): string => id === 'R' ? 'RB' : formation.personnel === '12' && (id === 'Y' || id === 'U') ? 'TE' : 'WR'
  return [
    ...LINE.map((spot, index) => player(LINE_IDS[index] ?? 'OL', 'offense', 'OL', spot)),
    player('Q', 'offense', 'QB', formation.qb),
    ...formation.skill.map((spot) => player(spot.id, 'offense', kindFor(spot.id), spot, spot.job)),
    ...baseDefense(),
  ]
}
