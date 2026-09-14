import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'

export function ArchivedOpponents(): ReactNode {
  const workspaces = useQuery(api.workspaces.listArchived, {})
  const unarchive = useMutation(api.workspaces.unarchive)
  const { show } = useToast()
  const [pending, setPending] = useState<Id<'workspaces'> | null>(null)
  if (workspaces === undefined) return <div role="status" aria-label="Loading Archived Opponents" className="m-6 h-32 animate-pulse rounded bg-muted" />
  return <>
    <AppHeader title="Archived opponents" meta={`${workspaces.length} workspaces kept`} />
    <Page width="max-w-[680px]" className="gap-2">
      {workspaces.length === 0 ? <p className="text-muted-foreground">No archived opponents</p> :
        workspaces.map((workspace) => <div key={workspace._id} className="flex flex-wrap items-center gap-3.5 rounded-[10px] border border-border bg-card/70 px-4 py-3">
          <Meta className="min-w-14 tracking-[0.08em] uppercase">{workspace.seasonName}</Meta>
          <Link className="min-w-0 flex-[1_1_200px] text-[13.5px] text-foreground/80 hover:text-foreground" to={`/w/${workspace._id}`}>
            Week {workspace.week} — {workspace.opponentName}
          </Link>
          {workspace.gameDate && <Meta className="text-[10.5px]"><time dateTime={workspace.gameDate}>{workspace.gameDate}</time></Meta>}
          <Button variant="outline" size="sm" className="h-7 bg-transparent text-[10.5px]" disabled={pending !== null} onClick={() => {
            if (pending !== null) return
            setPending(workspace._id)
            void unarchive({ workspaceId: workspace._id })
              .catch((error: unknown) => show({ message: `Could not reopen Workspace. ${error instanceof Error ? error.message : String(error)}` }))
              .finally(() => setPending(null))
          }}>Restore</Button>
        </div>)}
    </Page>
  </>
}
