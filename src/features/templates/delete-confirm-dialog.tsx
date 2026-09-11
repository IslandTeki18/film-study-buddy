import { useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { api } from '@convex/_generated/api'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly kind: 'template' | 'section' | 'field'
  readonly name: string
  readonly args: FunctionArgs<typeof api.templates.getUsage>
  readonly onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ open, onOpenChange, kind, name, args, onConfirm }: DeleteConfirmDialogProps): ReactNode {
  const usage = useQuery(api.templates.getUsage, open ? args : 'skip')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange} aria-label={`Delete ${kind} ${name}?`}>
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Delete {kind} {name}?</h2>
      {usage === undefined ? <p role="status">Checking for existing data…</p> : usage.snapCount > 0 ?
        <p>{usage.snapCount} Snaps have data in this {kind}. Deleting it hides that data. You can undo this for 24 hours.</p> :
        <p>You can undo this for 24 hours.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button autoFocus variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button disabled={pending || usage === undefined} onClick={() => {
          if (pending || usage === undefined) return
          setPending(true)
          setError('')
          void onConfirm().then(() => onOpenChange(false)).catch((error: unknown) => {
            setError(error instanceof Error ? error.message : String(error))
          }).finally(() => setPending(false))
        }}>{usage && usage.snapCount > 0 ? `Delete ${kind} and its data` : `Delete ${kind}`}</Button>
      </div>
    </div>
  </Dialog>
}
