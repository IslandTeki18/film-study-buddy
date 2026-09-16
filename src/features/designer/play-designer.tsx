import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { DIAGRAM_NOTE_MAX_LENGTH, FORMATION_NAME_MAX_LENGTH, PLAYER_LABEL_MAX_LENGTH, YARD_PX, type DiagramDoc, type DiagramPlayer, type PlayerSide } from '@convex/domain/diagram'
import { DiagramSvg } from '@/components/diagram-svg'
import { Button } from '@/components/ui/button'
import { Eyebrow, Meta, Page, Panel } from '@/components/ui/panel'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAutosave } from '@/lib/db/use-autosave'
import { inDialog } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { svgPoint, yards } from './geometry'
import { ADD_KINDS, BLOCK_JOBS, FORMATION_NAMES, JOB_GROUPS, baseDefense, buildFormation, routeToPx, spawnPoint, stampRoute, toNorm, toPx, type Px } from './playbook'

const ZONE_DEFAULT = { dy: -62, rx: 48, ry: 30 } as const
const ZONE_MIN = { rx: 18, ry: 14 } as const

type Drag =
  | { kind: 'player'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'zone-resize'; id: string }
  | { kind: 'point'; id: string; index: number }

const chipBase = 'rounded-[7px] border px-3 py-1.5 font-mono text-[10.5px] leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
function chip(active: boolean, tone: PlayerSide | 'neutral' = 'neutral', dashed = false): string {
  if (active && tone === 'neutral') return cn(chipBase, 'border-primary bg-transparent text-primary')
  if (active) return cn(chipBase, 'font-semibold text-primary-foreground', tone === 'defense' ? 'border-defense bg-defense' : 'border-primary bg-primary')
  return cn(chipBase, 'text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground', dashed ? 'border-dashed border-border-strong bg-transparent' : 'border-border-strong bg-muted')
}

export function PlayDesigner({ workspaceId, sourceGameId, diagramId }: {
  readonly workspaceId: string; readonly sourceGameId: string; readonly diagramId: string
}): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const diagram = useQuery(api.diagrams.get, { diagramId })
  const base = `/w/${workspaceId}/games/${sourceGameId}/diagrams`
  if (game === undefined || diagram === undefined || workspace === undefined) return <main className="p-6">Loading…</main>
  if (!game || game.workspaceId !== workspaceId || !diagram || diagram.sourceGameId !== game._id) return <main className="space-y-3 p-6">
    <p>Play Diagram not found</p><Link className="underline" to={base}>Back to Play Diagrams</Link>
  </main>
  return <DesignerContent key={diagram._id} workspaceId={workspaceId} sourceGameId={game._id} opponentName={workspace?.opponentName ?? game.label} diagram={diagram} />
}

