import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { buttonVariants } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'
import { LOG_GRID, LOG_HEADERS, SnapRowCells } from '@/features/play-log/charted-snaps'
import { cn } from '@/lib/utils'

export function ReviewQueue({ workspaceId, sourceGameId }: {
  readonly workspaceId: string; readonly sourceGameId: string
}): ReactNode {
  const navigate = useNavigate()
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const base = `/w/${workspaceId}/games/${sourceGameId}`
  if (game === undefined || (game && snaps === undefined)) return <div role="status" aria-label="Loading Review Queue" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6"><h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link></main>
  const queue = (snaps ?? []).filter((snap) => snap.mustReview).sort((a, b) => a.order - b.order)
  return <main className="space-y-4 p-6">
    <header className="flex flex-wrap items-center gap-4">
      <h1 className="text-lg font-semibold">Review Queue</h1><Meta>{queue.length} Snaps</Meta>
      {queue[0] && <Link className={buttonVariants()} to={`${base}/review/${queue[0]._id}`}>Start Focused Review</Link>}
    </header>
    {queue.length === 0 ? <div className="space-y-2">
      <p>Nothing to review. Mark a Snap Must Review from the Play Log or Play Detail.</p>
      <Link className="underline" to={base}>Back to Play Log</Link>
    </div> : <div className="overflow-x-auto rounded-[10px] border border-border">
      <table aria-label="Review Queue" className="min-w-[740px] w-full table-fixed">
        <thead><tr className={cn(LOG_GRID, 'bg-muted py-2 font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground uppercase')}>
          {LOG_HEADERS.map((label, index) => <th scope="col" key={label} className={cn(index === 1 && 'text-center', index === 7 && 'text-right')}>{label}</th>)}
          <th scope="col" aria-label="Actions" />
        </tr></thead>
        <tbody>{queue.map((snap) => <tr key={snap._id} className={cn(LOG_GRID, 'cursor-pointer border-t border-border py-2')}
          onClick={(event) => { if (!(event.target as HTMLElement).closest('input, button, a')) navigate(`${base}/review/${snap._id}`) }}>
          <SnapRowCells snap={snap} href={`${base}/review/${snap._id}`} linkLabel={`Review Snap ${snap.core.clipNumber ?? snap.order}`} />
          <td />
        </tr>)}</tbody>
      </table>
    </div>}
  </main>
}
