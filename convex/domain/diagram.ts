export const DIAGRAM_TOOLS = ['arrow', 'curve', 'block', 'dashed', 'free'] as const
export type DiagramTool = (typeof DIAGRAM_TOOLS)[number]
export type PlayerSide = 'offense' | 'defense'

export interface DiagramPlayer {
  id: string
  side: PlayerSide
  x: number
  y: number
  label?: string
  jersey?: string
}

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
}

export const DIAGRAM_ASPECT = { width: 1000, height: 600 } as const
export const PLAYER_LABEL_MAX_LENGTH = 6
export const PLAYER_JERSEY_MAX_LENGTH = 3
export const DIAGRAM_NOTE_MAX_LENGTH = 2000
export const DIAGRAM_MAX_PLAYERS = 30
export const DIAGRAM_MAX_SHAPES = 200
export const FREEHAND_MAX_POINTS = 400

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
  if (!shape.points.every(Number.isFinite)) throw new Error(`Shape ${shape.id} has invalid points`)

  return { ...shape, points: shape.points.map(clamp01) }
}

/** Validates and canonicalizes a client document. Structural problems reject the entire document. */
export function normalizeDiagram(input: DiagramDoc): DiagramDoc {
  if (input.players.length > DIAGRAM_MAX_PLAYERS) throw new Error(`A diagram can have at most ${DIAGRAM_MAX_PLAYERS} players`)
  if (input.shapes.length > DIAGRAM_MAX_SHAPES) throw new Error(`A diagram can have at most ${DIAGRAM_MAX_SHAPES} shapes`)

  const ids = new Set<string>()
  const players = input.players.map((player) => {
    requireId(player.id, 'player', ids)
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) throw new Error(`Player ${player.id} has invalid coordinates`)
    const label = normalizeText(player.label, PLAYER_LABEL_MAX_LENGTH)
    const jersey = normalizeText(player.jersey, PLAYER_JERSEY_MAX_LENGTH)
    return {
      id: player.id,
      side: player.side,
      x: clamp01(player.x),
      y: clamp01(player.y),
      ...(label ? { label } : {}),
      ...(jersey ? { jersey } : {}),
    }
  })
  const shapes = input.shapes.map((shape) => normalizeShape(shape, ids))
  const note = input.note?.trim()
  if (note && note.length > DIAGRAM_NOTE_MAX_LENGTH) throw new Error(`Diagram note must be ${DIAGRAM_NOTE_MAX_LENGTH} characters or fewer`)

  return {
    players,
    shapes,
    ...(note && { note }),
    ...(input.name !== undefined && { name: input.name.trim() }),
  }
}
