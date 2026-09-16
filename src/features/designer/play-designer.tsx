import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { DIAGRAM_ASPECT, PLAYER_JERSEY_MAX_LENGTH, PLAYER_LABEL_MAX_LENGTH, type DiagramDoc, type DiagramPlayer, type DiagramShape, type DiagramTool, type PlayerSide } from '@convex/domain/diagram'
import { DiagramSvg } from '@/components/diagram-svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { useAutosave } from '@/lib/db/use-autosave'
import { inDialog } from '@/lib/shortcuts'
import { curveControl, hitTestPlayer, hitTestShape, nudge, simplifyFreehand, toNormalized } from './geometry'

type Tool = 'select' | 'offense' | 'defense' | DiagramTool | 'erase'

const tools: readonly { tool: Tool; label: string; key: string }[] = [
  { tool: 'select', label: 'Select', key: 'V' }, { tool: 'offense', label: 'Offense', key: 'O' },
  { tool: 'defense', label: 'Defense', key: 'D' }, { tool: 'arrow', label: 'Straight Arrow', key: 'A' },
  { tool: 'curve', label: 'Curved Arrow', key: 'C' }, { tool: 'block', label: 'Blocking Bar', key: 'B' },
  { tool: 'dashed', label: 'Dashed Line', key: 'L' }, { tool: 'free', label: 'Freehand', key: 'F' },
  { tool: 'erase', label: 'Erase', key: 'E' },
]

export function PlayDesigner({ workspaceId, sourceGameId, diagramId }: {
  readonly workspaceId: string; readonly sourceGameId: string; readonly diagramId: string
}): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const diagram = useQuery(api.diagrams.get, { diagramId })
  const base = `/w/${workspaceId}/games/${sourceGameId}/diagrams`
  if (game === undefined || diagram === undefined) return <main className="p-6">Loading…</main>
  if (!game || game.workspaceId !== workspaceId || !diagram || diagram.sourceGameId !== game._id) return <main className="space-y-3 p-6">
    <p>Play Diagram not found</p><Link className="underline" to={base}>Back to Play Diagrams</Link>
  </main>
  return <DesignerContent key={diagram._id} workspaceId={workspaceId} sourceGameId={game._id} diagram={diagram} />
}

