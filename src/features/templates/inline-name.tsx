import { useEffect, useRef, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { useAutosave } from '@/lib/db/use-autosave'

interface InlineNameProps {
  readonly value: string
  readonly save: (value: string) => Promise<void>
  readonly label: string
  readonly focus?: boolean
}

export function InlineName({ value, save, label, focus = false }: InlineNameProps): ReactNode {
  const container = useRef<HTMLDivElement>(null)
  const { draft, setDraft, flush, status } = useAutosave(value, async (next) => {
    if (next !== value) await save(next)
  })
  useEffect(() => {
    if (!focus) return
    const input = container.current?.querySelector('input')
    input?.focus()
    input?.select()
  }, [focus])
  return <div ref={container} className="min-w-32 flex-1">
    <Input aria-label={label} value={draft} onChange={(event) => setDraft(event.target.value)}
      onBlur={flush} onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          flush()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setDraft(value)
          event.currentTarget.blur()
        }
      }} aria-invalid={status === 'error'} />
    {status === 'error' && <p role="alert" className="text-sm text-red-600">Not saved</p>}
  </div>
}
