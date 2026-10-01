import { useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import type { TerminologyList } from '@convex/domain/terminology'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Meta } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'

/** Add, rename, or remove values in one pick list. Snaps keep the values they already have. */
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
  const [newValue, setNewValue] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
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
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`}>
    <div className="grid gap-4">
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Edit {label} list</h2>
      <p className="text-sm">Changes affect the pick list only. Snaps keep the value they already have. To restore a removed value, add it again.</p>
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault()
        if (newValue.trim()) void run(() => add({ list, value: newValue }), () => setNewValue(''))
      }}>
        <Input aria-label={`New ${label}`} placeholder={`Add ${label}…`} maxLength={NAME_MAX_LENGTH} value={newValue} disabled={pending} onChange={(event) => setNewValue(event.target.value)} />
        <Button type="submit" disabled={pending || !newValue.trim()}>Add</Button>
      </form>
      {values === undefined ? <div role="status" aria-label={`Loading ${label} list`} className="h-24 animate-pulse rounded bg-muted" />
        : values.length === 0 ? <Meta>The list is empty.</Meta>
        : <ul className="grid max-h-80 gap-1 overflow-y-auto" aria-label={`${label} values`}>{values.map((entry) =>
          <li key={entry.value} className="flex items-center gap-2 text-sm">
            {renaming?.from === entry.value ? <form className="flex flex-1 gap-2" onSubmit={(event) => {
              event.preventDefault()
              if (renaming.to.trim()) void run(() => rename({ list, from: renaming.from, to: renaming.to }), () => setRenaming(null))
            }}>
              <Input aria-label={`Rename ${entry.value}`} autoFocus maxLength={NAME_MAX_LENGTH} value={renaming.to} disabled={pending}
                onChange={(event) => setRenaming({ from: entry.value, to: event.target.value })}
                onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setRenaming(null) } }} />
              <Button type="submit" size="sm" disabled={pending || !renaming.to.trim()}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            </form> : <>
              <span className="flex-1">{entry.value}</span>
              {entry.builtIn && <Meta>Built-in</Meta>}
              <Button size="sm" variant="ghost" disabled={pending} aria-label={`Rename ${entry.value}`} onClick={() => setRenaming({ from: entry.value, to: entry.value })}>Rename</Button>
              <Button size="sm" variant="ghost" disabled={pending} aria-label={`Remove ${entry.value}`} onClick={() => { void run(() => remove({ list, value: entry.value })) }}>Remove</Button>
            </>}
          </li>)}</ul>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div><Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button></div>
    </div>
  </Dialog>
}
