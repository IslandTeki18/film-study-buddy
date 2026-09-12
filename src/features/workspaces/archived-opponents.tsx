import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function ArchivedOpponents(): ReactNode {
  const workspaces = useQuery(api.workspaces.listArchived, {})
  const unarchive = useMutation(api.workspaces.unarchive)
  const { show } = useToast()
  const [pending, setPending] = useState<Id<'workspaces'> | null>(null)
  if (workspaces === undefined) return <div role="status" aria-label="Loading Archived Opponents" className="m-6 h-32 animate-pulse rounded bg-muted" />
  const groups = new Map<Id<'seasons'>, typeof workspaces>()
  for (const workspace of workspaces) {
    const group = groups.get(workspace.seasonId)
    if (group) group.push(workspace)
    else groups.set(workspace.seasonId, [workspace])
  }
  return <main className="space-y-6 p-6">
    <h1 className="text-2xl font-semibold">Archived Opponents</h1>
    {workspaces.length === 0 ? <p className="text-muted-foreground">No archived opponents</p> :
      [...groups].map(([seasonId, group]) => <section key={seasonId} className="space-y-3">
        <h2 className="font-semibold">{group[0]?.seasonName}</h2>
        <ul className="divide-y divide-border rounded-md border border-border">
          {group.map((workspace) => <li key={workspace._id} className="flex items-center justify-between gap-4 p-3">
            <Link className="font-medium underline-offset-4 hover:underline" to={`/w/${workspace._id}`}>Week {workspace.week} — {workspace.opponentName}</Link>
            <Button variant="outline" disabled={pending !== null} onClick={() => {
              if (pending !== null) return
              setPending(workspace._id)
              void unarchive({ workspaceId: workspace._id })
                .catch((error: unknown) => show({ message: `Could not reopen Workspace. ${error instanceof Error ? error.message : String(error)}` }))
                .finally(() => setPending(null))
            }}>Reopen</Button>
          </li>)}
        </ul>
      </section>)}
  </main>
}
