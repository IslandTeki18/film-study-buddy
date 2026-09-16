import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { DiagramSvg } from '@/components/diagram-svg'
import { Button, buttonVariants } from '@/components/ui/button'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'

export function DiagramGallery({ workspaceId, sourceGameId }: { readonly workspaceId: string; readonly sourceGameId: string }): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const diagrams = useQuery(api.diagrams.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const create = useMutation(api.diagrams.create)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { show } = useToast()
  const [creating, setCreating] = useState(false)
  const resolution = useRef<{ snap: string; promise: Promise<string | null> } | null>(null)
  const base = `/w/${workspaceId}/games/${sourceGameId}`
  const snapParam = searchParams.get('snap')

  useEffect(() => {
    if (!snapParam || !game || game.workspaceId !== workspaceId || !diagrams || !snaps) return
    if (resolution.current?.snap !== snapParam) {
      const snap = snaps.find((item) => item._id === snapParam)
      resolution.current = {
        snap: snapParam,
        promise: !snap
          ? Promise.resolve(null)
          : Promise.resolve(diagrams.find((diagram) => diagram.snapId === snap._id)?._id ?? create({ sourceGameId: game._id, snapId: snap._id })),
      }
    }
    let active = true
    void resolution.current.promise.then((diagramId) => {
      if (!active) return
      if (diagramId) navigate(`${base}/diagrams/${diagramId}`, { replace: true })
      else { show({ message: 'Snap not found' }); navigate(`${base}/diagrams`, { replace: true }) }
    }).catch((error: unknown) => {
      if (!active) return
      show({ message: `Could not create Play Diagram. ${message(error)}` })
      navigate(`${base}/diagrams`, { replace: true })
    })
    return () => { active = false }
  }, [base, create, diagrams, game, navigate, show, snapParam, snaps, workspaceId])

  if (game === undefined || (game && (diagrams === undefined || snaps === undefined))) return <Page><p>Loading…</p></Page>
  if (!game || game.workspaceId !== workspaceId) return <Page><h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Back to Source Games</Link></Page>

  const loadedDiagrams = diagrams ?? []
  const loadedSnaps = snaps ?? []
  const snapLabels = new Map(loadedSnaps.map((snap) => [snap._id, snap.core.clipNumber ?? snap.order]))
  const occupied = new Set(loadedDiagrams.flatMap((diagram) => diagram.snapId ? [diagram.snapId] : []))
  return <Page width="max-w-6xl">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-lg font-semibold">Play Diagrams</h1>
      <Meta>{loadedDiagrams.length} Play {loadedDiagrams.length === 1 ? 'Diagram' : 'Diagrams'}</Meta>
      <Button disabled={creating} onClick={() => {
        if (creating) return
        setCreating(true)
        void create({ sourceGameId: game._id })
          .then((id) => navigate(`${base}/diagrams/${id}`))
          .catch((error: unknown) => show({ message: `Could not create Play Diagram. ${message(error)}` }))
          .finally(() => setCreating(false))
      }}>{creating ? 'Creating…' : 'New Play Diagram'}</Button>
    </header>
    {loadedDiagrams.length === 0
      ? <p>No Play Diagrams yet. Open the Play Designer from a Snap's row menu or create one here.</p>
      : <ol className="grid gap-4 md:grid-cols-2">{loadedDiagrams.map((diagram) => <DiagramCard
          key={diagram._id}
          diagram={diagram}
          base={base}
          snapLabels={snapLabels}
          availableSnaps={loadedSnaps.filter((snap) => !occupied.has(snap._id))}
        />)}</ol>}
  </Page>
}

function DiagramCard({ diagram, base, snapLabels, availableSnaps }: {
  readonly diagram: Doc<'diagrams'>
  readonly base: string
  readonly snapLabels: ReadonlyMap<Id<'snaps'>, string | number>
  readonly availableSnaps: readonly Doc<'snaps'>[]
}): ReactNode {
  const attach = useMutation(api.diagrams.attach)
  const remove = useMutation(api.diagrams.remove).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: diagram.sourceGameId }
    const current = store.getQuery(api.diagrams.listBySourceGame, query)
    if (current) store.setQuery(api.diagrams.listBySourceGame, query, current.filter((item) => item._id !== args.diagramId))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteDiagram = useUndoableMutation(() => remove({ diagramId: diagram._id }), async (args) => { await undo(args) }, () => 'Deleted Play Diagram')
  const { show } = useToast()
  const [pending, setPending] = useState(false)
  const editLabel = diagram.snapId && snapLabels.has(diagram.snapId)
    ? `Edit Play Diagram for Snap ${snapLabels.get(diagram.snapId)}`
    : 'Edit Play Diagram'
  function run(action: () => Promise<unknown>, verb: string): void {
    if (pending) return
    setPending(true)
    void action().catch((error: unknown) => show({ message: `Could not ${verb} Play Diagram. ${message(error)}` })).finally(() => setPending(false))
  }
  return <li><Panel className="grid gap-3 p-4">
    <Link to={`${base}/diagrams/${diagram._id}`} aria-label={editLabel} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <DiagramSvg diagram={diagram} title={editLabel} className="rounded-xl border border-border" {...(diagram.hiddenSide ? { hideSide: diagram.hiddenSide } : {})} />
    </Link>
    <div>
      {diagram.snapId
        ? snapLabels.has(diagram.snapId)
          ? <Link className="text-sm underline" to={`${base}/snap/${diagram.snapId}`}>Snap {snapLabels.get(diagram.snapId)}</Link>
          : <Meta>Snap removed</Meta>
        : <Meta>Unattached</Meta>}
      {diagram.note && <p className="mt-1 truncate text-sm text-muted-foreground">{diagram.note.slice(0, 80)}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to={`${base}/diagrams/${diagram._id}`}>Edit</Link>
      {diagram.snapId
        ? <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => attach({ diagramId: diagram._id, snapId: null }), 'detach')}>Detach</Button>
        : <Select
            aria-label="Attach Play Diagram to Snap"
            className="w-auto"
            disabled={pending || availableSnaps.length === 0}
            value=""
            onChange={(event) => {
              const snapId = event.target.value as Id<'snaps'>
              if (snapId) run(() => attach({ diagramId: diagram._id, snapId }), 'attach')
            }}
          >
            <option value="">{availableSnaps.length ? 'Attach to Snap…' : 'No available Snaps'}</option>
            {availableSnaps.map((snap) => <option key={snap._id} value={snap._id}>Snap {snap.core.clipNumber ?? snap.order}</option>)}
          </Select>}
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deleteDiagram(undefined), 'delete')}>Delete</Button>
    </div>
  </Panel></li>
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
