import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { buttonVariants } from '@/components/ui/button'
import { SourceGameActions } from './source-game-actions'

export function SourceGameList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId })
  if (workspace === undefined || games === undefined) {
    return <div role="status" aria-label="Loading Source Games" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  const path = `/w/${workspace._id}/games`
  return <main className="space-y-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">Source Games</h1>
      {games.length > 0 && <Link className={buttonVariants()} to={`${path}/new`}>Add Source Game</Link>}
    </header>
    {games.length === 0 ? <section className="space-y-3">
      <h2 className="font-semibold">No Source Games yet</h2>
      <div className="flex gap-2">
        <Link className={buttonVariants()} to={`${path}/new?intent=import`}>Import Hudl CSV</Link>
        <Link className={buttonVariants({ variant: 'outline' })} to={`${path}/new?intent=manual`}>Create Manually</Link>
      </div>
    </section> : <ul className="divide-y divide-border rounded-md border border-border">
      {games.map((game) => <li key={game._id} className="flex items-center justify-between gap-4 p-3">
        <div>
          <Link className="font-medium underline-offset-4 hover:underline" to={`${path}/${game._id}`}>{game.label}</Link>
          <p className="text-sm text-muted-foreground">{game.templateName} · {game.snapCount} Snaps</p>
        </div>
        <SourceGameActions sourceGameId={game._id} label={game.label} />
      </li>)}
    </ul>}
  </main>
}
