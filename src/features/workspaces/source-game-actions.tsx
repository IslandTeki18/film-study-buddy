import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { useToast } from '@/components/ui/toast'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'

/** Rename lives in a menu; remove is one click with an Undo toast instead of a confirmation. */
export function SourceGameActions({ sourceGameId, label }: {
  readonly sourceGameId: Id<'sourceGames'>; readonly label: string
}): ReactNode {
  const rename = useMutation(api.sourceGames.rename)
  const remove = useMutation(api.sourceGames.remove)
  const undo = useMutation(api.deletions.undo)
  const { show } = useToast()
  const [renaming, setRenaming] = useState(false)
  const [pending, setPending] = useState(false)
  const removeGame = useUndoableMutation(
    () => remove({ sourceGameId }), async (args) => { await undo(args) }, () => `Removed ${label}`,
  )
  return <span className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
    <DropdownMenu label="⋯" triggerProps={{ variant: 'ghost', size: 'sm', className: 'px-2 font-mono text-[13px]', 'aria-label': `Actions for ${label}` }}
      items={[{ label: 'Rename', onSelect: () => setRenaming(true) }]} />
    <Button variant="ghost" size="sm" aria-label={`Remove ${label}`} title={`Remove ${label}`} disabled={pending}
      className="px-2 font-mono text-[13px]" onClick={() => {
        setPending(true)
        void removeGame(undefined)
          .catch((error: unknown) => show({ message: `Could not remove ${label}. ${error instanceof Error ? error.message : String(error)}` }))
          .finally(() => setPending(false))
      }}>×</Button>
    <NameDialog open={renaming} title="Rename Source Game" label="Label" initialValue={label}
      confirmLabel="Rename" onOpenChange={setRenaming}
      onConfirm={async (next) => { await rename({ sourceGameId, label: next }) }} />
  </span>
}
