import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { CORE_NUMBER_BOUNDS, formatCoreValue } from '@convex/domain/coreFields'
import { RATING_MAX, RATING_MIN } from '@convex/domain/templateFields'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover } from '@/components/ui/popover'
import type { PlayLogColumn } from './columns'

export function CellEditor({ snap, column, onCommit, onCancel }: {
  readonly snap: Doc<'snaps'>
  readonly column: PlayLogColumn
  readonly onCommit: (value: unknown, move: number) => void
  readonly onCancel: () => void
}): ReactNode {
  const current = column.kind === 'core' ? snap.core[column.field.key] : snap.analysis[column.field._id]
  const [draft, setDraft] = useState(column.kind === 'core' ? formatCoreValue(column.field.key, current)
    : Array.isArray(current) ? current.join(', ') : current === undefined ? '' : String(current))
  const [checked, setChecked] = useState<string[]>(Array.isArray(current) ? current : [])
  const ended = useRef(false)
  const popover = useRef<HTMLDivElement>(null)
  const multi = column.kind === 'template' && column.field.type === 'multiSelect'
  useEffect(() => {
    if (multi) {
      popover.current?.showPopover()
      popover.current?.querySelector<HTMLInputElement>('input')?.focus()
    }
  }, [multi])
  function commit(move = 0): void {
    if (ended.current) return
    ended.current = true
    let value: unknown = draft
    if (column.kind === 'template') {
      if (multi) value = checked
      else if (column.field.type === 'number' || column.field.type === 'rating') value = draft.trim() === '' ? null : Number(draft)
      // ponytail: comma-separated tags; add chip input if coaches need commas inside a tag.
      else if (column.field.type === 'tags') value = draft.split(',')
    }
    onCommit(value, move)
  }
  let control: ReactNode
  if (column.kind === 'template' && multi) {
    control = <Popover trigger="Choose options" contentRef={popover}
      onToggle={(event) => { if (event.newState === 'closed') commit() }}>
      <div className="flex flex-col gap-2">
        {column.field.options.map((option) => <Checkbox key={option} label={option} checked={checked.includes(option)}
          onChange={(event) => setChecked(event.target.checked ? [...checked, option] : checked.filter((item) => item !== option))} />)}
        {column.field.options.length === 0 && <p>No options yet</p>}
      </div>
    </Popover>
  } else if ((column.kind === 'core' && column.field.input.kind === 'select') ||
    (column.kind === 'template' && (column.field.type === 'select' || column.field.type === 'rating'))) {
    const options = column.kind === 'core' && column.field.input.kind === 'select' ? column.field.input.options
      : column.kind === 'template' && column.field.type === 'rating'
        ? Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, index) => String(index + RATING_MIN))
        : column.kind === 'template' ? column.field.options : []
    control = <Select autoFocus aria-label={column.label} className="h-7 px-1 text-xs" value={draft} onChange={(event) => setDraft(event.target.value)}>
      <option value="" />
      {draft && !options.includes(draft) && <option value={draft}>{draft}</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </Select>
  } else if (column.kind === 'template' && column.field.type === 'longText') {
    control = <Textarea autoFocus rows={2} aria-label={column.label} value={draft} onChange={(event) => setDraft(event.target.value)} />
  } else {
    const numeric = column.kind === 'core' ? column.field.input.kind === 'number' : column.field.type === 'number'
    const key = column.kind === 'core' ? column.field.key : null
    const bounds = key === 'quarter' || key === 'down' || key === 'distance' || key === 'yards' ? CORE_NUMBER_BOUNDS[key] : undefined
    control = <Input autoFocus aria-label={column.label} className="h-7 px-1 text-xs" type={numeric ? 'number' : 'text'}
      step={column.kind === 'core' ? 1 : 'any'} {...bounds} value={draft} onChange={(event) => setDraft(event.target.value)} />
  }
  return <div onBlur={(event) => {
    if (!multi && !event.currentTarget.contains(event.relatedTarget)) commit()
  }} onKeyDown={(event) => {
    event.stopPropagation()
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      ended.current = true
      onCancel()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      commit(event.shiftKey ? -1 : 1)
    } else if (event.key === 'Enter' && !(event.shiftKey && column.kind === 'template' && column.field.type === 'longText')) {
      event.preventDefault()
      commit()
    }
  }}>{control}</div>
}
