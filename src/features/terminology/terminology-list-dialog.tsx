import { useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { builtInDescription, TERMINOLOGY_DESCRIPTION_MAX_LENGTH, type TerminologyList } from '@convex/domain/terminology'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Meta } from '@/components/ui/panel'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

interface EditDraft { readonly from: string; readonly name: string; readonly description: string }

/** Add, rename, describe, or remove values in one pick list. Snaps keep the values they already have. */
export function TerminologyListDialog({ list, label, open, onOpenChange }: {
  readonly list: TerminologyList; readonly label: string
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const terminology = useQuery(api.terminology.list, open ? {} : 'skip')
  const add = useMutation(api.terminology.add)
  const remove = useMutation(api.terminology.remove)
  const rename = useMutation(api.terminology.rename)
  const describe = useMutation(api.terminology.describe)
  const [newValue, setNewValue] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editing, setEditing] = useState<EditDraft | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const values = terminology?.filter((entry) => entry.list === list).sort((a, b) => a.value.localeCompare(b.value))
  async function run(action: () => Promise<unknown>, onDone?: () => void): Promise<void> {
    if (pending) return
    setPending(true); setError('')
    try { await action(); onDone?.() }
    catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message); show({ message: `Could not update ${label} list. ${message}` })
    } finally { setPending(false) }
  }
  async function saveEdit(draft: EditDraft, currentDescription: string): Promise<void> {
    const name = draft.name.trim()
    // Rename first: the description moves with the value, then any edit to it applies to the new name.
    if (name !== draft.from) await rename({ list, from: draft.from, to: name })
    if (draft.description.trim() !== currentDescription) await describe({ list, value: name, description: draft.description })
  }
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`}>
    <div className="grid gap-4">
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Edit {label} list</h2>
      <p className="text-sm">Changes affect the pick list only. Snaps keep the value they already have. To restore a removed value, add it again.</p>
      <form className="grid gap-2" onSubmit={(event) => {
        event.preventDefault()
        if (newValue.trim()) void run(() => add({ list, value: newValue, ...(newDescription.trim() ? { description: newDescription } : {}) }), () => { setNewValue(''); setNewDescription('') })
      }}>
        <div className="flex gap-2">
          <Input aria-label={`New ${label}`} placeholder={`Add ${label}…`} maxLength={NAME_MAX_LENGTH} value={newValue} disabled={pending} onChange={(event) => setNewValue(event.target.value)} />
          <Button type="submit" disabled={pending || !newValue.trim()}>Add</Button>
        </div>
        <Input aria-label={`New ${label} description`} placeholder="Description (optional): what it looks like on film" maxLength={TERMINOLOGY_DESCRIPTION_MAX_LENGTH}
          value={newDescription} disabled={pending} onChange={(event) => setNewDescription(event.target.value)} />
      </form>
      {values === undefined ? <div role="status" aria-label={`Loading ${label} list`} className="h-24 animate-pulse rounded bg-muted" />
        : values.length === 0 ? <Meta>The list is empty.</Meta>
        : <ul className="grid max-h-96 gap-2 overflow-y-auto" aria-label={`${label} values`}>{values.map((entry) => {
          const description = entry.description ?? ''
          return <li key={entry.value} className="grid gap-1 border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
            {editing?.from === entry.value ? <form className="grid gap-2" onSubmit={(event) => {
              event.preventDefault()
              if (editing.name.trim()) void run(() => saveEdit(editing, description), () => setEditing(null))
            }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setEditing(null) } }}>
              <Input aria-label={`Name for ${entry.value}`} autoFocus maxLength={NAME_MAX_LENGTH} value={editing.name} disabled={pending}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              <Textarea aria-label={`Description for ${entry.value}`} rows={2} maxLength={TERMINOLOGY_DESCRIPTION_MAX_LENGTH} value={editing.description} disabled={pending}
                placeholder={entry.builtIn ? 'Leave empty to use the default description' : 'What it looks like on film'}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending || !editing.name.trim()}>Save</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                {entry.builtIn && description !== builtInDescription(list, entry.value) && <Button type="button" size="sm" variant="ghost" disabled={pending}
                  onClick={() => setEditing({ ...editing, description: '' })}>Use default description</Button>}
              </div>
            </form> : <>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-semibold">{entry.value}</span>
                {entry.builtIn && <Meta>Built-in</Meta>}
                <Button size="sm" variant="ghost" disabled={pending} aria-label={`Edit ${entry.value}`} onClick={() => setEditing({ from: entry.value, name: entry.value, description })}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={pending} aria-label={`Remove ${entry.value}`} onClick={() => { void run(() => remove({ list, value: entry.value })) }}>Remove</Button>
              </div>
              {description ? <p className="text-muted-foreground">{description}</p> : <Meta>No description yet</Meta>}
            </>}
          </li>
        })}</ul>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div><Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button></div>
    </div>
  </Dialog>
}
