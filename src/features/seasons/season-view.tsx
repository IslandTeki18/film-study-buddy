import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AppHeader } from '@/components/app-header'
import { buttonVariants } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
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
  return <>
    <AppHeader title={`${season.name} season`} meta={`${workspaces.length} opponent workspaces`} />
    <Page width="max-w-[820px]" className="gap-2">
      {workspaces.length === 0 && <p>No opponent workspaces in this season yet.</p>}
      {workspaces.map((workspace) => <div key={workspace._id}
        className="grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-4 rounded-[11px] border border-border bg-card px-4 py-3.5">
        <Meta className="tracking-[0.08em] uppercase">Week {workspace.week}</Meta>
        <span className="min-w-0">
          <Link className="block truncate text-base font-semibold tracking-tight hover:text-brand" to={`/w/${workspace._id}`}>{workspace.opponentName}</Link>
          <Meta className="mt-0.5 block">
            {workspace.gameDate ? <time dateTime={workspace.gameDate}>{workspace.gameDate}</time> : 'no game date'}
            {workspace.yourTeam && ` · vs ${workspace.yourTeam}`}
          </Meta>
        </span>
        <WorkspaceActions archived={false} workspaceId={workspace._id} label={`Week ${workspace.week} — ${workspace.opponentName}`} />
      </div>)}
      <Link to={`/seasons/${season._id}/new`} className={buttonVariants({ variant: 'dashed', className: 'h-auto justify-start rounded-[11px] px-4 py-4 text-sm' })}>
        <span className="font-mono text-[15px]">+</span> New opponent workspace
      </Link>
    </Page>
  </>
}
