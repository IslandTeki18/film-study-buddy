import { useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { PlayerNoteDialog, snapLinkLabel } from './player-note-dialog'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  groupsForSide, PLAYER_GRADES, PLAYER_NAME_MAX_LENGTH, PLAYER_DETAILS_MAX_LENGTH,
  PLAYER_POSITION_MAX_LENGTH, PLAYER_PROFILE_TEXT_MAX_LENGTH, PLAYER_TRAIT_MAX_LENGTH, type PositionGroupKey,
} from '@convex/domain/opponentPlayers'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Meta, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { TagPicker } from '@/features/notes/tag-picker'
import { useAutosave } from '@/lib/db/use-autosave'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import type { Mode } from '../preview/preview-data'
import type { OpponentPlayer } from './player-notes'

export function PlayerCard({ player, vocabulary, mode, sourceGameId, snaps }: {
  readonly sourceGameId: Id<'sourceGames'>; readonly snaps: readonly Doc<'snaps'>[]
  readonly player: OpponentPlayer; readonly vocabulary: readonly string[]; readonly mode: Mode
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const update = useMutation(api.opponentPlayers.update)
  const jersey = useAutosave(player.jersey, async (jersey) => { await update({ playerId: player._id, jersey }) })
  const position = useAutosave(player.position, async (position) => { await update({ playerId: player._id, position }) })
  const name = useAutosave(player.name, async (name) => { await update({ playerId: player._id, name }) })
  const details = useAutosave(player.details, async (details) => { await update({ playerId: player._id, details }) })
  const summary = useAutosave(player.summary, async (summary) => { await update({ playerId: player._id, summary }) })
  const tendency = useAutosave(player.tendency, async (tendency) => { await update({ playerId: player._id, tendency }) })
  const assignment = useAutosave(player.assignment, async (assignment) => { await update({ playerId: player._id, assignment }) })
  const unsettled = [jersey, position, name, details, summary, tendency, assignment].some((field) => field.status !== 'idle')
  const [noting, setNoting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const remove = useMutation(api.opponentPlayers.remove)
  const undo = useMutation(api.deletions.undo)
  const label = `#${player.jersey} ${player.position}`
  const deletePlayer = useUndoableMutation(() => remove({ playerId: player._id }), async (args) => { await undo(args) }, () => `Deleted ${label}`)
  const commit = (fields: Omit<Parameters<typeof update>[0], 'playerId'>): void => {
    void update({ playerId: player._id, ...fields }).catch((error: unknown) => show({ message: `Could not update Opponent Player. ${error instanceof Error ? error.message : String(error)}` }))
  }
  function field(label: string, value: ReturnType<typeof useAutosave<string>>, maxLength: number, multiline = false): ReactNode {
    const props = { 'aria-label': label, value: value.draft, maxLength,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => value.setDraft(event.target.value), onBlur: value.flush }
    return <div className="space-y-1"><label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>
      {multiline ? <Textarea {...props} /> : <Input {...props} {...(label === 'Jersey #' ? { inputMode: 'numeric' } : {})} />}</label>
      {value.status !== 'idle' && <Meta role="status">{value.status === 'error' ? <>Save failed <Button variant="ghost" size="sm" onClick={value.flush}>Retry</Button></> : 'Saving…'}</Meta>}
    </div>
  }
  return <Panel aria-label={label} className="grid min-w-0 content-start gap-2.5 px-4 py-3.5">
    <div className="flex items-center gap-2.5">
      <span className="rounded-lg bg-foreground/80 px-2 py-1 font-mono text-base font-bold text-background">{player.jersey}</span>
      <h3 className="min-w-0 text-sm font-semibold tracking-tight">{player.position}{player.name && ` — ${player.name}`}</h3>
      <DropdownMenu label="⋯" triggerProps={{ variant: 'ghost', size: 'sm', className: 'ml-auto', 'aria-label': `Actions for ${label}` }} items={[
        { label: 'Delete player', disabled: unsettled, onSelect: () => { setError(''); setConfirming(true) } },
      ]} />
    </div>
    <div className="grid grid-cols-2 gap-2">{field('Jersey #', jersey, 2)}{field('Position', position, PLAYER_POSITION_MAX_LENGTH)}</div>
    {field('Name', name, PLAYER_NAME_MAX_LENGTH)}
    {field('Details', details, PLAYER_DETAILS_MAX_LENGTH)}
    <label className="block space-y-1"><span className="text-xs text-muted-foreground">Group</span>
      <Select aria-label="Group" value={player.group} disabled={unsettled} onChange={(event) => commit({ group: event.target.value as PositionGroupKey })}>
        {groupsForSide(mode === 'off' ? 'offense' : 'defense').map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
      </Select>
    </label>
    <div className="flex items-center gap-2"><Meta>Grade</Meta>{PLAYER_GRADES.map((grade) => <Button key={grade} size="sm" variant={player.grade === grade ? 'default' : 'outline'}
      aria-label={`Grade ${grade}`} aria-pressed={player.grade === grade} onClick={() => commit({ grade: player.grade === grade ? null : grade })}>{grade}</Button>)}</div>
    <div><Meta>Traits</Meta><TagPicker idPrefix={id} vocabulary={vocabulary} selected={player.traits} maxLength={PLAYER_TRAIT_MAX_LENGTH} onChange={(traits) => commit({ traits })} /></div>
    {field('Summary', summary, PLAYER_PROFILE_TEXT_MAX_LENGTH, true)}
    <dl className="grid gap-2 border-t border-border pt-2.5">
      <div><dt className="sr-only">Tendency</dt><dd>{field('Tendency', tendency, PLAYER_PROFILE_TEXT_MAX_LENGTH, true)}</dd></div>
      <div><dt className="sr-only">Our job</dt><dd>{field('Our job', assignment, PLAYER_PROFILE_TEXT_MAX_LENGTH, true)}</dd></div>
      <div className="flex items-baseline gap-2"><dt><Meta>Clips</Meta></dt><dd className="font-mono text-[11px] text-brand">{player.clipCount} {player.clipCount === 1 ? 'clip' : 'clips'}</dd></div>
    </dl>
    <div className="grid gap-3 border-t border-border pt-3">
      <Button variant="outline" size="sm" onClick={() => setNoting(true)}>Add note</Button>
      {player.notes.map((note) => <PlayerNoteEntry key={note._id} note={note} player={player} sourceGameId={sourceGameId} snaps={snaps} />)}
    </div>
    <PlayerNoteDialog open={noting} onOpenChange={setNoting} player={player} sourceGameId={sourceGameId} snaps={snaps} initialSnapId={null} />
    <Dialog open={confirming} onOpenChange={(open) => { if (!pending) setConfirming(open) }} aria-label={`Delete ${label}?`}
      onCancel={(event) => { if (pending) event.preventDefault() }}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete {label}?</h2>
        <p>Their Player Notes are soft-deleted with them. Undo restores them together.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button autoFocus variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true); setError('')
            void deletePlayer(undefined).then(() => setConfirming(false)).catch((error: unknown) => {
              const message = `Could not delete player. ${error instanceof Error ? error.message : String(error)}`
              setError(message); show({ message })
            }).finally(() => setPending(false))
          }}>Delete player</Button></div>
      </div>}
    </Dialog>
  </Panel>
}

