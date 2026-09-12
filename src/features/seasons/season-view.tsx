import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { buttonVariants } from '@/components/ui/button'
import { WorkspaceActions } from '@/components/workspace-actions'

interface SeasonViewProps {
  readonly seasonId: string
}

export function SeasonView({ seasonId }: SeasonViewProps): ReactNode {
  const seasons = useQuery(api.seasons.list, {})
  const workspaces = useQuery(api.workspaces.listBySeason, { seasonId })
  const season = seasons?.find((item) => item._id === seasonId)
  if (seasons === undefined || workspaces === undefined) {
    return <div role="status" aria-label="Loading Season" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!season) return <main className="space-y-3 p-6"><h1>Season not found</h1><Link className="underline" to="/">Home</Link></main>
  return <main className="space-y-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">{season.name}</h1>
      <Link className={buttonVariants()} to={`/seasons/${season._id}/new`}>New Opponent</Link>
    </header>
    {workspaces.length === 0 ? <p className="text-muted-foreground">No opponents yet</p> :
      <ul className="divide-y divide-border rounded-md border border-border">
        {workspaces.map((workspace) => <li key={workspace._id} className="flex items-center justify-between gap-4 p-3">
          <div>
            <Link className="font-medium underline-offset-4 hover:underline" to={`/w/${workspace._id}`}>
              Week {workspace.week} — {workspace.opponentName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {workspace.gameDate && <time dateTime={workspace.gameDate}>{workspace.gameDate}</time>}
              {workspace.yourTeam && <span className="ml-3">{workspace.yourTeam}</span>}
            </p>
          </div>
          <WorkspaceActions workspaceId={workspace._id} label={`Week ${workspace.week} — ${workspace.opponentName}`} />
        </li>)}
      </ul>}
  </main>
}
