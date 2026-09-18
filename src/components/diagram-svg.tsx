import { useId, type MouseEventHandler, type PointerEventHandler, type ReactNode, type Ref } from 'react'
import { DIAGRAM_ASPECT, FIELD, type DiagramDoc, type DiagramPlayer, type DiagramShape, type PlayerSide } from '@convex/domain/diagram'
import { cn } from '@/lib/utils'

export const PLAYER_RADIUS = 12
export const OL_BOX = { width: 24, height: 17 } as const
const STROKE_WIDTH = 4

export interface DiagramSvgProps {
  readonly diagram: Pick<DiagramDoc, 'players' | 'shapes'>
  readonly className?: string
  readonly title?: string
  /** Designer: the highlighted man (or the man whose zone is highlighted). */
  readonly selectedId?: string
  /** Designer: the side being edited. The other side fades and stops taking pointer events. */
  readonly activeSide?: PlayerSide
  readonly hideSide?: PlayerSide
  /** Designer: while picking a man-coverage target, offense stays clickable even when defense is active. */
  readonly picking?: boolean
  readonly children?: ReactNode
  readonly svgRef?: Ref<SVGSVGElement>
  readonly onPointerDown?: PointerEventHandler<SVGSVGElement>
  readonly onPointerMove?: PointerEventHandler<SVGSVGElement>
  readonly onPointerUp?: PointerEventHandler<SVGSVGElement>
  readonly onPointerLeave?: PointerEventHandler<SVGSVGElement>
  readonly onDoubleClick?: MouseEventHandler<SVGSVGElement>
}

const x = (value: number): number => value * DIAGRAM_ASPECT.width
const y = (value: number): number => value * DIAGRAM_ASPECT.height
const sideColor = (side: PlayerSide): string => side === 'defense' ? 'var(--defense)' : 'var(--primary)'
export const BLOCK_CAP_JOBS: ReadonlySet<string> = new Set(['Block', 'Stalk', 'Crack', 'Rush', 'Contain', 'Spike', 'Blitz A', 'Blitz B', 'Blitz C'])

function legacyShape(shape: DiagramShape, markerId: string): ReactNode {
  const shared = { fill: 'none', strokeWidth: STROKE_WIDTH, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (shape.tool === 'curve') {
    const [x1 = 0, y1 = 0, cx = 0, cy = 0, x2 = 0, y2 = 0] = shape.points
    return <path d={`M ${x(x1)} ${y(y1)} Q ${x(cx)} ${y(cy)} ${x(x2)} ${y(y2)}`} markerEnd={`url(#${markerId})`} {...shared} />
  }
  if (shape.tool === 'free') return <polyline points={shape.points.map((point, index) => `${index % 2 ? y(point) : x(point)}`).join(' ')} {...shared} />
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = shape.points
  if (shape.tool === 'block') {
    const length = Math.hypot(x(x2) - x(x1), y(y2) - y(y1)) || 1
    const dx = ((y(y2) - y(y1)) / length) * 10
    const dy = ((x(x2) - x(x1)) / length) * 10
    return <path d={`M ${x(x1)} ${y(y1)} L ${x(x2)} ${y(y2)} M ${x(x2) - dx} ${y(y2) + dy} L ${x(x2) + dx} ${y(y2) - dy}`} {...shared} />
  }
  return <line x1={x(x1)} y1={y(y1)} x2={x(x2)} y2={y(y2)} markerEnd={shape.tool === 'arrow' ? `url(#${markerId})` : undefined} strokeDasharray={shape.tool === 'dashed' ? '12 10' : undefined} {...shared} />
}

function routePath(player: DiagramPlayer): string | undefined {
  const route = player.route
  if (!route || route.length < 2) return undefined
  let d = `M ${x(player.x)} ${y(player.y)}`
  for (let index = 0; index + 1 < route.length; index += 2) d += ` L ${x(route[index] ?? 0)} ${y(route[index + 1] ?? 0)}`
  return d
}

function wavyPath(a: { x: number; y: number }, b: { x: number; y: number }): string | undefined {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length < 4) return undefined
  const ux = dx / length
  const uy = dy / length
  const amp = 4.5
  const count = Math.max(2, Math.round((length - 14) / 9))
  const start = PLAYER_RADIUS + 1
  const span = length - start - 14
  let path = `M ${(a.x + ux * start).toFixed(1)} ${(a.y + uy * start).toFixed(1)}`
  for (let i = 0; i < count; i += 1) {
    const mid = start + span * (i + 0.5) / count
    const end = start + span * (i + 1) / count
    const offset = i % 2 ? -amp : amp
    path += ` Q ${(a.x + ux * mid - uy * offset).toFixed(1)} ${(a.y + uy * mid + ux * offset).toFixed(1)} ${(a.x + ux * end).toFixed(1)} ${(a.y + uy * end).toFixed(1)}`
  }
  return path
}

