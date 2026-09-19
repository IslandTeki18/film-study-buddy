import { useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { groupsForSide } from '@convex/domain/opponentPlayers'
import { Button } from '@/components/ui/button'
import { PlayerNoteDialog } from '@/features/player-notes/player-note-dialog'
import { Eyebrow, Panel } from '@/components/ui/panel'
import type { Mode } from '../preview/preview-data'

export function ChartingAside({ mode, onOpenPlayers, workspaceId, sourceGameId, snaps, latestSnapId }: {
  readonly mode: Mode
  readonly workspaceId: Id<'workspaces'>; readonly sourceGameId: Id<'sourceGames'>
  readonly snaps: readonly Doc<'snaps'>[]; readonly latestSnapId: Id<'snaps'> | null
  readonly onOpenPlayers: () => void
}): ReactNode {
  const players = useQuery(api.opponentPlayers.listByWorkspace, { workspaceId })
  const [noting, setNoting] = useState<Id<'opponentPlayers'> | null>(null)
  const groups = groupsForSide(mode === 'off' ? 'offense' : 'defense')
  const shown = players?.filter((player) => groups.some((group) => group.key === player.group))
  const player = players?.find((player) => player._id === noting)
  return (
    <div>
      <div>
        <h3 className="mb-2.5"><Eyebrow>Note a player</Eyebrow></h3>
        <Panel className="rounded-[10px] bg-muted/60 px-3 py-3">
          {shown === undefined ? <div role="status" aria-label="Loading players" className="mb-2.5 h-8 animate-pulse rounded bg-muted" />
            : shown.length === 0 ? <div className="mb-2.5 space-y-2"><p className="text-xs">No players yet.</p><Button variant="outline" size="sm" onClick={onOpenPlayers}>Add players</Button></div>
            : <div className="mb-2.5 flex flex-wrap gap-1.5">
              {shown.map((player) => <button key={player._id} type="button" onClick={() => setNoting(player._id)} aria-label={`Add a note for #${player.jersey} ${player.position}`}
                className="rounded-md border border-border-strong bg-muted px-2.5 py-1.5 font-mono text-[11px] outline-none hover:border-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring">#{player.jersey}</button>)}
            </div>}
          <p className="text-xs leading-relaxed text-muted-foreground">Pick a number to note what you just saw. The note links the latest Snap.</p>
        </Panel>
      </div>
      {player && <PlayerNoteDialog open onOpenChange={(open) => { if (!open) setNoting(null) }} player={player}
        sourceGameId={sourceGameId} snaps={snaps} initialSnapId={latestSnapId} />}
    </div>
  )
}
