import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useAutosave } from '@/lib/db/use-autosave'
import { useToast } from '@/components/ui/toast'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function CellNoteEditor({ label, note, onSave, onEscape, onRemove }: {
  readonly label: string; readonly note: string; readonly onSave: (text: string) => Promise<void>
  readonly onEscape?: () => void; readonly onRemove?: () => void
}): ReactNode {
  const { draft, setDraft, flush, discard, status } = useAutosave(note, onSave)
  const [removing, setRemoving] = useState(false)
  return <div onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); flush(); onEscape() }
  }}>
    <Textarea aria-label={`Cell Note for ${label}`} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
    {onRemove && <Button variant="ghost" size="sm" aria-label={`Remove Cell Note for ${label}`} disabled={removing} onClick={() => {
      setRemoving(true)
      void discard().then(() => onSave('')).then(onRemove).catch(() => undefined).finally(() => setRemoving(false))
    }}>Remove note</Button>}
    {status === 'error' && <p role="alert">Cell Note could not be saved. Edit or blur to retry.</p>}
  </div>
}

export function useSaveCellNote(sourceGameId: Id<'sourceGames'>): (args: { snapId: Id<'snaps'>; fieldKey: string; text: string }) => Promise<void> {
  const { show } = useToast()
  const save = useMutation(api.notes.setCellNote).withOptimisticUpdate((store, args) => {
    function update(notes: Doc<'cellNotes'>[]): Doc<'cellNotes'>[] {
      const existing = notes.find((note) => note.snapId === args.snapId && note.fieldKey === args.fieldKey)
      const rest = notes.filter((note) => note !== existing)
      const text = args.text.trim()
      return text ? [...rest, { _id: existing?._id ?? `optimistic-${args.snapId}-${args.fieldKey}` as Id<'cellNotes'>,
        _creationTime: existing?._creationTime ?? Date.now(), snapId: args.snapId, sourceGameId, fieldKey: args.fieldKey, text }] : rest
    }
    const gameNotes = store.getQuery(api.notes.listCellNotesBySourceGame, { sourceGameId })
    if (gameNotes) store.setQuery(api.notes.listCellNotesBySourceGame, { sourceGameId }, update(gameNotes))
    const snapNotes = store.getQuery(api.notes.listCellNotes, { snapId: args.snapId })
    if (snapNotes) store.setQuery(api.notes.listCellNotes, { snapId: args.snapId }, update(snapNotes))
  })
  return async (args) => {
    try { await save(args) }
    catch (error) {
      show({ message: `Could not update Cell Note. ${error instanceof Error ? error.message : String(error)}` })
      throw error
    }
  }
}
