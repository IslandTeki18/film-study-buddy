import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { CARRY_FORWARD_CORE_KEYS } from '@convex/domain/coreFields'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { buildColumns } from './columns'
import { useColumnLayout } from './use-column-layout'
import { ColumnsMenu } from './columns-menu'
import { PlayLogTable } from './play-log-table'

export function PlayLog({ workspaceId, sourceGameId }: {
  readonly workspaceId: string; readonly sourceGameId: string
}): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const tree = useQuery(api.templates.getFull, game ? { templateId: game.templateId } : 'skip')
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const terminology = useQuery(api.terminology.list, {})
  const pendingCommit = useRef<Promise<boolean>>(Promise.resolve(true))
  const columns = useMemo(() => tree ? buildColumns(tree) : [], [tree])
  const { layout, setVisible } = useColumnLayout(game?._id, columns.map((column) => column.key))
  const visibleColumns = layout?.order.filter((key) => layout.visible.includes(key))
    .flatMap((key) => columns.filter((column) => column.key === key)) ?? []
  const creating = useRef(false)
  const [pending, setPending] = useState(false)
  const [createdId, setCreatedId] = useState<Id<'snaps'> | null>(null)
  const { show } = useToast()
  const create = useMutation(api.snaps.create).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.snaps.listBySourceGame, args)
    if (!current || !tree) return
    const last = current.at(-1)
    const core: Doc<'snaps'>['core'] = {}
    const analysis: Doc<'snaps'>['analysis'] = {}
    if (last) {
      for (const key of CARRY_FORWARD_CORE_KEYS) {
        if (last.core[key] !== undefined) core[key] = last.core[key]
      }
      for (const section of tree.sections) for (const field of section.fields) {
        if (field.carryForward && last.analysis[field._id] !== undefined) analysis[field._id] = last.analysis[field._id]!
      }
    }
    const now = Date.now()
    store.setQuery(api.snaps.listBySourceGame, args, [...current, {
      _id: `optimistic-${now}` as Id<'snaps'>, _creationTime: now, sourceGameId: args.sourceGameId,
      order: (last?.order ?? 0) + 1, core, analysis, mustReview: false, createdAt: now,
    }])
  })
  function newSnap(): void {
    if (!game || creating.current) return
    const invalid = document.querySelector<HTMLElement>('[aria-label="Play Log"] [aria-invalid="true"]')
    if (invalid) { invalid.focus(); return }
    creating.current = true
    setPending(true)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    document.querySelector<HTMLElement>('[aria-label="Play Log"] [popover]:popover-open')?.hidePopover()
    const edits = pendingCommit.current
    setTimeout(() => {
      void edits.then(async (saved) => {
        if (!saved) throw new Error('The previous cell edit could not be saved')
        setCreatedId(await create({ sourceGameId: game._id }))
      })
        .catch((error: unknown) => show({ message: `Could not create Snap. ${error instanceof Error ? error.message : String(error)}` }))
        .finally(() => { creating.current = false; setPending(false) })
    }, 0)
  }
  if (game === undefined || (game && (tree === undefined || snaps === undefined || terminology === undefined || layout === undefined))) {
    return <div role="status" aria-label="Loading Play Log" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6">
    <h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  if (!tree) return <main className="space-y-3 p-6">
    <h1>Coaching Template not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  return <main className="min-w-0 space-y-3 p-3" onKeyDownCapture={(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      event.stopPropagation()
      newSnap()
    }
  }}>
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xs font-semibold tracking-[0.11em] uppercase text-muted-foreground">{game.label}</h1>
      <span className="font-mono text-[11px] text-muted-foreground">{snaps?.length ?? 0} charted · {visibleColumns.length} columns · ⌘N new snap</span>
      {layout && <ColumnsMenu columns={columns} layout={layout} onChange={setVisible} />}
      <Button className="ml-auto h-8 px-3.5 font-mono text-[11px] font-bold" disabled={pending} onClick={newSnap}>New snap</Button>
    </header>
    {!snaps?.length ? <section className="space-y-3">
      <h2 className="font-semibold">No Snaps yet</h2>
      <Link className="underline" to={`/w/${workspaceId}/games/${game._id}/import`}>Import Hudl CSV</Link>
    </section> : <PlayLogTable snaps={snaps} columns={visibleColumns} widths={layout?.widths ?? {}} createdId={createdId} terminology={terminology ?? []} pendingCommit={pendingCommit} />}
  </main>
}
