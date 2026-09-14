import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { buildColumns } from './columns'
import { PlayLogTable } from './play-log-table'

export function PlayLog({ workspaceId, sourceGameId }: {
  readonly workspaceId: string; readonly sourceGameId: string
}): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const tree = useQuery(api.templates.getFull, game ? { templateId: game.templateId } : 'skip')
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const columns = useMemo(() => tree ? buildColumns(tree) : [], [tree])
  if (game === undefined || (game && (tree === undefined || snaps === undefined))) {
    return <div role="status" aria-label="Loading Play Log" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6">
    <h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  if (!tree) return <main className="space-y-3 p-6">
    <h1>Coaching Template not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>
  return <main className="min-w-0 space-y-3 p-3">
    <header className="flex items-center justify-between gap-4">
      <div><h1 className="text-lg font-semibold">{game.label}</h1>
        <p className="text-xs text-muted-foreground">{snaps?.length ?? 0} Snaps · {columns.length} columns</p>
      </div>
      <Button disabled>New Snap</Button>
    </header>
    {!snaps?.length ? <section className="space-y-3">
      <h2 className="font-semibold">No Snaps yet</h2>
      <Link className="underline" to={`/w/${workspaceId}/games/${game._id}/import`}>Import Hudl CSV</Link>
    </section> : <PlayLogTable snaps={snaps} columns={columns} />}
  </main>
}
