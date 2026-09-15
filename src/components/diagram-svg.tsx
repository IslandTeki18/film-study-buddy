import { useId, type PointerEventHandler, type ReactNode, type Ref } from 'react'
import { DIAGRAM_ASPECT, type DiagramDoc, type DiagramPlayer, type DiagramShape } from '@convex/domain/diagram'
import { cn } from '@/lib/utils'

export const PLAYER_RADIUS = 22
export const STROKE_WIDTH = 4

export interface DiagramSvgProps {
  readonly diagram: Pick<DiagramDoc, 'players' | 'shapes'>
  readonly className?: string
  readonly title?: string
  readonly selectedId?: string
  readonly children?: ReactNode
  readonly svgRef?: Ref<SVGSVGElement>
  readonly onPointerDown?: PointerEventHandler<SVGSVGElement>
  readonly onPointerMove?: PointerEventHandler<SVGSVGElement>
  readonly onPointerUp?: PointerEventHandler<SVGSVGElement>
  readonly onPointerLeave?: PointerEventHandler<SVGSVGElement>
}

function x(value: number): number { return value * DIAGRAM_ASPECT.width }
function y(value: number): number { return value * DIAGRAM_ASPECT.height }

function line(shape: DiagramShape): { x1: number; y1: number; x2: number; y2: number } {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = shape.points
  return { x1: x(x1), y1: y(y1), x2: x(x2), y2: y(y2) }
}

function blockPath(shape: DiagramShape): string {
  const { x1, y1, x2, y2 } = line(shape)
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  const bar = 14
  const dx = ((y2 - y1) / length) * bar
  const dy = ((x2 - x1) / length) * bar
  return `M ${x1} ${y1} L ${x2} ${y2} M ${x2 - dx} ${y2 + dy} L ${x2 + dx} ${y2 - dy}`
}

function shapeElement(shape: DiagramShape, markerId: string): ReactNode {
  const shared = { fill: 'none', strokeWidth: STROKE_WIDTH, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (shape.tool === 'curve') {
    const [x1 = 0, y1 = 0, cx = 0, cy = 0, x2 = 0, y2 = 0] = shape.points
    return <path d={`M ${x(x1)} ${y(y1)} Q ${x(cx)} ${y(cy)} ${x(x2)} ${y(y2)}`} markerEnd={`url(#${markerId})`} {...shared} />
  }
  if (shape.tool === 'free') {
    return <polyline points={shape.points.map((point, index) => `${index % 2 ? y(point) : x(point)}`).join(' ')} {...shared} />
  }
  if (shape.tool === 'block') return <path d={blockPath(shape)} {...shared} />
  const points = line(shape)
  return <line {...points} markerEnd={shape.tool === 'arrow' ? `url(#${markerId})` : undefined} strokeDasharray={shape.tool === 'dashed' ? '12 10' : undefined} {...shared} />
}

function playerElement(player: DiagramPlayer): ReactNode {
  const px = x(player.x)
  const py = y(player.y)
  const triangle = `${px},${py - PLAYER_RADIUS} ${px - 20},${py + 16} ${px + 20},${py + 16}`
  return <>
    {player.side === 'offense' ? <circle cx={px} cy={py} r={PLAYER_RADIUS} fill="currentColor" /> : <polygon points={triangle} fill="currentColor" />}
    {player.label && <text x={px} y={py + 6} textAnchor="middle" fontSize="16" fill="var(--card, #fff)" className="font-semibold">{player.label}</text>}
    {player.jersey && <text x={px} y={py + PLAYER_RADIUS + 15} textAnchor="middle" fontSize="13" fill="currentColor" className="fill-current">{player.jersey}</text>}
  </>
}

export function DiagramSvg({ diagram, className, title = 'Play Diagram', selectedId, children, svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerLeave }: DiagramSvgProps): ReactNode {
  const markerId = `diagram-arrow-${useId().replaceAll(':', '')}`
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${DIAGRAM_ASPECT.width} ${DIAGRAM_ASPECT.height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      role="img"
      aria-label={title}
      className={cn('block text-foreground', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <title>{title}</title>
      <defs>
        <marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <rect width={DIAGRAM_ASPECT.width} height={DIAGRAM_ASPECT.height} fill="var(--muted, #f2f3f5)" className="fill-muted" />
      <g className="stroke-muted-foreground/45" stroke="var(--muted-foreground, #667085)" strokeWidth="2">
        {[1, 2, 3, 4, 5].map((index) => <line key={index} x1={(DIAGRAM_ASPECT.width / 6) * index} y1="0" x2={(DIAGRAM_ASPECT.width / 6) * index} y2={DIAGRAM_ASPECT.height} />)}
        {[90, 510].map((py) => Array.from({ length: 19 }, (_, index) => <line key={`${py}-${index}`} x1={50 + index * 50} y1={py} x2={62 + index * 50} y2={py} />))}
      </g>
      <g className="stroke-current" stroke="currentColor">
        {diagram.shapes.map((shape) => <g key={shape.id} data-id={shape.id}>{shapeElement(shape, markerId)}</g>)}
      </g>
      {diagram.shapes.filter((shape) => shape.id === selectedId).map((shape) => <g key={`selected-${shape.id}`} className="stroke-primary" strokeDasharray="8 7" opacity="0.9">{shapeElement(shape, markerId)}</g>)}
      {diagram.players.map((player) => <g key={player.id} data-id={player.id}>{playerElement(player)}</g>)}
      {diagram.players.filter((player) => player.id === selectedId).map((player) => <circle key={`selected-${player.id}`} cx={x(player.x)} cy={y(player.y)} r={PLAYER_RADIUS + 7} fill="none" className="stroke-primary" strokeWidth="3" strokeDasharray="7 5" />)}
      {children}
    </svg>
  )
}
