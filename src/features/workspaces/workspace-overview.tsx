import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAutosave } from '@/lib/db/use-autosave'

export function WorkspaceOverview({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const overview = useQuery(api.workspaces.getOverview, { workspaceId })
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  if (overview === undefined || workspace === undefined) {
    return <div role="status" aria-label="Loading Workspace" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!overview || !workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <main className="space-y-5 p-6">
    <header>
      <h1 className="text-2xl font-semibold">Week {overview.week} — {overview.opponentName}</h1>
      <p className="text-sm text-muted-foreground">{overview.seasonName}
        {overview.gameDate && <time className="ml-3" dateTime={overview.gameDate}>{overview.gameDate}</time>}
      </p>
    </header>
    <Link className={buttonVariants()} to={`/w/${workspace._id}/games${overview.continueGameId ? `/${overview.continueGameId}` : ''}`}>
      Continue Film Study
    </Link>
    <dl className="flex flex-wrap gap-6 text-sm">
      <div><dt>Charted Snaps</dt><dd className="font-semibold">{overview.snapCount}</dd></div>
      <div><dt>Must Review Snaps</dt><dd className="font-semibold">{overview.mustReviewCount}</dd></div>
      <div><dt>Tendencies / Alerts</dt><dd className="font-semibold">{overview.tendencyCount}</dd></div>
    </dl>
    <section className="space-y-2">
      <h2 className="font-semibold">Source Games</h2>
      {overview.sourceGames.length === 0 ? <p className="text-sm text-muted-foreground">No Source Games yet</p> :
        <ul className="space-y-1 text-sm">{overview.sourceGames.map((game) => <li key={game._id}>
          <Link className="underline" to={`/w/${workspace._id}/games/${game._id}`}>{game.label}</Link> — {game.snapCount} Snaps
        </li>)}</ul>}
    </section>
    <section className="space-y-2">
      <h2 className="font-semibold">Reports</h2>
      {overview.reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports yet</p> :
        <ul className="space-y-1 text-sm">{overview.reports.map((report) => <li key={report._id}>{report.name} — {report.intent === 'coach' ? 'Coach Report' : 'Player Report'}</li>)}</ul>}
    </section>
    <WorkspaceNotes key={workspace._id} workspaceId={workspace._id} notes={workspace.notes ?? ''} />
  </main>
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
  return <section className="space-y-2">
    <label htmlFor={id} className="font-semibold">Notes</label>
    <Textarea id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
    {status === 'error' && <div role="alert" className="text-sm text-red-600">
      Notes could not be persisted. Your text is still here. <Button variant="outline" size="sm" onClick={flush}>Retry</Button>
    </div>}
  </section>
}
