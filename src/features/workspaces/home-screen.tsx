import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { NameDialog } from '@/components/name-dialog'
import { Button, buttonVariants } from '@/components/ui/button'

export function HomeScreen(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  const seasons = useQuery(api.seasons.list, {})
  const active = seasons?.find((season) => season._id === settings?.activeSeasonId)
  const workspaces = useQuery(api.workspaces.listBySeason, active ? { seasonId: active._id } : 'skip')
  const create = useMutation(api.seasons.create)
  const setActive = useMutation(api.settings.setActiveSeason)
  const [creating, setCreating] = useState(false)
  if (settings === undefined || seasons === undefined || (active && workspaces === undefined)) {
    return <div role="status" aria-label="Loading Home" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  return <main className="space-y-6 p-6">
    {!active ? <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Create your first season</h1>
      <Button onClick={() => setCreating(true)}>Create season</Button>
      <NameDialog open={creating} title="New season" label="Season name" initialValue=""
        confirmLabel="Create" onOpenChange={setCreating} onConfirm={async (name) => {
          const seasonId = await create({ name })
          await setActive({ seasonId })
        }} />
    </section> : <>
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{active.name}</h1>
        <Link className={buttonVariants()} to={`/seasons/${active._id}/new`}>New Opponent</Link>
      </header>
      <section className="space-y-3">
        <h2 className="font-semibold">Current / Recent Opponents</h2>
        {workspaces?.length === 0 ? <p className="text-muted-foreground">No opponents yet. Create a new Weekly Opponent Workspace to begin.</p> :
          <ul className="divide-y divide-border rounded-md border border-border">
            {workspaces?.slice(0, 6).map((workspace) => <li key={workspace._id} className="p-3">
              <Link className="font-medium underline-offset-4 hover:underline" to={`/w/${workspace._id}`}>
                Week {workspace.week} — {workspace.opponentName}
              </Link>
              {workspace.gameDate && <time className="ml-3 text-sm text-muted-foreground" dateTime={workspace.gameDate}>{workspace.gameDate}</time>}
            </li>)}
          </ul>}
        <Link className="underline" to={`/seasons/${active._id}`}>View all in {active.name}</Link>
      </section>
    </>}
    <nav aria-label="More" className="flex gap-4 text-sm">
      <Link className="underline" to="/templates">Coaching Templates</Link>
      <Link className="underline" to="/settings">Settings</Link>
      <Link className="underline" to="/archive">Archived Opponents</Link>
    </nav>
  </main>
}