function DesignerContent({ workspaceId, sourceGameId, opponentName, diagram }: {
  readonly workspaceId: string; readonly sourceGameId: Id<'sourceGames'>; readonly opponentName: string
  readonly diagram: Pick<Doc<'diagrams'>, '_id' | 'updatedAt' | 'players' | 'shapes' | 'note' | 'snapId' | 'hiddenSide'>
}): ReactNode {
  const save = useMutation(api.diagrams.save)
  const saveFormation = useMutation(api.formations.save)
  const removeFormation = useMutation(api.formations.remove)
  const customs = useQuery(api.formations.list) ?? []
  const snap = useQuery(api.snaps.get, diagram.snapId ? { snapId: diagram.snapId } : 'skip')
  const { show } = useToast()
  const serverDoc = useMemo<DiagramDoc>(() => ({ players: diagram.players, shapes: diagram.shapes, ...(diagram.note ? { note: diagram.note } : {}), ...(diagram.hiddenSide ? { hiddenSide: diagram.hiddenSide } : {}) }), [diagram.updatedAt])
  const { draft, setDraft, flush, status } = useAutosave(serverDoc, async (next) => {
    await save({ diagramId: diagram._id, players: next.players, shapes: next.shapes, ...(next.note !== undefined ? { note: next.note } : {}), ...(next.hiddenSide ? { hiddenSide: next.hiddenSide } : {}) })
  })
  const draftRef = useRef(draft)
  draftRef.current = draft
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | undefined>(undefined)
  const [preview, setPreview] = useState<DiagramPlayer[] | undefined>(undefined)
  const [side, setSide] = useState<PlayerSide>('offense')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [picking, setPicking] = useState<string | undefined>(undefined)
  const [formation, setFormation] = useState<string | undefined>(undefined)
  const [naming, setNaming] = useState<string | undefined>(undefined)

  const players = preview ?? draft.players
  const selected = players.find((player) => player.id === selectedId)
  const otherSide: PlayerSide = side === 'offense' ? 'defense' : 'offense'
  const isDefense = side === 'defense'
  // The hidden side is part of the document so the gallery and Play Detail show exactly what the designer shows.
  const hideOther = draft.hiddenSide === otherSide
  function setHideOther(hide: boolean): void {
    const { hiddenSide: _previous, ...rest } = draftRef.current
    setDraft(hide ? { ...rest, hiddenSide: otherSide } : rest)
  }
  const base = `/w/${workspaceId}/games/${sourceGameId}`

  function setPlayers(next: DiagramPlayer[]): void { setDraft({ ...draftRef.current, players: next }) }
  function patch(id: string, update: (player: DiagramPlayer) => DiagramPlayer): void {
    setPlayers(draftRef.current.players.map((player) => player.id === id ? update(player) : player))
  }
  function strip(player: DiagramPlayer, keys: readonly ('route' | 'zone' | 'coversId' | 'job')[]): DiagramPlayer {
    const next = { ...player }
    for (const key of keys) delete next[key]
    return next
  }

  // Canvas interaction. Every element that can be grabbed carries data-role/data-id; one handler dispatches on it.
  function hit(event: { target: EventTarget }): { role: string; id: string; index: number } | undefined {
    const element = event.target instanceof Element ? event.target.closest('[data-role]') : null
    if (!element) return undefined
    return { role: element.getAttribute('data-role') ?? '', id: element.getAttribute('data-id') ?? '', index: Number(element.getAttribute('data-index') ?? -1) }
  }
  function point(event: { clientX: number; clientY: number }): Px {
    return svgRef.current ? svgPoint(event, svgRef.current, snapToGrid) : { x: 0, y: 0 }
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>): void {
    const target = hit(event)
    const at = point(event)
    if (target?.role === 'player') {
      const player = players.find((entry) => entry.id === target.id)
      if (!player) return
      if (picking && player.side === 'offense') {
        patch(picking, (defender) => ({ ...strip(defender, ['route', 'zone']), job: 'Man', coversId: player.id }))
        setPicking(undefined)
        return
      }
      if (player.side !== side) return
      drag.current = { kind: 'player', id: player.id }
      setSelectedId(player.id)
    } else if (target?.role === 'zone' || target?.role === 'zone-resize') {
      drag.current = { kind: target.role, id: target.id }
      setSelectedId(target.id)
    } else if (target?.role === 'point' && selected) {
      drag.current = { kind: 'point', id: selected.id, index: target.index }
    } else {
      if (picking) { setPicking(undefined); return }
      if (!selected) return
      patch(selected.id, (player) => ({
        ...player,
        route: [...(player.route ?? []), ...Object.values(toNorm(at))],
        job: player.job && BLOCK_JOBS.has(player.job) ? player.job : 'custom',
      }))
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function applyDrag(active: Drag, at: Px): DiagramPlayer[] {
    return draftRef.current.players.map((player) => {
      if (player.id !== active.id) return player
      if (active.kind === 'player') {
        const from = toPx(player)
        const dx = (at.x - from.x) / (toPx({ x: 1, y: 0 }).x)
        const dy = (at.y - from.y) / (toPx({ x: 0, y: 1 }).y)
        return { ...player, ...toNorm(at), ...(player.route ? { route: player.route.map((value, index) => Math.min(1, Math.max(0, value + (index % 2 ? dy : dx)))) } : {}) }
      }
      if (active.kind === 'zone' && player.zone) return { ...player, zone: { ...player.zone, ...toNorm(at) } }
      if (active.kind === 'zone-resize' && player.zone) {
        const center = toPx(player.zone)
        const radii = toNorm({ x: Math.max(ZONE_MIN.rx, Math.abs(at.x - center.x)), y: Math.max(ZONE_MIN.ry, Math.abs(at.y - center.y)) })
        return { ...player, zone: { ...player.zone, rx: radii.x, ry: radii.y } }
      }
      if (active.kind === 'point' && player.route) {
        const route = [...player.route]
        const normalized = toNorm(at)
        route[active.index * 2] = normalized.x
        route[active.index * 2 + 1] = normalized.y
        return { ...player, route }
      }
      return player
    })
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>): void {
    if (!drag.current) return
    setPreview(applyDrag(drag.current, point(event)))
  }

  function onPointerUp(): void {
    if (!drag.current) return
    drag.current = undefined
    if (preview) setPlayers(preview)
    setPreview(undefined)
  }

  function onDoubleClick(event: MouseEvent<SVGSVGElement>): void {
    const target = hit(event)
    if (target?.role !== 'point' || !selected) return
    removePoint(selected.id, target.index)
  }

  function removePoint(id: string, index: number): void {
    patch(id, (player) => {
      const route = (player.route ?? []).filter((_, position) => Math.floor(position / 2) !== index)
      if (route.length === 0) return strip(player, ['route', 'job'])
      return { ...player, route, job: player.job && BLOCK_JOBS.has(player.job) ? player.job : 'custom' }
    })
  }

  function removeSelected(): void {
    if (!selected) return
    setPlayers(draftRef.current.players.filter((player) => player.id !== selected.id).map((player) => player.coversId === selected.id ? strip(player, ['coversId']) : player))
    setSelectedId(undefined)
  }

  function stamp(job: string): void {
    if (!selected) return
    const at = toPx(selected)
    setPicking(undefined)
    if (job === 'Zone') {
      const center = toNorm({ x: at.x, y: at.y + ZONE_DEFAULT.dy })
      const radii = toNorm({ x: ZONE_DEFAULT.rx, y: ZONE_DEFAULT.ry })
      patch(selected.id, (player) => ({ ...strip(player, ['route', 'coversId']), job, zone: { ...center, rx: radii.x, ry: radii.y } }))
      return
    }
    if (job === 'Man') {
      const { hiddenSide: _previous, ...current } = draftRef.current
      setDraft({ ...current, players: current.players.map((player) => player.id === selected.id
        ? { ...strip(player, ['route', 'zone', 'coversId']), job } : player) })
      setPicking(selected.id)
      return
    }
    const route = stampRoute(side, job, at)
    patch(selected.id, (player) => ({ ...strip(player, ['route', 'zone', 'coversId']), job, ...(route ? { route } : {}) }))
  }

  function addPlayer(kind: string): void {
    const taken = new Set(draftRef.current.players.map((player) => player.id))
    let index = 1
    while (taken.has(`${kind}${index}`)) index += 1
    const id = `${kind}${index}`
    setPlayers([...draftRef.current.players, { id, side, kind, ...toNorm(spawnPoint(kind, side)) }])
    setSelectedId(id)
  }

  function load(name: string, next: DiagramPlayer[]): void {
    setPlayers(next)
    setFormation(name)
    setSide('offense')
    setPicking(undefined)
    setSelectedId(next.find((player) => player.side === 'offense' && player.kind !== 'OL' && player.kind !== 'QB')?.id)
  }
  function loadCustom(custom: Doc<'formations'>): void {
    const offense = custom.players.map((player) => ({ ...player, side: 'offense' as const }))
    load(custom.name, [...offense, ...baseDefense()])
  }
  function reset(): void {
    const custom = customs.find((entry) => entry.name === formation)
    if (custom) loadCustom(custom)
    else if (formation) load(formation, buildFormation(formation))
    else { setPlayers([]); setSelectedId(undefined) }
  }
  function confirmSave(): void {
    const name = naming?.trim()
    if (!name) return
    void saveFormation({ name, players: draftRef.current.players.filter((player) => player.side === 'offense') })
      .then(() => { setFormation(name); setNaming(undefined) })
      .catch((error: unknown) => show({ message: `Could not save formation. ${error instanceof Error ? error.message : String(error)}` }))
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const target = event.target
    if (event.defaultPrevented || inDialog(target) || (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]'))) return
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); return }
    if (event.key === 'Escape') { event.preventDefault(); drag.current = undefined; setPreview(undefined); if (picking) setPicking(undefined); else setSelectedId(undefined); return }
    const delta = (event.shiftKey ? 5 : 1) * YARD_PX
    const directions: Record<string, readonly [number, number]> = { ArrowUp: [0, -delta], ArrowDown: [0, delta], ArrowLeft: [-delta, 0], ArrowRight: [delta, 0] }
    const direction = directions[event.key]
    if (selected && direction) {
      event.preventDefault()
      const from = toPx(selected)
      setPlayers(applyDrag({ kind: 'player', id: selected.id }, { x: from.x + direction[0], y: from.y + direction[1] }))
    }
  }

  const routePx = selected ? routeToPx(selected.route) : []
  const path = selected ? [toPx(selected), ...routePx] : []
  const roster = players.filter((player) => player.side === side)
  const coverTarget = selected?.coversId ? players.find((player) => player.id === selected.coversId) : undefined
  const pickingPlayer = picking ? players.find((player) => player.id === picking) : undefined
  const describe = (player: DiagramPlayer): string => `${player.kind === 'OL' ? player.id : player.kind ?? player.side}${player.label ? ` ${player.label}` : ''}`
  const statusText = status === 'idle' ? 'saved' : status === 'saving' ? 'saving…' : status === 'pending' ? 'unsaved' : 'save failed'
  const toneClass = isDefense ? 'text-defense' : 'text-primary'

  return <Page width="max-w-[1100px]">
    <Panel className="overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-accent/60 px-4 py-3">
        <Eyebrow>Play designer</Eyebrow>
        <span className="text-border-strong">/</span>
        <span className="text-[13px] font-semibold">{opponentName} — {diagram.snapId ? (snap ? `Snap ${snap.core.clipNumber ?? snap.order}` : 'Snap') : 'new play'}</span>
        <div role="radiogroup" aria-label="Side" className="ml-2 flex gap-1.5">
          {(['offense', 'defense'] as const).map((entry) => <button key={entry} type="button" role="radio" aria-checked={side === entry} className={chip(side === entry, entry)}
            onClick={() => { setSide(entry); setPicking(undefined); setSelectedId(players.find((player) => player.side === entry)?.id) }}>{entry === 'offense' ? 'Offense' : 'Defense'}</button>)}
        </div>
        <button type="button" className={chip(hideOther)} aria-pressed={hideOther} onClick={() => setHideOther(!hideOther)}>{hideOther ? 'show' : 'hide'} {otherSide}</button>
        <Meta>{otherSide} {hideOther ? 'off the field' : 'faded'} · editing the {side}</Meta>
        <div className="ml-auto flex items-center gap-2">
          <Meta className={status === 'error' ? 'text-warm' : undefined}>{statusText}</Meta>
          {status === 'error' && <Button size="sm" variant="outline" onClick={flush}>retry</Button>}
          <button type="button" className={chip(false)} onClick={reset}>reset</button>
          <Link className={chip(false)} to={`${base}/diagrams`}>back to diagrams</Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-background/60 px-4 py-3">
        <Eyebrow className="text-[9.5px]">Start from</Eyebrow>
        <div className="flex flex-wrap items-center gap-1.5">
          {FORMATION_NAMES.map((name) => <button key={name} type="button" className={chip(formation === name, 'offense')} onClick={() => load(name, buildFormation(name))}>{name}</button>)}
          {customs.length > 0 && <span className="mx-1 h-5 w-px bg-border-strong" />}
          {customs.map((custom) => <span key={custom._id} className={cn(chip(formation === custom.name, 'offense', formation !== custom.name), 'inline-flex items-center gap-2 pr-2')}>
            <button type="button" className="outline-none" onClick={() => loadCustom(custom)}>{custom.name}</button>
            <button type="button" aria-label={`Forget formation ${custom.name}`} title="forget this formation" className="text-[12px] leading-none opacity-70 hover:opacity-100"
              onClick={() => { if (formation === custom.name) setFormation(undefined); void removeFormation({ formationId: custom._id }) }}>×</button>
          </span>)}
          {naming === undefined
            ? <button type="button" className={chip(false, 'neutral', true)} title="save the current offensive alignment as a formation" onClick={() => setNaming(`Custom ${customs.length + 1}`)}>+ save as formation</button>
            : <form className="flex items-center gap-1.5" onSubmit={(event) => { event.preventDefault(); confirmSave() }}>
              <input autoFocus aria-label="Formation name" placeholder="formation name" maxLength={FORMATION_NAME_MAX_LENGTH} value={naming} onChange={(event) => setNaming(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') setNaming(undefined) }}
                className="w-[150px] rounded-[7px] border border-primary bg-muted px-2.5 py-1.5 font-mono text-[10.5px] outline-none" />
              <button type="submit" className={chip(true, 'offense')}>save</button>
              <button type="button" className={chip(false)} onClick={() => setNaming(undefined)}>cancel</button>
            </form>}
        </div>
        <button type="button" className={chip(snapToGrid)} aria-pressed={snapToGrid} onClick={() => setSnapToGrid(!snapToGrid)}>snap: {snapToGrid ? 'on' : 'off'}</button>
        <Meta className="ml-auto">1 yd = 10 px · 5-yd lines</Meta>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
        <div tabIndex={0} aria-label="Play Designer canvas" className="space-y-3 bg-background p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onKeyDown={onKeyDown}>
          <DiagramSvg svgRef={svgRef} diagram={{ players, shapes: draft.shapes }} activeSide={side} picking={picking !== undefined}
            {...(selectedId !== undefined ? { selectedId } : {})} {...(hideOther ? { hideSide: otherSide } : {})}
            className="cursor-crosshair touch-none select-none border border-border" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onDoubleClick={onDoubleClick}>
            {path.slice(0, -1).map((from, index) => {
              const to = path[index + 1]
              if (!to) return null
              return <text key={`seg-${index}`} className="pointer-events-none select-none font-mono" x={(from.x + to.x) / 2 + 9} y={(from.y + to.y) / 2 - 3} fontSize="8.5" fill="var(--muted-foreground)">{yards([from, to])} yd</text>
            })}
            {routePx.map((handle, index) => <circle key={`handle-${index}`} data-role="point" data-index={index} cx={handle.x} cy={handle.y} r="5.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" className="cursor-move" />)}
            {selected?.zone && <circle data-role="zone-resize" data-id={selected.id} cx={toPx(selected.zone).x + toPx({ x: selected.zone.rx, y: 0 }).x} cy={toPx(selected.zone).y} r="4.5" fill="var(--card)" stroke="var(--defense)" strokeWidth="1.8" className="cursor-ew-resize" />}
          </DiagramSvg>
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-[10.5px] text-muted-foreground">
            <span className={toneClass}>{selected ? `${describe(selected)} · ${selected.job ?? 'no route'}` : 'nothing selected'}</span>
            <span>{path.length > 1 ? `${yards(path)} yd total` : 'no route'}</span>
            <button type="button" className={chip(false)} disabled={routePx.length === 0} onClick={() => selected && removePoint(selected.id, routePx.length - 1)}>↶ undo last point</button>
            <button type="button" className={chip(false)} disabled={!roster.some((player) => player.route || player.zone || player.coversId)}
              onClick={() => { setPicking(undefined); setPlayers(draftRef.current.players.map((player) => player.side === side ? strip(player, ['route', 'zone', 'coversId', 'job']) : player)) }}>clear all {side} routes</button>
            <span className="ml-auto">drag man · click field to add point · drag point · double-click point to delete</span>
          </div>
          {pickingPlayer && <div role="status" className="rounded-lg border border-defense bg-defense/10 px-3 py-2 font-mono text-[11px]">now click the offensive man the {describe(pickingPlayer)} should cover</div>}
          <label className="grid gap-1">
            <Eyebrow className="text-[9.5px]">Diagram note</Eyebrow>
            <Textarea value={draft.note ?? ''} maxLength={DIAGRAM_NOTE_MAX_LENGTH} placeholder="coaching cues, the read, why it works" onChange={(event) => setDraft({ ...draftRef.current, note: event.target.value })} onBlur={flush} />
          </label>
        </div>

        <aside className="flex flex-col gap-3.5 border-t border-border bg-background/60 p-3.5 lg:border-t-0 lg:border-l" aria-label="Assignments">
          <div>
            <Eyebrow className="mb-2 block text-[9.5px]">On the field</Eyebrow>
            <div className="grid grid-cols-2 gap-1.5" role="listbox" aria-label={`${side} roster`}>
              {roster.map((player) => <button key={player.id} type="button" role="option" aria-selected={player.id === selectedId}
                className={cn('flex w-full items-center gap-2 rounded-[7px] border px-2.5 py-1.5 text-left', player.id === selectedId ? cn('bg-accent', isDefense ? 'border-defense' : 'border-primary') : 'border-border bg-muted')}
                onClick={() => setSelectedId(player.id)}>
                <span className="w-6 shrink-0 font-mono text-[10.5px] font-bold text-muted-foreground">{player.side === 'defense' && player.id.startsWith('d') ? player.id.slice(1) : player.id}</span>
                <span className="truncate text-[12px] font-semibold">{player.job ?? (player.kind === 'OL' ? 'pass pro' : '—')}{player.label ? ` · ${player.label}` : ''}</span>
              </button>)}
              {roster.length === 0 && <Meta className="col-span-2">No {side} on the field. Start from a formation or add a man.</Meta>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ADD_KINDS[side].map((kind) => <button key={kind} type="button" className={chip(false, 'neutral', true)} onClick={() => addPlayer(kind)}>+ {kind}</button>)}
            </div>
          </div>

          {selected && <div>
            <Eyebrow className="mb-1.5 block text-[9.5px]">Label</Eyebrow>
            <input aria-label="Player label" value={selected.label ?? ''} maxLength={PLAYER_LABEL_MAX_LENGTH} placeholder="e.g. #7 Ortiz — shows under the man"
              onChange={(event) => { const value = event.target.value; patch(selected.id, ({ label: _previous, ...player }) => value ? { ...player, label: value } : player) }}
              className="w-full rounded-[7px] border border-border-strong bg-muted px-2.5 py-2 font-mono text-[11.5px] outline-none focus-visible:border-muted-foreground/60" />
            <p className="mt-1.5 text-[11px] text-muted-foreground">{coverTarget ? `covering ${describe(coverTarget)}` : selected.zone ? 'zone placed · drag it, drag the edge to resize' : ''}</p>
          </div>}

          <div>
            <div className="mb-2 flex items-baseline gap-2"><Eyebrow className="text-[9.5px]">Stamp a route</Eyebrow><Meta className="text-[10px]">then drag its points</Meta></div>
            <div className="flex flex-col gap-2">
              {JOB_GROUPS[side].map((group) => <div key={group.name}>
                <Eyebrow className="mb-1 block text-[9px] font-medium tracking-[0.09em]">{group.name}</Eyebrow>
                <div className="flex flex-wrap gap-1">
                  {group.jobs.map((job) => <button key={job} type="button" disabled={!selected} aria-pressed={selected?.job === job}
                    className={cn(chip(selected?.job === job, side), 'px-2.5 py-1.5 text-foreground/80 disabled:opacity-50')} onClick={() => stamp(job)}>{job}</button>)}
                </div>
              </div>)}
            </div>
          </div>

          <div className="mt-auto flex gap-1.5">
            <button type="button" className={cn(chip(false), 'flex-1 py-2')} disabled={!selected} onClick={() => selected && patch(selected.id, (player) => strip(player, ['route', 'zone', 'coversId', 'job']))}>clear route</button>
            <button type="button" className={cn(chip(false), 'flex-1 py-2 hover:border-warm/50 hover:text-warm')} disabled={!selected} onClick={removeSelected}>remove man</button>
          </div>
        </aside>
      </div>
    </Panel>
    <p className="max-w-[88ch] text-[12.5px] text-muted-foreground">The formation is a starting point, not a constraint. Stamp a route from the menu to get the shape, then pull its points to the depth you saw on film. Segment lengths read in yards off the 5-yard lines.</p>
  </Page>
}
