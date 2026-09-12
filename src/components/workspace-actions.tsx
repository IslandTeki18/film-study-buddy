import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'

interface WorkspaceActionsProps {
  readonly workspaceId: Id<'workspaces'>
  readonly archived: boolean
  readonly label: string
}

export function WorkspaceActions({ workspaceId, label, archived }: WorkspaceActionsProps): ReactNode {
  const archive = useMutation(api.workspaces.archive)
  const unarchive = useMutation(api.workspaces.unarchive)
  const { show } = useToast()
  const [archiving, setArchiving] = useState(false)
  async function changeArchive(): Promise<void> {
    if (archiving) return
    setArchiving(true)
    try {
      if (archived) {
        await unarchive({ workspaceId })
        show({ message: `Reopened ${label}` })
      } else {
        await archive({ workspaceId })
        let used = false
        show({ message: `Archived ${label}`, action: { label: 'Undo', onAction: () => {
          if (used) return
          used = true
          void unarchive({ workspaceId }).catch((error: unknown) => {
            show({ message: `Could not reopen Workspace. ${error instanceof Error ? error.message : String(error)}` })
          })
        } } })
      }
    } catch (error) {
      show({ message: `Could not ${archived ? 'reopen' : 'archive'} Workspace. ${error instanceof Error ? error.message : String(error)}` })
    } finally { setArchiving(false) }
  }
  const remove = useMutation(api.workspaces.remove)
  const undo = useMutation(api.deletions.undo)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const deleteWorkspace = useUndoableMutation(
    () => remove({ workspaceId }), async (args) => { await undo(args) }, () => `Deleted ${label}`,
  )
  return <>
    <DropdownMenu label="Actions" triggerProps={{ variant: 'outline', 'aria-label': `Actions for ${label}` }}
      items={[
        { label: archived ? 'Reopen' : 'Archive', disabled: archiving, onSelect: () => { void changeArchive() } },
        { label: 'Delete', onSelect: () => { setError(''); setConfirming(true) } },
      ]} />
    <Dialog open={confirming} onOpenChange={setConfirming} aria-label={`Delete ${label}`}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete {label}?</h2>
        <p>This Weekly Opponent Workspace and all its Source Games, Snaps, notes, diagrams, Tendencies and Reports will be soft-deleted. Undo restores them together.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true)
            void deleteWorkspace(undefined).then(() => setConfirming(false))
              .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
              .finally(() => setPending(false))
          }}>Delete</Button>
        </div>
      </div>}
    </Dialog>
  </>
}
