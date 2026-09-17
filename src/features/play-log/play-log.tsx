import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { useToast } from '@/components/ui/toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Eyebrow } from '@/components/ui/panel'
import { PlayerNotes } from '@/features/player-notes/player-notes'
import type { Mode } from '../preview/preview-data'
import { MODE_OPTIONS, PreviewBadge, Segmented } from '../preview/preview-shared'
import { buildColumns } from './columns'
import { applicableColumns, carryForwardDraft, hasAnyValue, toCreateArgs, type Draft } from './palette-model'
import { SnapPalette } from './snap-palette'
import { ChartedSnaps } from './charted-snaps'
import { ChartingAside } from './charting-aside'

type PlayLogProps = { readonly workspaceId: string; readonly sourceGameId: string }

export function PlayLog(props: PlayLogProps): ReactNode {
  return <GamePlayLog key={`${props.workspaceId}/${props.sourceGameId}`} {...props} />
}

function GamePlayLog({ workspaceId, sourceGameId }: PlayLogProps): ReactNode {
  const navigate = useNavigate()
  const [finishing, setFinishing] = useState(false)
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const tree = useQuery(api.templates.getFull, game ? { templateId: game.templateId } : 'skip')
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const incomplete = useQuery(api.snaps.countIncomplete, game ? { sourceGameId: game._id } : 'skip')
  const terminology = useQuery(api.terminology.list, {})
  const columns = useMemo(() => tree ? buildColumns(tree) : [], [tree])
  const [draft, setDraft] = useState<Draft>({})
  const visibleColumns = useMemo(() => tree ? applicableColumns(columns, tree, draft) : columns, [columns, tree, draft])
  const [mustReview, setMustReview] = useState(false)
  const [dataTab, setDataTab] = useState<'charting' | 'players'>('charting')
  const [mode, setMode] = useState<Mode>('off')
  const creating = useRef(false)
  const [pending, setPending] = useState(false)
  const [createdId, setCreatedId] = useState<Id<'snaps'> | null>(null)
  const { show } = useToast()
  const addTerminology = useMutation(api.terminology.add)
  const addFieldOption = useMutation(api.templates.addFieldOption)
  function carriedValues(last: Doc<'snaps'> | undefined, playType: unknown): Pick<Doc<'snaps'>, 'core' | 'analysis'> {
    const core: Doc<'snaps'>['core'] = {}
    const analysis: Doc<'snaps'>['analysis'] = {}
    const carried = last ? carryForwardDraft(last, columns) : {}
    for (const column of tree ? applicableColumns(columns, tree, { 'core:playType': playType }) : columns) {
      if (carried[column.key] === undefined || !last) continue
      if (column.kind === 'core') Object.assign(core, { [column.field.key]: last.core[column.field.key] })
      else analysis[column.field._id] = last.analysis[column.field._id]!
    }
    return { core, analysis }
  }
  const create = useMutation(api.snaps.create).withOptimisticUpdate((store, args) => {
    const queryArgs = { sourceGameId: args.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, queryArgs)
    if (!current || !tree) return
    const last = current.at(-1)
    const carried = carriedValues(last, args.core?.playType)
    const now = Date.now()
    store.setQuery(api.snaps.listBySourceGame, queryArgs, [...current, {
      _id: `optimistic-${now}` as Id<'snaps'>, _creationTime: now, sourceGameId: args.sourceGameId,
      order: (last?.order ?? 0) + 1, core: { ...carried.core, ...args.core },
      analysis: { ...carried.analysis, ...args.analysis }, mustReview: args.mustReview ?? false, createdAt: now,
    }])
  })
  async function save(): Promise<void> {
    if (!game || creating.current || !hasAnyValue(draft)) return
    creating.current = true
    setPending(true)
    try {
      const { core, analysis } = toCreateArgs(draft, visibleColumns)
      const last = snaps?.at(-1)
      const carried = carriedValues(last, core.playType)
      const id = await create({ sourceGameId: game._id, core, analysis, mustReview })
      setCreatedId(id)
      setDraft(carryForwardDraft({ core: { ...carried.core, ...core }, analysis: { ...carried.analysis, ...analysis } }, columns))
      setMustReview(false)
    } catch (error) {
      show({ message: `Could not save Snap. ${error instanceof Error ? error.message : String(error)}` })
    } finally { creating.current = false; setPending(false) }
  }
  if (game === undefined || (game && (tree === undefined || snaps === undefined || terminology === undefined))) {
    return <div role="status" aria-label="Loading Play Log" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6">
    <h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  if (!tree) return <main className="space-y-3 p-6">
    <h1>Coaching Template not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  return <main className="min-w-0">
    <div className="grid">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-3.5">
        <h1><Eyebrow className="text-xs">{game.label}</Eyebrow></h1>
        <Segmented label="Opponent data section" value={dataTab} options={[['charting', 'Charting'], ['players', 'Player notes']]} onChange={setDataTab} />
        <Segmented label="Which side of the ball" value={mode} options={MODE_OPTIONS} onChange={setMode} accent />
        <span className="ml-auto"><PreviewBadge /></span>
        <Button variant="outline" size="sm" disabled={incomplete === undefined || pending} onClick={() => {
          if (incomplete === 0) navigate(`/w/${workspaceId}/games`)
          else setFinishing(true)
        }}>Finish study session</Button>
        {(snaps?.length ?? 0) > 0 && <Link className={buttonVariants({ variant: 'outline', size: 'sm' })}
          to={`/w/${workspaceId}/games/${game._id}/import`}>Import Hudl CSV</Link>}
      </div>
      {dataTab === 'charting' ? <div className="mt-3.5 flex flex-wrap items-stretch gap-px bg-border">
        <section className="min-w-0 flex-[1_1_620px] bg-background px-5 pt-4 pb-6">
          <SnapPalette columns={visibleColumns} terminology={terminology ?? []} draft={draft} onDraftChange={setDraft}
            nextSnapNumber={(snaps?.length ?? 0) + 1} mustReview={mustReview} onMustReviewChange={setMustReview}
            saving={pending} onSave={() => { void save() }} onClear={() => { setDraft({}); setMustReview(false) }}
            onAddTerminology={async (list, value) => {
              try { await addTerminology({ list, value }) }
              catch (error) {
                show({ message: `Could not add terminology. ${error instanceof Error ? error.message : String(error)}` })
                throw error
              }
            }} onAddFieldOption={async (fieldId, option) => {
              try { await addFieldOption({ fieldId, option }) }
              catch (error) {
                show({ message: `Could not add field option. ${error instanceof Error ? error.message : String(error)}` })
                throw error
              }
            }} />
          <ChartedSnaps snaps={snaps ?? []} freshId={createdId} base={`/w/${workspaceId}/games/${game._id}`}
            workspaceId={workspaceId} sourceGameId={game._id} onDuplicated={setCreatedId} />
        </section>
        <ChartingAside chartedCount={snaps?.length ?? 0} mustReviewCount={snaps?.filter((snap) => snap.mustReview).length ?? 0}
          mode={mode} onOpenPlayers={() => setDataTab('players')} />
      </div> : <PlayerNotes workspaceId={game.workspaceId} sourceGameId={game._id} snaps={snaps ?? []} mode={mode} latestSnapId={createdId ?? snaps?.at(-1)?._id ?? null} />}
    </div>
    <Dialog open={finishing} onOpenChange={setFinishing} aria-label="Completeness Warning">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{incomplete} {incomplete === 1 ? 'Snap contains' : 'Snaps contain'} unfinished Required fields</h2>
        <p>This is informational. You can keep charting or finish now.</p>
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" onClick={() => setFinishing(false)}>Keep charting</Button>
          <Button onClick={() => navigate(`/w/${workspaceId}/games`)}>Finish anyway</Button>
        </div>
      </div>
    </Dialog>
  </main>
}
