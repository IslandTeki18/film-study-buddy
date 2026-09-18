import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'
import { WorkspaceActions } from '@/components/workspace-actions'
import { isConvexConfigured } from '@/convex-client'
import { cn } from '@/lib/utils'

export const WORKSPACE_TABS = [
  { segment: '', label: 'Overview' },
  { segment: 'games', label: 'Source games' },
  { segment: 'data', label: 'Opponent data' },
  { segment: 'tendencies', label: 'Tendencies / alerts' },
  { segment: 'reports', label: 'Reports' },
] as const

/** Workspace chrome: back to the season, opponent identity, actions, and the section tab strip. */
export function WorkspaceHeader({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, isConvexConfigured ? { workspaceId } : 'skip')
  const seasons = useQuery(api.seasons.list, isConvexConfigured ? {} : 'skip')
  const season = seasons?.find((item) => item._id === workspace?.seasonId)
  const base = `/w/${workspaceId}`
  return <header className="print:hidden app-drag-region flex flex-col gap-3 border-b border-border bg-card px-5 pt-3 pl-24">
    <div className="flex flex-wrap items-center gap-4">
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to={season ? `/seasons/${season._id}` : '/'}>← {season?.name ?? 'Home'}</Link>
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="truncate text-[19px] font-bold tracking-tight">{workspace === undefined ? '…' : workspace?.opponentName ?? 'Workspace not found'}</span>
        {workspace && <Meta className="text-[11.5px]">
          Week {workspace.week}{season && ` · ${season.name}`}{workspace.gameDate && ` · ${workspace.gameDate}`}
        </Meta>}
      </div>
      {workspace && <div className="ml-auto flex items-center gap-3">
        {workspace.archivedAt !== undefined && <Meta className="rounded-md border border-border-strong px-2 py-1 text-warm">archived</Meta>}
        <WorkspaceActions workspaceId={workspace._id} archived={workspace.archivedAt !== undefined}
          label={`Week ${workspace.week} — ${workspace.opponentName}`} />
      </div>}
      <Button variant="ghost" size="sm" aria-label="Keyboard shortcuts" onClick={() => window.dispatchEvent(new CustomEvent('shortcut-help:open'))}>?</Button>
    </div>
    <nav aria-label="Workspace" className="-mb-px flex flex-wrap gap-0.5">
      {WORKSPACE_TABS.map(({ segment, label }) => <NavLink key={segment} to={segment ? `${base}/${segment}` : base} end={segment === ''}
        className={({ isActive }) => cn(
          'rounded-t-lg border border-b-0 px-3.5 py-2 text-[12.5px] font-semibold transition-colors',
          isActive ? 'border-border bg-background text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
        {label}
      </NavLink>)}
    </nav>
  </header>
}
