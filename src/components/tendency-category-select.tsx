import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function TendencyCategorySelect({ value, onChange, id }: {
  readonly value: string; readonly onChange: (next: string) => void; readonly id: string
}): ReactNode {
  const categories = useQuery(api.tendencies.listCategories, {})
  const create = useMutation(api.tendencies.createCategory)
  const [custom, setCustom] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <div className="space-y-2">
    <Select id={id} value={custom === null ? value : ''} onChange={(event) => {
      setError('')
      if (event.target.value === '') setCustom('')
      else { setCustom(null); onChange(event.target.value) }
    }} disabled={categories === undefined || pending}>
      {!categories?.includes(value) && <option value={value}>{value}</option>}
      {categories?.map((category) => <option key={category} value={category}>{category}</option>)}
      <option value="">New category…</option>
    </Select>
    {custom !== null && <Input autoFocus aria-label="New category name" placeholder="New category, then press Enter" maxLength={NAME_MAX_LENGTH} value={custom} disabled={pending}
      onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setCustom(null); setError(''); document.getElementById(id)?.focus() }
        if (event.key !== 'Enter') return
        event.preventDefault()
        if (pending || !custom.trim()) return
        setPending(true); setError('')
        void create({ name: custom }).then((name) => { onChange(name); setCustom(null); window.requestAnimationFrame(() => document.getElementById(id)?.focus()) })
          .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error))).finally(() => setPending(false))
      }} />}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}
