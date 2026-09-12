import { useId, useState, type ReactNode } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { normalizeName } from '@convex/domain/names'

interface NameDialogProps {
  readonly open: boolean
  readonly title: string
  readonly label: string
  readonly initialValue: string
  readonly confirmLabel: string
  readonly onConfirm: (name: string) => Promise<void>
  readonly onOpenChange: (open: boolean) => void
}

export function NameDialog(props: NameDialogProps): ReactNode {
  return <Dialog open={props.open} onOpenChange={props.onOpenChange} aria-label={props.title}>
    {props.open && <NameForm {...props} />}
  </Dialog>
}

function NameForm({ title, label, initialValue, confirmLabel, onConfirm, onOpenChange }: NameDialogProps): ReactNode {
  const id = useId()
  const [name, setName] = useState(initialValue)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <form className="space-y-4" onSubmit={(event) => {
    event.preventDefault()
    const normalized = normalizeName(name)
    if (pending || normalized === null) return
    setPending(true)
    setError('')
    void onConfirm(normalized).then(() => onOpenChange(false)).catch((error: unknown) => {
      setError(error instanceof Error ? error.message : String(error))
    }).finally(() => setPending(false))
  }}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <label className="block space-y-2" htmlFor={id}>
      <span>{label}</span>
      <Input id={id} autoFocus value={name} onChange={(event) => setName(event.target.value)}
        onFocus={(event) => event.target.select()} disabled={pending} />
    </label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button type="submit" disabled={pending || normalizeName(name) === null}>{confirmLabel}</Button>
    </div>
  </form>
}
