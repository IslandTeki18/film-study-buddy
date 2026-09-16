import type { ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Select } from '@/components/ui/select'

export function TendencyCategorySelect({ value, onChange, id }: {
  readonly value: string; readonly onChange: (next: string) => void; readonly id: string
}): ReactNode {
  const categories = useQuery(api.tendencies.listCategories, {})
  return <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={categories === undefined}>
    {!categories?.includes(value) && <option value={value}>{value}</option>}
    {categories?.map((category) => <option key={category} value={category}>{category}</option>)}
  </Select>
}
