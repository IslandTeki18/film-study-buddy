import { useId, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { AggregateRow } from '@convex/domain/aggregate'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { TENDENCY_NOTE_MAX_LENGTH } from '@convex/domain/tendencyCategories'
import { TendencyCategorySelect } from '@/components/tendency-category-select'
import { TendencySnapshot } from '@/components/tendency-snapshot'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

export function CreateTendencyDialog({ open, onOpenChange, workspaceId, groupBy, groupBy2, groupLabels, row }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void
  readonly workspaceId: Id<'workspaces'>; readonly groupBy: string; readonly groupBy2?: string
  readonly groupLabels: readonly string[]; readonly row: AggregateRow
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const create = useMutation(api.tendencies.create)
  const [title, setTitle] = useState(row.values.join(' + ').slice(0, NAME_MAX_LENGTH))
  const [category, setCategory] = useState(groupBy === 'core:formation' ? 'Formation' : 'Run Game')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`} onCancel={(event) => { if (pending) event.preventDefault() }}>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !title.trim()) return
      setPending(true); setError('')
      void create({ workspaceId, groupBy, ...(groupBy2 ? { groupBy2 } : {}), values: row.values, title, category, note }).then(() => {
        show({ message: 'Created Tendency / Alert' }); onOpenChange(false)
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setError(message); show({ message })
      }).finally(() => setPending(false))
    }}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Create Tendency / Alert</h2>
      <TendencySnapshot snapshot={{ groupBy: groupLabels[0] ?? '', ...(groupLabels[1] ? { groupBy2: groupLabels[1] } : {}), rows: [row] }} />
      <fieldset disabled={pending} className="grid gap-3">
        <div><label htmlFor={`${id}-title`}>Title</label><Input id={`${id}-title`} autoFocus maxLength={NAME_MAX_LENGTH} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div><label htmlFor={`${id}-category`}>Category</label><TendencyCategorySelect id={`${id}-category`} value={category} onChange={setCategory} /></div>
        <div><label htmlFor={`${id}-note`}>Coach explanation</label><Textarea id={`${id}-note`} maxLength={TENDENCY_NOTE_MAX_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} /></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={pending || !title.trim()}>Create</Button><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button></div>
    </form>
  </Dialog>
}