function DesignerContent({ workspaceId, sourceGameId, diagram }: {
  readonly workspaceId: string; readonly sourceGameId: Id<'sourceGames'>
  readonly diagram: { readonly _id: Id<'diagrams'>; readonly updatedAt: number; readonly players: DiagramPlayer[]; readonly shapes: DiagramDoc['shapes']; readonly note?: string; readonly snapId?: Id<'snaps'> }
}): ReactNode {
  const save = useMutation(api.diagrams.save)
  const snap = useQuery(api.snaps.get, diagram.snapId ? { snapId: diagram.snapId } : 'skip')
  const serverDoc = useMemo<DiagramDoc>(() => ({ players: diagram.players, shapes: diagram.shapes, ...(diagram.note ? { note: diagram.note } : {}) }), [diagram.updatedAt])
  const { draft, setDraft, flush, status } = useAutosave(serverDoc, async (next) => {
    await save({ diagramId: diagram._id, players: next.players, shapes: next.shapes, ...(next.note !== undefined ? { note: next.note } : {}) })
  })
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [previewPlayer, setPreviewPlayer] = useState<{ id: string; x: number; y: number } | undefined>(undefined)
  const [previewShape, setPreviewShape] = useState<DiagramShape | undefined>(undefined)
  const drawing = useRef<{ shape: DiagramShape } | undefined>(undefined)
  const dragging = useRef<
    { kind: 'player'; playerId: string; offsetX: number; offsetY: number; x: number; y: number }
    | { kind: 'control'; shapeId: string; points: number[] }
    | undefined
  >(undefined)
  const base = `/w/${workspaceId}/games/${sourceGameId}/diagrams`
  const display = {
    ...draft,
    players: previewPlayer ? draft.players.map((player) => player.id === previewPlayer.id ? { ...player, x: previewPlayer.x, y: previewPlayer.y } : player) : draft.players,
    shapes: previewShape
      ? drawing.current ? [...draft.shapes, previewShape] : draft.shapes.map((shape) => shape.id === previewShape.id ? previewShape : shape)
      : draft.shapes,
  }

  const removeSelected = useCallback((): void => {
    if (!selectedId) return
    setDraft({ ...draftRef.current, players: draftRef.current.players.filter((player) => player.id !== selectedId), shapes: draftRef.current.shapes.filter((shape) => shape.id !== selectedId) })
    setSelectedId(undefined)
  }, [selectedId, setDraft])

  function updatePlayer(id: string, update: Partial<DiagramPlayer>): void {
    setDraft({ ...draftRef.current, players: draftRef.current.players.map((player) => player.id === id ? { ...player, ...update } : player) })
  }

  function updatePlayerText(id: string, field: 'label' | 'jersey', value: string): void {
    setDraft({ ...draftRef.current, players: draftRef.current.players.map((player) => {
      if (player.id !== id) return player
      const next = { ...player }
      if (value) next[field] = value
      else delete next[field]
      return next
    }) })
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>): void {
    const point = toNormalized(event, event.currentTarget)
    if (tool === 'offense' || tool === 'defense') {
      const id = crypto.randomUUID()
      setDraft({ ...draftRef.current, players: [...draftRef.current.players, { id, side: tool, ...point }] })
      setSelectedId(id)
      return
    }
    if (tool !== 'select' && tool !== 'erase') {
      const id = crypto.randomUUID()
      const points = tool === 'free' ? [point.x, point.y] : [point.x, point.y, point.x, point.y]
      const shape: DiagramShape = { id, tool, points }
      drawing.current = { shape }
      setPreviewShape(shape)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const player = hitTestPlayer(draft.players, point.x, point.y)
    const shape = hitTestShape(draft.shapes, point.x, point.y)
    if (tool === 'erase') {
      const id = player?.id ?? shape?.id
      if (id) {
        setDraft({ ...draftRef.current, players: draftRef.current.players.filter((entry) => entry.id !== id), shapes: draftRef.current.shapes.filter((entry) => entry.id !== id) })
        if (selectedId === id) setSelectedId(undefined)
      }
      return
    }
    if (tool !== 'select') return
    const selectedCurve = draft.shapes.find((entry) => entry.id === selectedId && entry.tool === 'curve')
    if (selectedCurve && Math.hypot((selectedCurve.points[2] ?? 0) - point.x, (selectedCurve.points[3] ?? 0) - point.y) <= 0.025) {
      dragging.current = { kind: 'control', shapeId: selectedCurve.id, points: [...selectedCurve.points] }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (player) {
      dragging.current = { kind: 'player', playerId: player.id, offsetX: player.x - point.x, offsetY: player.y - point.y, x: player.x, y: player.y }
      event.currentTarget.setPointerCapture(event.pointerId)
      setSelectedId(player.id)
    } else setSelectedId(shape?.id)
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>): void {
    const point = toNormalized(event, event.currentTarget)
    const activeDrawing = drawing.current
    if (activeDrawing) {
      const [x1 = point.x, y1 = point.y] = activeDrawing.shape.points
      const points = activeDrawing.shape.tool === 'free'
        ? [...activeDrawing.shape.points, point.x, point.y]
        : activeDrawing.shape.tool === 'curve'
          ? [x1, y1, curveControl(x1, y1, point.x, point.y).cx, curveControl(x1, y1, point.x, point.y).cy, point.x, point.y]
          : [x1, y1, point.x, point.y]
      activeDrawing.shape = { ...activeDrawing.shape, points }
      setPreviewShape(activeDrawing.shape)
      return
    }
    const drag = dragging.current
    if (!drag) return
    if (drag.kind === 'control') {
      drag.points[2] = point.x
      drag.points[3] = point.y
      const shape = draftRef.current.shapes.find((entry) => entry.id === drag.shapeId)
      if (shape) setPreviewShape({ ...shape, points: [...drag.points] })
      return
    }
    drag.x = nudge(point.x, drag.offsetX)
    drag.y = nudge(point.y, drag.offsetY)
    setPreviewPlayer({ id: drag.playerId, x: drag.x, y: drag.y })
  }

  function finishInteraction(event: PointerEvent<SVGSVGElement>): void {
    if (drawing.current) {
      onPointerMove(event)
      const shape = drawing.current.shape
      drawing.current = undefined
      setPreviewShape(undefined)
      const points = shape.tool === 'free' ? simplifyFreehand(shape.points) : shape.points
      const end = shape.tool === 'curve' ? 4 : points.length - 2
      const length = shape.tool === 'free'
        ? Math.max(...Array.from({ length: points.length / 2 - 1 }, (_, index) => Math.hypot((points[index * 2 + 2] ?? 0) - (points[0] ?? 0), (points[index * 2 + 3] ?? 0) - (points[1] ?? 0))), 0)
        : Math.hypot((points[end] ?? 0) - (points[0] ?? 0), (points[end + 1] ?? 0) - (points[1] ?? 0))
      if (points.length >= 4 && length > 0.01) {
        const committed = { ...shape, points }
        setDraft({ ...draftRef.current, shapes: [...draftRef.current.shapes, committed] })
        if (shape.tool === 'curve') setSelectedId(shape.id)
      }
      return
    }
    const drag = dragging.current
    dragging.current = undefined
    setPreviewPlayer(undefined)
    if (!drag) return
    setPreviewShape(undefined)
    if (drag.kind === 'control') {
      setDraft({ ...draftRef.current, shapes: draftRef.current.shapes.map((shape) => shape.id === drag.shapeId ? { ...shape, points: drag.points } : shape) })
    } else {
      setDraft({ ...draftRef.current, players: draftRef.current.players.map((player) => player.id === drag.playerId ? { ...player, x: drag.x, y: drag.y } : player) })
    }
  }

  function cancelInteraction(): void { drawing.current = undefined; dragging.current = undefined; setPreviewPlayer(undefined); setPreviewShape(undefined) }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const target = event.target
    if (event.defaultPrevented || inDialog(target) || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]')))) return
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); return }
    if (event.key === 'Escape') { event.preventDefault(); cancelInteraction(); setSelectedId(undefined); setTool('select'); return }
    const selected = draftRef.current.players.find((player) => player.id === selectedId)
    const delta = event.shiftKey ? 0.05 : 0.01
    const directions: Record<string, readonly [number, number]> = { ArrowUp: [0, -delta], ArrowDown: [0, delta], ArrowLeft: [-delta, 0], ArrowRight: [delta, 0] }
    const direction = directions[event.key]
    if (selected && direction) {
      event.preventDefault()
      updatePlayer(selected.id, { x: nudge(selected.x, direction[0]), y: nudge(selected.y, direction[1]) })
      return
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      const next = tools.find((entry) => entry.key === event.key.toUpperCase())
      if (next) { event.preventDefault(); setTool(next.tool) }
    }
  }

  const selectedPlayer = draft.players.find((player) => player.id === selectedId)
  const selectedShape = draft.shapes.find((shape) => shape.id === selectedId)
  const statusText = status === 'idle' ? 'Saved' : status === 'saving' ? 'Saving…' : status === 'pending' ? 'Unsaved changes' : 'Save failed'
  return <Page width="max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Play Designer</h1>{diagram.snapId
        ? <Link className="block underline" to={`/w/${workspaceId}/games/${sourceGameId}/snap/${diagram.snapId}`}>Attached to {snap ? `Snap ${snap.core.clipNumber ?? snap.order}` : 'Snap'}</Link>
        : <Meta>Unattached</Meta>}</div>
      <Link className="underline" to={base}>Back to Play Diagrams</Link>
    </header>
    <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
      <div className="space-y-3">
        <div role="radiogroup" aria-label="Tools" className="flex flex-wrap gap-2">
          {tools.map((entry) => <Button key={entry.tool} variant="outline" role="radio" aria-checked={tool === entry.tool} title={`${entry.label} (${entry.key})`} onClick={() => setTool(entry.tool)}>{entry.label} <kbd className="text-[10px]">{entry.key}</kbd></Button>)}
        </div>
        <div tabIndex={0} aria-label="Play Designer canvas" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring" onKeyDown={onKeyDown} onPointerCancel={cancelInteraction}>
          <DiagramSvg diagram={display} {...(selectedId !== undefined ? { selectedId } : {})} className="w-full rounded-xl border border-border touch-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishInteraction}>
            {selectedShape?.tool === 'curve' && <circle cx={(previewShape?.points[2] ?? selectedShape.points[2] ?? 0) * DIAGRAM_ASPECT.width} cy={(previewShape?.points[3] ?? selectedShape.points[3] ?? 0) * DIAGRAM_ASPECT.height} r="10" className="fill-background stroke-primary" strokeWidth="4" />}
          </DiagramSvg>
        </div>
        <div className="flex items-center gap-3"><Meta>{statusText}</Meta>{status === 'error' && <Button size="sm" variant="outline" onClick={flush}>Retry</Button>}</div>
      </div>
      <Panel className="h-fit space-y-3 p-4" aria-label="Selection inspector">
        <h2 className="font-semibold">Inspector</h2>
        {selectedPlayer ? <PlayerInspector player={selectedPlayer} onChange={updatePlayer} onTextChange={updatePlayerText} onDelete={removeSelected} /> : selectedShape ? <><Meta>{selectedShape.tool}</Meta><Button variant="outline" onClick={removeSelected}>Delete</Button></> : <Meta>Select a player or shape</Meta>}
      </Panel>
    </div>
  </Page>
}

function PlayerInspector({ player, onChange, onTextChange, onDelete }: { readonly player: DiagramPlayer; readonly onChange: (id: string, update: Partial<DiagramPlayer>) => void; readonly onTextChange: (id: string, field: 'label' | 'jersey', value: string) => void; readonly onDelete: () => void }): ReactNode {
  return <>
    <label className="grid gap-1 text-sm">Label<Input value={player.label ?? ''} maxLength={PLAYER_LABEL_MAX_LENGTH} onChange={(event) => onTextChange(player.id, 'label', event.target.value)} /></label>
    <label className="grid gap-1 text-sm">Jersey<Input value={player.jersey ?? ''} maxLength={PLAYER_JERSEY_MAX_LENGTH} inputMode="numeric" onChange={(event) => onTextChange(player.id, 'jersey', event.target.value)} /></label>
    <div className="flex gap-2" aria-label="Player side">{(['offense', 'defense'] as PlayerSide[]).map((side) => <Button key={side} size="sm" variant="outline" aria-pressed={player.side === side} onClick={() => onChange(player.id, { side })}>{side[0]?.toUpperCase()}{side.slice(1)}</Button>)}</div>
    <Button variant="outline" onClick={onDelete}>Delete</Button>
  </>
}
