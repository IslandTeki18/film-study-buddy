import { useState, type ReactNode } from 'react'
import { normalizeQuickNoteTags, QUICK_NOTE_TAG_MAX_LENGTH } from '@convex/domain/quickNoteTags'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function TagPicker({ vocabulary, selected, onChange, idPrefix }: {
  readonly vocabulary: readonly string[]; readonly selected: readonly string[]
  readonly onChange: (next: string[]) => void; readonly idPrefix: string
}): ReactNode {
  const [custom, setCustom] = useState('')
  return <fieldset className="space-y-2">
    <legend className="sr-only">Tags</legend>
    <div className="flex flex-wrap gap-2">{normalizeQuickNoteTags([...vocabulary, ...selected]).map((tag) => {
      const active = selected.some((value) => value.toLowerCase() === tag.toLowerCase())
      return <button key={tag} type="button" aria-pressed={active}
        className={cn('rounded-md border border-border-strong bg-muted px-2 py-1 font-mono text-[11px] text-foreground/80 focus-visible:outline-ring', active && 'border-primary text-primary')}
        onClick={() => onChange(active ? selected.filter((value) => value.toLowerCase() !== tag.toLowerCase()) : normalizeQuickNoteTags([...selected, tag]))}>{tag}</button>
    })}</div>
    <Input id={`${idPrefix}-custom-tag`} aria-label="Add tag" placeholder="Add tag, then press Enter" value={custom} maxLength={QUICK_NOTE_TAG_MAX_LENGTH}
      onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
        event.preventDefault()
        onChange(normalizeQuickNoteTags([...selected, custom]))
        setCustom('')
      }} />
  </fieldset>
}
