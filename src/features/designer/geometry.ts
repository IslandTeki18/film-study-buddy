import { clamp01, DIAGRAM_ASPECT, FREEHAND_MAX_POINTS, type DiagramPlayer, type DiagramShape } from '../../../convex/domain/diagram.ts'

const aspect = DIAGRAM_ASPECT.width / DIAGRAM_ASPECT.height

export function toNormalized(event: { clientX: number; clientY: number }, svg: SVGSVGElement): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const ratio = rect.width / rect.height
  const width = ratio > aspect ? rect.height * aspect : rect.width
  const height = ratio > aspect ? rect.height : rect.width / aspect
  return {
    x: clamp01((event.clientX - rect.left - (rect.width - width) / 2) / width),
    y: clamp01((event.clientY - rect.top - (rect.height - height) / 2) / height),
  }
}

export function curveControl(x1: number, y1: number, x2: number, y2: number): { cx: number; cy: number } {
  const dx = x2 - x1
  const dy = y2 - y1
  return { cx: clamp01((x1 + x2) / 2 - dy * 0.12), cy: clamp01((y1 + y2) / 2 + dx * 0.12) }
}

export function simplifyFreehand(points: number[]): number[] {
  const output = points.slice(0, 2)
  // ponytail: cap sampled points for document size; use a curve simplifier if dense paths need fidelity.
  for (let index = 2; index + 1 < points.length && output.length < FREEHAND_MAX_POINTS * 2; index += 2) {
    const x = points[index] ?? 0
    const y = points[index + 1] ?? 0
    if (Math.hypot(x - (output.at(-2) ?? x), y - (output.at(-1) ?? y)) >= 0.005) output.push(x, y)
  }
  const lastX = points.at(-2)
  const lastY = points.at(-1)
  if (lastX !== undefined && lastY !== undefined && (output.at(-2) !== lastX || output.at(-1) !== lastY) && output.length < FREEHAND_MAX_POINTS * 2) output.push(lastX, lastY)
  return output
}

export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : clamp01(((px - x1) * dx + (py - y1) * dy) / length)
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function pointsFor(shape: DiagramShape): number[] {
  if (shape.tool !== 'curve') return shape.points
  const [x1 = 0, y1 = 0, cx = 0, cy = 0, x2 = 0, y2 = 0] = shape.points
  return Array.from({ length: 17 }, (_, index) => {
    const t = index / 16
    return [
      (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2,
      (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2,
    ]
  }).flat()
}

export function hitTestShape(shapes: DiagramShape[], x: number, y: number, tolerance = 0.02): DiagramShape | undefined {
  return [...shapes].reverse().find((shape) => {
    const points = pointsFor(shape)
    for (let index = 0; index + 3 < points.length; index += 2) {
      if (distanceToSegment(x, y, points[index] ?? 0, points[index + 1] ?? 0, points[index + 2] ?? 0, points[index + 3] ?? 0) <= tolerance) return true
    }
    return false
  })
}

export function hitTestPlayer(players: DiagramPlayer[], x: number, y: number, radius = 0.03): DiagramPlayer | undefined {
  return [...players].reverse().find((player) => Math.hypot(player.x - x, player.y - y) <= radius)
}

export function nudge(value: number, delta: number): number { return clamp01(value + delta) }
