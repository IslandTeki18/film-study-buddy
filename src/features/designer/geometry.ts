import { DIAGRAM_ASPECT, FIELD, YARD_PX } from '../../../convex/domain/diagram.ts'

const aspect = DIAGRAM_ASPECT.width / DIAGRAM_ASPECT.height

/** Pointer position in canvas pixels, letterbox-aware, clamped to the field and optionally snapped to the 1-yard grid. */
export function svgPoint(event: { clientX: number; clientY: number }, svg: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } }, snap: boolean): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const ratio = rect.width / rect.height
  const width = ratio > aspect ? rect.height * aspect : rect.width
  const height = ratio > aspect ? rect.height : rect.width / aspect
  let x = ((event.clientX - rect.left - (rect.width - width) / 2) / width) * DIAGRAM_ASPECT.width
  let y = ((event.clientY - rect.top - (rect.height - height) / 2) / height) * DIAGRAM_ASPECT.height
  if (snap) { x = Math.round(x / YARD_PX) * YARD_PX; y = Math.round(y / YARD_PX) * YARD_PX }
  return { x: Math.min(FIELD.maxX, Math.max(FIELD.minX, x)), y: Math.min(FIELD.maxY, Math.max(FIELD.minY, y)) }
}

/** Length of a polyline in yards, rounded the way a coach would say it. */
export function yards(points: readonly { x: number; y: number }[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return Math.round(total / YARD_PX)
}
