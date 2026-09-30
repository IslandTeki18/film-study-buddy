import { useId, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ODK_VALUES } from '@convex/domain/coreFields'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { TENDENCY_NOTE_MAX_LENGTH } from '@convex/domain/tendencyCategories'
import { TendencyCategorySelect } from '@/components/tendency-category-select'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

export type TellRow = FunctionReturnType<typeof api.tells.list>[number]
export type Odk = (typeof ODK_VALUES)[number]

export function defaultTellTitle(tell: TellRow): string {
  return `${tell.indicators.map((part) => part.value).join(' + ')}: ${tell.outcome.value} ${tell.hits}/${tell.snaps}`.slice(0, NAME_MAX_LENGTH)
}

export function SaveTellDialog({ open, onOpenChange, workspaceId, odk, tell }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void
  readonly workspaceId: Id<'workspaces'>; readonly odk: Odk | undefined; readonly tell: TellRow
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const promote = useMutation(api.tells.promote)
  const [title, setTitle] = useState(defaultTellTitle(tell))
  const [category, setCategory] = useState('Formation')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`} onCancel={(event) => { if (pending) event.preventDefault() }}>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !title.trim()) return
      setPending(true); setError('')
      void promote({ workspaceId, ...(odk ? { odk } : {}), tellKey: tell.key, title, category, note }).then(() => {
        show({ message: 'Saved Tell as a Tendency / Alert' }); onOpenChange(false)
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setError(message); show({ message })
      }).finally(() => setPending(false))
    }}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Save Tell as Tendency / Alert</h2>
      <p className="text-sm">{tell.hits} of {tell.snaps} snaps ({Math.round(tell.share * 100)}%). All snaps: {Math.round(tell.baseline * 100)}%.</p>
      <fieldset disabled={pending} className="grid gap-3">
        <div><label htmlFor={`${id}-title`}>Title</label><Input id={`${id}-title`} autoFocus maxLength={NAME_MAX_LENGTH} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div><label htmlFor={`${id}-category`}>Category</label><TendencyCategorySelect id={`${id}-category`} value={category} onChange={setCategory} /></div>
        <div><label htmlFor={`${id}-note`}>Coach explanation</label><Textarea id={`${id}-note`} maxLength={TENDENCY_NOTE_MAX_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} /></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={pending || !title.trim()}>Save</Button><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button></div>
    </form>
  </Dialog>
}
