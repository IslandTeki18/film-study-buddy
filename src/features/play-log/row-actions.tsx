import { useSetMustReview } from './use-set-must-review'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { QuickNoteDialog } from '@/features/notes/quick-note-dialog'
import { useToast } from '@/components/ui/toast'

export function RowActions({ snap, base, onDuplicated }: {
  readonly snap: Doc<'snaps'>; readonly base: string; readonly onDuplicated: (id: Id<'snaps'>) => void
}): ReactNode {
  const navigate = useNavigate()
  const { show } = useToast()
  const label = snap.core.clipNumber ?? String(snap.order)
  const [noting, setNoting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const mark = useSetMustReview(snap.sourceGameId)
  const remove = useMutation(api.snaps.remove).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: snap.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    if (current) store.setQuery(api.snaps.listBySourceGame, query, current.filter((item) => item._id !== args.snapId))
  })
  const duplicate = useMutation(api.snaps.duplicate).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: snap.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    const original = current?.find((item) => item._id === args.snapId)
    if (!current || !original) return
    const next = current.find((item) => item.order > original.order)
    const now = Date.now()
    const copy: Doc<'snaps'> = { _id: `optimistic-${now}` as Id<'snaps'>, _creationTime: now,
      sourceGameId: original.sourceGameId, order: (original.order + (next?.order ?? original.order + 1)) / 2,
      core: { ...original.core }, analysis: { ...original.analysis }, mustReview: false, createdAt: now }
    store.setQuery(api.snaps.listBySourceGame, query, [...current, copy].sort((a, b) => a.order - b.order))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteSnap = useUndoableMutation(() => remove({ snapId: snap._id }), async (args) => { await undo(args) }, () => `Deleted Snap ${label}`)
  return <>
    <DropdownMenu label="⋯" triggerProps={{ variant: 'ghost', size: 'sm', className: 'h-7 px-2', 'aria-label': `Actions for Snap ${label}` }} items={[
      { label: 'Open Play Detail', onSelect: () => navigate(`${base}/snap/${snap._id}`) },
      { label: 'Add Quick Note', onSelect: () => setNoting(true) },
      { label: snap.mustReview ? 'Resolve Must Review' : 'Mark Must Review', onSelect: () => {
        void mark({ snapId: snap._id, mustReview: !snap.mustReview }).catch((error: unknown) => show({ message: `Could not update Must Review. ${error instanceof Error ? error.message : String(error)}` }))
      } },
      { label: 'Add / Edit Play Diagram', onSelect: () => navigate(`${base}/diagrams?snap=${snap._id}`) },
      { label: 'Duplicate Snap', disabled: pending, onSelect: () => {
        setPending(true)
        void duplicate({ snapId: snap._id }).then(onDuplicated)
          .catch((error: unknown) => show({ message: `Could not duplicate Snap. ${error instanceof Error ? error.message : String(error)}` }))
          .finally(() => setPending(false))
      } },
      { label: 'Delete Snap' , onSelect: () => { setError(''); setConfirming(true) } },
    ]} />
    <QuickNoteDialog open={noting} onOpenChange={setNoting} sourceGameId={snap.sourceGameId} snap={snap} />
    <Dialog open={confirming} onOpenChange={setConfirming} aria-label={`Delete Snap ${label}`}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete Snap {label}?</h2>
        <p>Its Cell Notes, Quick Notes and Play Diagram are soft-deleted with it. Undo restores them together.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true)
            void deleteSnap(undefined).then(() => setConfirming(false))
              .catch((error: unknown) => {
                const message = `Could not delete Snap. ${error instanceof Error ? error.message : String(error)}`
                setError(message)
                show({ message })
              })
              .finally(() => setPending(false))
          }}>Delete Snap</Button>
        </div>
      </div>}
    </Dialog>
  </>
}
