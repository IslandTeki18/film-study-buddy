import { useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { QUICK_NOTE_TEXT_MAX_LENGTH, tagVocabulary } from '@convex/domain/quickNoteTags'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { TagPicker } from './tag-picker'

export function QuickNoteDialog({ open, onOpenChange, sourceGameId, snap }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void
  readonly sourceGameId: Id<'sourceGames'>; readonly snap?: Doc<'snaps'>
}): ReactNode {
  const notes = useQuery(api.notes.listQuickNotes, open ? { sourceGameId } : 'skip')
  const create = useMutation(api.notes.createQuickNote)
  const { show } = useToast()
  const id = useId()
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const title = snap ? `Quick Note for Snap ${snap.core.clipNumber ?? snap.order}` : 'Quick Note'
  function close(): void {
    if (pending) return
    setText(''); setTags([]); setError(''); onOpenChange(false)
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!next) close() }} aria-label={title}
    onCancel={(event) => { if (pending) event.preventDefault() }}>
    {open && <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <fieldset disabled={pending} className="space-y-3">
        <Textarea aria-label="Quick Note text" autoFocus maxLength={QUICK_NOTE_TEXT_MAX_LENGTH} value={text} onChange={(event) => setText(event.target.value)} />
        <TagPicker vocabulary={tagVocabulary((notes ?? []).flatMap((note) => note.tags))} selected={tags} onChange={setTags} idPrefix={id} />
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={close}>Cancel</Button>
        <Button disabled={pending || !text.trim()} onClick={() => {
          if (pending || !text.trim()) return
          setPending(true); setError('')
          void create({ sourceGameId, ...(snap ? { snapId: snap._id } : {}), text, tags }).then(() => {
            setText(''); setTags([]); onOpenChange(false); show({ message: 'Quick Note saved' })
          }).catch((error: unknown) => {
            const message = `Could not save Quick Note. ${error instanceof Error ? error.message : String(error)}`
            setError(message); show({ message })
          }).finally(() => setPending(false))
        }}>Save</Button>
      </div>
    </div>}
  </Dialog>
}
