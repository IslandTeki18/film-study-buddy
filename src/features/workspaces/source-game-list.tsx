import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { buttonVariants } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
import { SourceGameActions } from './source-game-actions'

const GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(140px,1fr)_96px_auto] items-center gap-2.5 px-3.5'

export function SourceGameList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId })
  if (workspace === undefined || games === undefined) {
    return <div role="status" aria-label="Loading Source Games" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  const path = `/w/${workspace._id}/games`
  return <Page width="max-w-[900px]" className="gap-4.5">
    <div>
      <h2 className="mb-1 text-xl font-bold tracking-tight">Source games</h2>
      <p className="text-[13px] text-muted-foreground">The film this opponent picture is built from. You decide what counts.</p>
    </div>
    {games.length === 0 ? <section className="grid gap-3">
      <h3 className="font-semibold">No source games yet</h3>
      <div className="flex gap-2">
        <Link className={buttonVariants()} to={`${path}/new?intent=import`}>Import Hudl CSV</Link>
        <Link className={buttonVariants({ variant: 'outline' })} to={`${path}/new?intent=manual`}>Create manually</Link>
      </div>
    </section> : <div className="overflow-x-auto rounded-[11px] border border-border">
      <div className="min-w-[620px]">
        <div className={`${GRID} bg-muted py-2.5 font-mono text-[9.5px] tracking-[0.07em] uppercase text-muted-foreground`}>
          <div>Game</div><div>Template</div><div>Snaps</div><div className="text-right">Actions</div>
        </div>
        {games.map((game) => <div key={game._id} className={`${GRID} border-t border-border py-2.5 font-mono text-[11.5px] text-foreground/80`}>
          <Link className="truncate font-sans text-[13px] text-foreground hover:text-brand" to={`${path}/${game._id}`}>{game.label}</Link>
          <div className="truncate text-muted-foreground">{game.templateName}</div>
          <div className={game.snapCount ? 'text-brand' : 'text-muted-foreground'}>{game.snapCount ? `${game.snapCount} snaps` : 'none yet'}</div>
          <div className="text-right"><SourceGameActions sourceGameId={game._id} label={game.label} /></div>
        </div>)}
      </div>
    </div>}
    {games.length > 0 && <Link to={`${path}/new`} className={buttonVariants({ variant: 'dashed', className: 'h-auto justify-start px-3.5 py-2.5 font-mono text-[11.5px]' })}>
      + add source game
    </Link>}
    <Meta className="sr-only">{games.length} source games</Meta>
  </Page>
}