function Marker({ player, selected, ink }: { readonly player: DiagramPlayer; readonly selected: boolean; readonly ink: string }): ReactNode {
  const px = x(player.x)
  const py = y(player.y)
  const isLine = player.kind === 'OL'
  const accent = sideColor(player.side)
  const fill = selected ? accent : isLine ? 'var(--muted)' : 'var(--card)'
  const stroke = selected ? accent : player.side === 'defense' ? 'color-mix(in oklch, var(--defense) 55%, var(--border-strong))' : isLine ? 'var(--border-strong)' : 'var(--muted-foreground)'
  const position = isLine ? (player.id.length <= 2 ? player.id : 'OL') : player.kind ?? (player.side === 'defense' ? 'D' : 'O')
  const sub = [player.label, player.jersey && `#${player.jersey}`].filter(Boolean).join(' ')
  return <>
    {isLine
      ? <rect x={px - OL_BOX.width / 2} y={py - OL_BOX.height / 2} width={OL_BOX.width} height={OL_BOX.height} rx="3" fill={fill} stroke={stroke} strokeWidth="1.4" />
      : <circle cx={px} cy={py} r={PLAYER_RADIUS} fill={fill} stroke={stroke} strokeWidth="1.5" />}
    <text x={px} y={py + 3} textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing=".02em" fill={selected ? 'var(--primary-foreground)' : ink} className="font-mono pointer-events-none select-none">{position}</text>
    {sub && <text x={px} y={py + (isLine ? 19 : 22)} textAnchor="middle" fontSize="8" fill={ink} className="font-mono pointer-events-none select-none">{sub}</text>}
  </>
}

