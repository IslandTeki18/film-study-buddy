import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button, buttonVariants } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { SourceGameActions } from './source-game-actions'

const GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(140px,1fr)_104px_84px_auto] items-center gap-2.5 px-3.5'
// ponytail: "last 2 weeks" is list position (newest first), not dates; compare gameDate if games gain one.
const RECENT_COUNT = 2

export function SourceGameList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const navigate = useNavigate()
  const { show } = useToast()
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId })
  const setIncluded = useMutation(api.sourceGames.setIncluded).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sourceGames.listByWorkspace, { workspaceId })
    if (!current) return
    store.setQuery(api.sourceGames.listByWorkspace, { workspaceId },
      current.map((game) => game._id === args.sourceGameId ? { ...game, included: args.included } : game))
  })
  const setIncludedGames = useMutation(api.sourceGames.setIncludedGames).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sourceGames.listByWorkspace, { workspaceId })
    if (!current) return
    const wanted = new Set<string>(args.includedIds)
    store.setQuery(api.sourceGames.listByWorkspace, { workspaceId },
      current.map((game) => ({ ...game, included: wanted.has(game._id) })))
  })
  if (workspace === undefined || games === undefined) {
    return <div role="status" aria-label="Loading Source Games" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  const path = `/w/${workspace._id}/games`
  const report = (verb: string) => (error: unknown): void => {
    show({ message: `Could not ${verb}. ${error instanceof Error ? error.message : String(error)}` })
  }
  function scope(keep: (index: number) => boolean): void {
    if (!workspace) return
    const includedIds = games?.filter((_, index) => keep(index)).map((game) => game._id) ?? []
    void setIncludedGames({ workspaceId: workspace._id, includedIds }).catch(report('change which games count'))
  }
  const includedCount = games.filter((game) => game.included !== false).length
  return <Page width="max-w-[900px]" className="gap-4.5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="mb-1 text-xl font-bold tracking-tight">Source games</h2>
        <p className="text-[13px] text-muted-foreground">The film this opponent picture is built from. You decide what counts.</p>
      </div>
      {games.length > 0 && <div className="flex gap-1.5" role="group" aria-label="Bulk scope">
        <Button variant="outline" size="sm" onClick={() => scope(() => true)}>all in</Button>
        <Button variant="outline" size="sm" onClick={() => scope((index) => index < RECENT_COUNT)}>last {RECENT_COUNT} weeks</Button>
        <Button variant="outline" size="sm" onClick={() => scope(() => false)}>none</Button>
      </div>}
    </div>
    {games.length === 0 ? <section className="grid gap-3">
      <h3 className="font-semibold">No source games yet</h3>
      <div className="flex gap-2">
        <Link className={buttonVariants()} to={`${path}/new?intent=import`}>Import Hudl CSV</Link>
        <Link className={buttonVariants({ variant: 'outline' })} to={`${path}/new?intent=manual`}>Create manually</Link>
      </div>
    </section> : <div className="overflow-x-auto rounded-[11px] border border-border">
      <div className="min-w-[680px]">
        <div className={`${GRID} bg-muted py-2.5 font-mono text-[9.5px] tracking-[0.07em] uppercase text-muted-foreground`}>
          <div>Game</div><div>Template</div><div>Charted</div><div className="text-right">Use</div><div className="text-right">Actions</div>
        </div>
        {games.map((game) => {
          const included = game.included !== false
          return <div key={game._id} role="link" tabIndex={0} title={`Chart ${game.label}`}
            onClick={() => navigate(`${path}/${game._id}`)}
            onKeyDown={(event) => { if (event.key === 'Enter' && event.target === event.currentTarget) navigate(`${path}/${game._id}`) }}
            className={`${GRID} cursor-pointer border-t border-border py-2.5 font-mono text-[11.5px] text-foreground/80 outline-none transition-colors hover:bg-accent focus-visible:bg-accent`}>
            <span className="truncate font-sans text-[13px] text-foreground">{game.label}</span>
            <div className="truncate text-muted-foreground">{game.templateName}</div>
            <div className={game.snapCount ? 'text-brand' : 'text-muted-foreground'}>{game.snapCount ? `${game.snapCount} snaps` : 'none yet'}</div>
            <div className="text-right">
              <button type="button" aria-pressed={included} aria-label={`${game.label} counts toward the opponent picture`}
                onClick={(event) => {
                  event.stopPropagation()
                  void setIncluded({ sourceGameId: game._id, included: !included }).catch(report(included ? 'exclude game' : 'include game'))
                }}
                className={cn('rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  included ? 'border-brand bg-brand font-bold text-primary-foreground' : 'border-border-strong text-muted-foreground hover:text-foreground')}>
                {included ? 'in' : 'out'}
              </button>
            </div>
            <div className="text-right"><SourceGameActions sourceGameId={game._id as Id<'sourceGames'>} label={game.label} /></div>
          </div>
        })}
      </div>
    </div>}
    {games.length > 0 && <div className="flex flex-wrap items-center gap-3">
      <Link to={`${path}/new`} className={buttonVariants({ variant: 'dashed', className: 'h-auto justify-start px-3.5 py-2.5 font-mono text-[11.5px]' })}>
        + add source game
      </Link>
      <Meta>{includedCount} of {games.length} games count toward the opponent picture</Meta>
    </div>}
    <Meta className="sr-only">{games.length} source games</Meta>
  </Page>
}
