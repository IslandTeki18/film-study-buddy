export const DIAGRAM_TOOLS = ['arrow', 'curve', 'block', 'dashed', 'free'] as const
export function attachedSnapIds<T extends string>(diagram: { snapId?: T; snapIds?: T[] }): T[] {
  return diagram.snapIds ?? (diagram.snapId ? [diagram.snapId] : [])
}

export type DiagramTool = (typeof DIAGRAM_TOOLS)[number]
export const PLAYER_SIDES = ['offense', 'defense'] as const
export type PlayerSide = (typeof PLAYER_SIDES)[number]

/** A defender's zone responsibility. Normalized 0–1 like every other coordinate. */
export interface DiagramZone {
  x: number
  y: number
  rx: number
  ry: number
}

export interface DiagramPlayer {
  id: string
  side: PlayerSide
  x: number
  y: number
  /** Position group shown inside the marker: QB, WR, OL, DE, LB… */
  kind?: string
  /** Free text shown under the marker, e.g. "#7 Ortiz". */
  label?: string
  jersey?: string
  /** Named assignment ("Post", "Blitz A", "custom") — drives the route cap and roster text. */
  job?: string
  /** Route waypoints after the player's own position, flat [x, y, x, y…]. */
  route?: number[]
  zone?: DiagramZone
  /** Defense only: id of the offensive player this man covers. */
  coversId?: string
}

/** Legacy free-drawn shapes. The designer no longer creates them; existing ones still render. */
export interface DiagramShape {
  id: string
  tool: DiagramTool
  points: number[]
}

export interface DiagramDoc {
  players: DiagramPlayer[]
  shapes: DiagramShape[]
  note?: string
  name?: string
  hiddenSide?: PlayerSide
}

/** Canvas units. 1 yard = YARD_PX; the field strip is drawn in these units and stored normalized. */
export const DIAGRAM_ASPECT = { width: 620, height: 400 } as const
export const YARD_PX = 10
export const FIELD = {
  left: 40, right: 580, top: 55, bottom: 380,
  lineOfScrimmage: 252,
  yardLines: [60, 110, 160, 210, 300, 350],
  hashes: [232, 388],
  /** Pointer clamp so a man can never be dragged off the drawn field. */
  minX: 20, maxX: 600, minY: 30, maxY: 390,
} as const

export const PLAYER_KIND_MAX_LENGTH = 4
export const PLAYER_LABEL_MAX_LENGTH = 24
export const PLAYER_JERSEY_MAX_LENGTH = 3
export const PLAYER_JOB_MAX_LENGTH = 16
export const ROUTE_MAX_POINTS = 40
export const DIAGRAM_NOTE_MAX_LENGTH = 2000
export const DIAGRAM_MAX_PLAYERS = 30
export const DIAGRAM_MAX_SHAPES = 200
export const FREEHAND_MAX_POINTS = 400
export const FORMATION_NAME_MAX_LENGTH = 40

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function requireId(id: string, kind: string, ids: Set<string>): void {
  if (!id.trim()) throw new Error(`Every ${kind} needs an id`)
  if (ids.has(id)) throw new Error(`Duplicate diagram id: ${id}`)
  ids.add(id)
}

function normalizeText(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim().slice(0, maxLength)
  return trimmed || undefined
}

function requireFinite(values: readonly number[], what: string): void {
  if (!values.every(Number.isFinite)) throw new Error(`${what} has invalid coordinates`)
}

function pointCount(tool: DiagramTool): number | undefined {
  if (tool === 'curve') return 6
  if (tool === 'free') return undefined
  return 4
}

