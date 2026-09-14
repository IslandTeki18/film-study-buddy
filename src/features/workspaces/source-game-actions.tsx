import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'

export function SourceGameActions({ sourceGameId, label }: {
  readonly sourceGameId: Id<'sourceGames'>; readonly label: string
}): ReactNode {
  const rename = useMutation(api.sourceGames.rename)
  const remove = useMutation(api.sourceGames.remove)
  const undo = useMutation(api.deletions.undo)
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const deleteGame = useUndoableMutation(
    () => remove({ sourceGameId }), async (args) => { await undo(args) }, () => `Deleted ${label}`,
  )
  return <>
    <DropdownMenu label="Actions" triggerProps={{ variant: 'outline', 'aria-label': `Actions for ${label}` }} items={[
      { label: 'Rename', onSelect: () => setRenaming(true) },
      { label: 'Delete', onSelect: () => { setError(''); setConfirming(true) } },
    ]} />
    <NameDialog open={renaming} title="Rename Source Game" label="Label" initialValue={label}
      confirmLabel="Rename" onOpenChange={setRenaming}
      onConfirm={async (next) => { await rename({ sourceGameId, label: next }) }} />
    <Dialog open={confirming} onOpenChange={setConfirming} aria-label={`Delete ${label}`}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete {label}?</h2>
        <p>This Source Game and its Snaps, Quick Notes, Cell Notes and Play Diagrams will be soft-deleted. Undo restores them together.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true)
            void deleteGame(undefined).then(() => setConfirming(false))
              .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
              .finally(() => setPending(false))
          }}>Delete</Button>
        </div>
      </div>}
    </Dialog>
  </>
}
