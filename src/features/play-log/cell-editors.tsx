import type { ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useAutosave } from '@/lib/db/use-autosave'
import { useToast } from '@/components/ui/toast'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Textarea } from '@/components/ui/textarea'

export function CellNoteEditor({ label, note, onSave, onEscape }: {
  readonly label: string; readonly note: string; readonly onSave: (text: string) => Promise<void>
  readonly onEscape?: () => void
}): ReactNode {
  const { draft, setDraft, flush, status } = useAutosave(note, onSave)
  return <div onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); flush(); onEscape() }
  }}>
    <Textarea aria-label={`Cell Note for ${label}`} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
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