function normalizeShape(shape: DiagramShape, ids: Set<string>): DiagramShape {
  requireId(shape.id, 'shape', ids)
  if (!DIAGRAM_TOOLS.includes(shape.tool)) throw new Error(`Unknown diagram tool: ${shape.tool}`)
  if (shape.points.length % 2) throw new Error(`Shape ${shape.id} needs an even number of points`)

  const expected = pointCount(shape.tool)
  if (expected !== undefined && shape.points.length !== expected) {
    throw new Error(`${shape.tool} shape needs exactly ${expected} points`)
  }
  if (shape.tool === 'free' && (shape.points.length < 4 || shape.points.length > FREEHAND_MAX_POINTS * 2)) {
    throw new Error(`Freehand shape needs 4 to ${FREEHAND_MAX_POINTS * 2} points`)
  }
  requireFinite(shape.points, `Shape ${shape.id}`)

  return { ...shape, points: shape.points.map(clamp01) }
}

function normalizePlayer(player: DiagramPlayer, ids: Set<string>): DiagramPlayer {
  requireId(player.id, 'player', ids)
  if (!PLAYER_SIDES.includes(player.side)) throw new Error(`Unknown player side: ${player.side}`)
  requireFinite([player.x, player.y], `Player ${player.id}`)
  if (player.route) {
    if (player.route.length % 2) throw new Error(`Player ${player.id} route needs an even number of points`)
    if (player.route.length > ROUTE_MAX_POINTS * 2) throw new Error(`A route can have at most ${ROUTE_MAX_POINTS} points`)
    requireFinite(player.route, `Player ${player.id} route`)
  }
  if (player.zone) requireFinite([player.zone.x, player.zone.y, player.zone.rx, player.zone.ry], `Player ${player.id} zone`)
  const kind = normalizeText(player.kind, PLAYER_KIND_MAX_LENGTH)
  const label = normalizeText(player.label, PLAYER_LABEL_MAX_LENGTH)
  const jersey = normalizeText(player.jersey, PLAYER_JERSEY_MAX_LENGTH)
  const job = normalizeText(player.job, PLAYER_JOB_MAX_LENGTH)
  const route = player.route?.length ? player.route.map(clamp01) : undefined
  const zone = player.zone
    ? { x: clamp01(player.zone.x), y: clamp01(player.zone.y), rx: Math.min(1, Math.max(0.01, player.zone.rx)), ry: Math.min(1, Math.max(0.01, player.zone.ry)) }
    : undefined
  return {
    id: player.id,
    side: player.side,
    x: clamp01(player.x),
    y: clamp01(player.y),
    ...(kind ? { kind } : {}),
    ...(label ? { label } : {}),
    ...(jersey ? { jersey } : {}),
    ...(job ? { job } : {}),
    ...(route ? { route } : {}),
    ...(zone ? { zone } : {}),
    ...(player.coversId ? { coversId: player.coversId } : {}),
  }
}

/** Validates and canonicalizes a client document. Structural problems reject the entire document. */
export function normalizeDiagram(input: DiagramDoc): DiagramDoc {
  if (input.players.length > DIAGRAM_MAX_PLAYERS) throw new Error(`A diagram can have at most ${DIAGRAM_MAX_PLAYERS} players`)
  if (input.shapes.length > DIAGRAM_MAX_SHAPES) throw new Error(`A diagram can have at most ${DIAGRAM_MAX_SHAPES} shapes`)

  const ids = new Set<string>()
  const players = input.players.map((player) => normalizePlayer(player, ids))
  // A man assignment must point at a live offensive player; a dangling one is dropped, not saved.
  const offense = new Set(players.filter((player) => player.side === 'offense').map((player) => player.id))
  for (const player of players) {
    if (player.coversId !== undefined && (player.side !== 'defense' || !offense.has(player.coversId))) delete player.coversId
  }
  const shapes = input.shapes.map((shape) => normalizeShape(shape, ids))
  const note = input.note?.trim()
  if (note && note.length > DIAGRAM_NOTE_MAX_LENGTH) throw new Error(`Diagram note must be ${DIAGRAM_NOTE_MAX_LENGTH} characters or fewer`)

  return {
    players,
    shapes,
    ...(note && { note }),
    ...(input.hiddenSide && { hiddenSide: input.hiddenSide }),
    ...(input.name !== undefined && { name: input.name.trim() }),
  }
}