export function DiagramSvg({ diagram, className, title = 'Play Diagram', selectedId, activeSide, hideSide, picking, children, svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onDoubleClick }: DiagramSvgProps): ReactNode {
  const uid = useId().replaceAll(':', '')
  const arrowId = `arrow-${uid}`
  const blockId = `block-${uid}`
  const players = hideSide ? diagram.players.filter((player) => player.side !== hideSide) : diagram.players
  const byId = new Map(players.map((player) => [player.id, player]))
  const ink = 'var(--foreground)'
  const isActive = (side: PlayerSide): boolean => activeSide === undefined || activeSide === side
  const interactive = (player: DiagramPlayer): boolean => isActive(player.side) || (picking === true && player.side === 'offense')
  const opacity = (player: DiagramPlayer): number => isActive(player.side) ? 1 : picking && player.side === 'offense' ? 0.7 : 0.28

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${DIAGRAM_ASPECT.width} ${DIAGRAM_ASPECT.height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      role="img"
      aria-label={title}
      className={cn('block rounded-[10px] bg-card text-foreground', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
    >
      <title>{title}</title>
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
        <marker id={blockId} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 2 0 L 2 10" stroke="context-stroke" strokeWidth="2.4" />
        </marker>
      </defs>
      <rect data-role="field" width={DIAGRAM_ASPECT.width} height={DIAGRAM_ASPECT.height} fill="transparent" />
      <g className="pointer-events-none" stroke="var(--border)" strokeWidth="1">
        {FIELD.yardLines.map((py) => <line key={py} x1={FIELD.left} y1={py} x2={FIELD.right} y2={py} />)}
      </g>
      <g className="pointer-events-none" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 7">
        {FIELD.hashes.map((px) => <line key={px} x1={px} y1={FIELD.top} x2={px} y2={FIELD.bottom} />)}
      </g>
      <line className="pointer-events-none" x1={FIELD.left} y1={FIELD.lineOfScrimmage} x2={FIELD.right} y2={FIELD.lineOfScrimmage} stroke="var(--muted-foreground)" strokeOpacity="0.6" strokeWidth="1.5" />

      <g className="pointer-events-none" stroke="currentColor">
        {diagram.shapes.map((shape) => <g key={shape.id}>{legacyShape(shape, arrowId)}</g>)}
      </g>

      {players.map((player) => {
        const d = routePath(player)
        if (!d) return null
        const selected = player.id === selectedId
        return <path key={`route-${player.id}`} className="pointer-events-none" d={d} fill="none" stroke={sideColor(player.side)}
          strokeOpacity={!isActive(player.side) ? 0.22 : selected || activeSide === undefined ? 1 : 0.55}
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={player.side === 'defense' ? '5 4' : undefined}
          markerEnd={`url(#${player.job && BLOCK_CAP_JOBS.has(player.job) ? blockId : arrowId})`} />
      })}

      {players.map((player) => {
        if (!player.motion) return null
        const a = { x: x(player.motion.x), y: y(player.motion.y) }
        const d = wavyPath(a, { x: x(player.x), y: y(player.y) })
        const active = isActive(player.side)
        const color = sideColor(player.side)
        return <g key={`motion-${player.id}`} opacity={active ? 1 : 0.28} className={active ? undefined : 'pointer-events-none'}>
          {d && <path className="pointer-events-none" d={d} fill="none" stroke={color}
            strokeOpacity={!active ? 0.22 : player.id === selectedId || activeSide === undefined ? 1 : 0.55}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${arrowId})`} />}
          <circle data-role="motion" data-id={player.id} cx={a.x} cy={a.y} r={PLAYER_RADIUS} fill="var(--card)" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" className={active ? 'cursor-grab' : undefined} />
          <text x={a.x} y={a.y + 3} textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing=".02em" fill="var(--muted-foreground)" className="font-mono pointer-events-none select-none">{player.kind ?? (player.side === 'defense' ? 'D' : 'O')}</text>
        </g>
      })}

      {players.map((player) => {
        const zone = player.zone
        if (!zone) return null
        const active = isActive(player.side)
        return <g key={`zone-${player.id}`} opacity={active ? 1 : 0.28} className={active ? undefined : 'pointer-events-none'}>
          <path className="pointer-events-none" d={`M ${x(player.x)} ${y(player.y)} L ${x(zone.x)} ${y(zone.y)}`} fill="none" stroke="var(--defense)" strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="3 4" />
          <ellipse data-role="zone" data-id={player.id} cx={x(zone.x)} cy={y(zone.y)} rx={x(zone.rx)} ry={y(zone.ry)} fill="var(--defense)" fillOpacity="0.12" stroke="var(--defense)" strokeOpacity={player.id === selectedId ? 1 : 0.6} strokeWidth="1.8" strokeDasharray="7 5" className={active ? 'cursor-grab' : undefined} />
        </g>
      })}

      {players.map((player) => {
        const target = player.coversId ? byId.get(player.coversId) : undefined
        if (!target) return null
        const dim = activeSide === 'offense' ? 0.3 : 0.85
        return <g key={`man-${player.id}`} className="pointer-events-none" stroke="var(--defense)" opacity={dim} fill="none">
          <path d={`M ${x(player.x)} ${y(player.y)} L ${x(target.x)} ${y(target.y)}`} strokeWidth="1.6" strokeDasharray="2 5" />
          <circle cx={x(target.x)} cy={y(target.y)} r="15" strokeWidth="1.4" strokeDasharray="3 4" />
        </g>
      })}

      {players.map((player) => <g key={player.id} data-role="player" data-id={player.id} opacity={opacity(player)}
        className={interactive(player) ? 'cursor-pointer' : 'pointer-events-none'}>
        <Marker player={player} selected={player.id === selectedId} ink={ink} />
      </g>)}
      {children}
    </svg>
  )
}
