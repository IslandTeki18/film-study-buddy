import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { PLAYER_NOTE_SNAPS_MAX, PLAYER_NOTE_TEXT_MAX_LENGTH } from '@convex/domain/opponentPlayers'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Chip } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import type { OpponentPlayer } from './player-notes'

type PlayerNote = OpponentPlayer['notes'][number]
type SnapLink = PlayerNote['snaps'][number]

export function snapLinkLabel(snap: SnapLink): string {
  return `${snap.sourceGameLabel} · ${snap.clipNumber !== undefined ? `Clip ${snap.clipNumber}` : `Snap ${snap.order}`}`
}

type PlayerNoteDialogProps = {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly player: OpponentPlayer
  readonly sourceGameId: Id<'sourceGames'>; readonly snaps: readonly Doc<'snaps'>[]
  readonly initialSnapId: Id<'snaps'> | null; readonly note?: PlayerNote
}

export function PlayerNoteDialog(props: PlayerNoteDialogProps): ReactNode {
  return props.open ? <PlayerNoteForm {...props} /> : null
}

function PlayerNoteForm({ onOpenChange, player, sourceGameId, snaps, initialSnapId, note }: PlayerNoteDialogProps): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const create = useMutation(api.opponentPlayers.createNote)
  const update = useMutation(api.opponentPlayers.updateNote)
  const { show } = useToast()
  const [text, setText] = useState(note?.text ?? '')
  function linkFor(snap: Doc<'snaps'>): SnapLink {
    return { snapId: snap._id, sourceGameId, sourceGameLabel: game?.label ?? 'Source Game', order: snap.order,
      ...(snap.core.clipNumber !== undefined ? { clipNumber: snap.core.clipNumber } : {}) }
  }
  const [links, setLinks] = useState<SnapLink[]>(() => note ? note.snaps
    : snaps.filter((snap) => snap._id === initialSnapId).map(linkFor))
  const snapIds = links.map((snap) => snap.snapId)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const title = `${note ? 'Edit note' : 'Note'} for #${player.jersey} ${player.position}`
  return <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }} aria-label={title}
    onCancel={(event) => { if (pending) event.preventDefault() }}>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !text.trim()) return
      setPending(true); setError('')
      const save = note ? update({ noteId: note._id, text, snapIds }) : create({ playerId: player._id, text, snapIds })
      void save.then(() => { onOpenChange(false); show({ message: 'Player Note saved' }) }).catch((error: unknown) => {
        const message = `Could not save Player Note. ${error instanceof Error ? error.message : String(error)}`
        setError(message); show({ message })
      }).finally(() => setPending(false))
    }}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <fieldset disabled={pending} className="space-y-3">
        <Textarea aria-label="Player Note text" autoFocus maxLength={PLAYER_NOTE_TEXT_MAX_LENGTH} value={text} onChange={(event) => setText(event.target.value)} />
        <div className="flex flex-wrap gap-2">{links.map((link) => {
          const snap = link.sourceGameId === sourceGameId && game ? { ...link, sourceGameLabel: game.label } : link
          return <Chip key={snap.snapId}>
          {snapLinkLabel(snap)} <button type="button" className="ml-1 rounded focus-visible:outline-ring" aria-label={`Remove link to ${snapLinkLabel(snap)}`}
            onClick={() => setLinks((links) => links.filter((link) => link.snapId !== snap.snapId))}>×</button>
        </Chip>
        })}</div>
        <label className="block space-y-1"><span>Link a Snap</span><Select aria-label="Link a Snap" value="" disabled={snapIds.length >= PLAYER_NOTE_SNAPS_MAX}
          onChange={(event) => {
            const snap = snaps.find((snap) => snap._id === event.target.value)
            if (snap && !snapIds.includes(snap._id) && snapIds.length < PLAYER_NOTE_SNAPS_MAX) setLinks([...links, linkFor(snap)])
          }}>
          <option value="">Choose a Snap</option>
          {snaps.filter((snap) => !snapIds.includes(snap._id)).map((snap) => <option key={snap._id} value={snap._id}>
            {[snap.core.clipNumber !== undefined ? `Clip ${snap.core.clipNumber}` : `Snap ${snap.order}`,
              [snap.core.quarter !== undefined ? `Q${snap.core.quarter}` : '', snap.core.clock].filter(Boolean).join(' '),
              [snap.core.down, snap.core.distance].filter((value) => value !== undefined).join('&'), snap.core.formation].filter(Boolean).join(' · ')}
          </option>)}
        </Select></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={pending || !text.trim()}>Save</Button></div>
    </form>
  </Dialog>
}
