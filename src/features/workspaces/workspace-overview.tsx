import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button, buttonVariants } from '@/components/ui/button'
import { Eyebrow, Meta, Page, Panel } from '@/components/ui/panel'
import { Textarea } from '@/components/ui/textarea'
import { useAutosave } from '@/lib/db/use-autosave'
import { cn } from '@/lib/utils'

export function WorkspaceOverview({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const overview = useQuery(api.workspaces.getOverview, { workspaceId })
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  if (overview === undefined || workspace === undefined) {
    return <div role="status" aria-label="Loading Workspace" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!overview || !workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  const rows: ReadonlyArray<{ label: string; value: ReactNode; note: string; warm?: boolean }> = [
    { label: 'Opponent', value: overview.opponentName, note: overview.gameDate ?? 'no game date' },
    { label: 'Week', value: `Week ${overview.week} · ${overview.seasonName}`, note: workspace.yourTeam ? `vs ${workspace.yourTeam}` : '' },
    { label: 'Source games', value: `${overview.includedGameCount} of ${overview.sourceGames.length}`, note: 'you choose what counts' },
    { label: 'Charted snaps', value: overview.snapCount, note: overview.includedGameCount === overview.sourceGames.length ? 'across all source games' : 'across included source games' },
    { label: 'Must review snaps', value: overview.mustReviewCount, note: overview.mustReviewCount ? 'flagged while charting' : 'nothing flagged', warm: overview.mustReviewCount > 0 },
    { label: 'Tendencies / alerts', value: overview.tendencyCount, note: 'from charted data' },
    { label: 'Reports', value: overview.reports.length, note: overview.reports.length ? overview.reports.map((report) => report.name).join(', ') : 'none yet' },
  ]
  return <Page width="max-w-[760px]">
    <div>
      <h2 className="mb-1 text-2xl font-bold tracking-tight">{overview.opponentName}</h2>
      <Meta className="text-xs">Week {overview.week} · {overview.seasonName} season{overview.gameDate && ` · ${overview.gameDate}`}</Meta>
    </div>
    <Panel className="overflow-hidden">
      {rows.map((row) => <div key={row.label} className="flex flex-wrap items-baseline gap-4 border-b border-border px-4.5 py-3.5 last:border-b-0">
        <span className="min-w-[180px] text-[13.5px] text-muted-foreground">{row.label}</span>
        <span className={cn('font-mono text-[15px] font-bold', row.warm && 'text-warm')}>{row.value}</span>
        <Meta className="ml-auto">{row.note}</Meta>
      </div>)}
    </Panel>
    <div className="flex flex-wrap items-center gap-3.5">
      <Link className={buttonVariants({ className: 'h-11 px-5' })} to={`/w/${workspace._id}/games${overview.continueGameId ? `/${overview.continueGameId}` : ''}`}>
        Continue film study
      </Link>
      <span className="text-[12.5px] text-muted-foreground">You decide when the picture is complete.</span>
    </div>
    {overview.sourceGames.length > 0 && <section className="grid gap-2">
      <Eyebrow>Source games</Eyebrow>
      <Panel className="overflow-hidden">
        {overview.sourceGames.map((game) => <Link key={game._id} to={`/w/${workspace._id}/games/${game._id}`}
          className="flex items-center gap-4 border-b border-border px-4.5 py-3 text-[13.5px] transition-colors last:border-b-0 hover:bg-accent">
          <span className="min-w-0 flex-1 truncate">{game.label}</span>
          <Meta>{game.snapCount} snaps{game.included ? '' : ' · out'}</Meta>
        </Link>)}
      </Panel>
    </section>}
    <WorkspaceNotes key={workspace._id} workspaceId={workspace._id} notes={workspace.notes ?? ''} />
  </Page>
}

function WorkspaceNotes({ workspaceId, notes }: {
  readonly workspaceId: Id<'workspaces'>; readonly notes: string
}): ReactNode {
  const id = useId()
  const update = useMutation(api.workspaces.update).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.workspaces.get, { workspaceId: args.workspaceId })
    if (!current || args.notes === undefined) return
    const next = { ...current }
    if (args.notes) next.notes = args.notes
    else delete next.notes
    store.setQuery(api.workspaces.get, { workspaceId: args.workspaceId }, next)
  })
  const { draft, setDraft, flush, status } = useAutosave(notes, async (next) => {
    await update({ workspaceId, notes: next })
  })
  return <section className="grid gap-2">
    <label htmlFor={id}><Eyebrow>Notes</Eyebrow></label>
    <Textarea id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
    {status === 'error' && <div role="alert" className="text-sm text-red-500">
      Notes could not be persisted. Your text is still here. <Button variant="outline" size="sm" onClick={flush}>Retry</Button>
    </div>}
  </section>
}