function PlayerNoteEntry({ note, player, sourceGameId, snaps }: {
  readonly note: OpponentPlayer['notes'][number]; readonly player: OpponentPlayer
  readonly sourceGameId: Id<'sourceGames'>; readonly snaps: readonly Doc<'snaps'>[]
}): ReactNode {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { show } = useToast()
  const remove = useMutation(api.opponentPlayers.removeNote)
  const undo = useMutation(api.deletions.undo)
  const deleteNote = useUndoableMutation(() => remove({ noteId: note._id }), async (args) => { await undo(args) }, () => 'Deleted Player Note')
  return <article className="space-y-2 rounded-lg border border-border p-3">
    <div className="flex items-center justify-between gap-2"><Meta><time dateTime={new Date(note.createdAt).toISOString()}>{new Date(note.createdAt).toLocaleDateString()}</time></Meta>
      <DropdownMenu label="⋯" triggerProps={{ variant: 'ghost', size: 'sm', 'aria-label': 'Player Note actions' }} items={[
        { label: 'Edit note', onSelect: () => setEditing(true) },
        { label: 'Delete note', onSelect: () => { setError(''); setConfirming(true) } },
      ]} />
    </div>
    <p className="text-xs whitespace-pre-wrap">{note.text}</p>
    <div className="flex flex-wrap gap-1.5">{note.snaps.map((snap) => <Link key={snap.snapId}
      className="rounded-md border border-border-strong bg-muted px-2 py-1 font-mono text-[11px] text-brand focus-visible:outline-ring"
      to={`/w/${player.workspaceId}/games/${snap.sourceGameId}/snap/${snap.snapId}`}>{snapLinkLabel(snap)}</Link>)}</div>
    <PlayerNoteDialog open={editing} onOpenChange={setEditing} player={player} sourceGameId={sourceGameId} snaps={snaps} initialSnapId={null} note={note} />
    <Dialog open={confirming} onOpenChange={(open) => { if (!pending) setConfirming(open) }} aria-label="Delete Player Note?"
      onCancel={(event) => { if (pending) event.preventDefault() }}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete Player Note?</h2>
        <p>The Player Note is soft-deleted. Undo restores it.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button autoFocus variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true); setError('')
            void deleteNote(undefined).then(() => setConfirming(false)).catch((error: unknown) => {
              const message = `Could not delete Player Note. ${error instanceof Error ? error.message : String(error)}`
              setError(message); show({ message })
            }).finally(() => setPending(false))
          }}>Delete note</Button></div>
      </div>}
    </Dialog>
  </article>
}
