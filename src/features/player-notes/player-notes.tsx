import { useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { groupsForSide } from '@convex/domain/opponentPlayers'
import { Button } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'
import type { Mode } from '../preview/preview-data'
import { AddPlayerDialog } from './add-player-dialog'
import { PlayerCard } from './player-card'

export type OpponentPlayer = FunctionReturnType<typeof api.opponentPlayers.listByWorkspace>[number]

export function PlayerNotes({ workspaceId, mode }: {
  readonly workspaceId: Id<'workspaces'>; readonly sourceGameId: Id<'sourceGames'>
  readonly snaps: readonly Doc<'snaps'>[]; readonly mode: Mode; readonly latestSnapId: Id<'snaps'> | null
}): ReactNode {
  const players = useQuery(api.opponentPlayers.listByWorkspace, { workspaceId })
  const [adding, setAdding] = useState(false)
  if (players === undefined) return <div role="status" aria-label="Loading Player notes" className="m-6 h-32 animate-pulse rounded bg-muted" />
  const groups = groupsForSide(mode === 'off' ? 'offense' : 'defense')
  const vocabulary = [...new Set(players.flatMap((player) => player.traits))]
  const empty = !players.some((player) => groups.some((group) => group.key === player.group))
  return <section className="grid min-w-0 gap-5 px-5 pt-4 pb-11">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-muted-foreground">Grouped by position. Every note carries the snap and clip it came from.</p>
      <Button onClick={() => setAdding(true)}>Add player</Button>
    </div>
    {empty && <p>No {mode === 'off' ? 'offensive' : 'defensive'} players yet</p>}
    {groups.map((group) => {
      const members = players.filter((player) => player.group === group.key)
      if (!members.length) return null
      return <div key={group.key} className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-border pb-2">
          <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-[13px] font-bold text-primary-foreground">{group.key}</span>
          <h2 className="text-[15px] font-semibold tracking-tight">{group.label}</h2>
          <Meta>{members.length} {members.length === 1 ? 'player' : 'players'}</Meta>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {members.map((player) => <PlayerCard key={player._id} player={player} vocabulary={vocabulary} mode={mode} />)}
        </div>
      </div>
    })}
    {adding && <AddPlayerDialog workspaceId={workspaceId} mode={mode} onOpenChange={setAdding} />}
  </section>
}
