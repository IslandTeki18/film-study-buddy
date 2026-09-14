import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { TerminologyList } from '@convex/domain/terminology'
import { CORE_NUMBER_BOUNDS } from '@convex/domain/coreFields'
import { formatYardLine, isValidYardLine } from '@convex/domain/fieldZone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { Segmented } from '../preview/preview-shared'
import type { PlayLogColumn } from './columns'
import { groupKind, hasAnyValue, type Draft } from './palette-model'

function formatDraftValue(column: PlayLogColumn, value: unknown): string {
  if (!hasAnyValue({ [column.key]: value })) return ''
  if (column.kind === 'core' && column.field.key === 'yardLine') return isValidYardLine(value) ? formatYardLine(value) : ''
  return Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)
}

export function SnapPalette({ columns, terminology, draft, onDraftChange, nextSnapNumber, mustReview,
  onMustReviewChange, saving, onSave, onClear, onAddTerminology, onAddFieldOption }: {
  readonly columns: readonly PlayLogColumn[]
  readonly terminology: readonly { list: TerminologyList; value: string }[]
  readonly draft: Draft
  readonly onDraftChange: (next: Draft) => void
  readonly nextSnapNumber: number
  readonly mustReview: boolean
  readonly onMustReviewChange: (value: boolean) => void
  readonly saving: boolean
  readonly onSave: () => void
  readonly onClear: () => void
  readonly onAddTerminology: (list: TerminologyList, value: string) => Promise<void>
  readonly onAddFieldOption: (fieldId: Id<'templateFields'>, option: string) => Promise<void>
}): ReactNode {
  const paletteId = useId()
  const [layout, setLayout] = useState<'focus' | 'all'>('focus')
  const [groupIdx, setGroupIdx] = useState(0)
  const [adding, setAdding] = useState(false)
  const pending = useRef(false)
  const section = useRef<HTMLElement>(null)
  const latest = useRef(draft)
  latest.current = draft
  const active = columns[groupIdx] ?? columns[0]
  const activeKind = active ? groupKind(active, terminology) : undefined
  function next(column: PlayLogColumn): void {
    const index = columns.findIndex((item) => item.key === column.key)
    setGroupIdx(columns.length ? (index + 1) % columns.length : 0)
  }
  function change(column: PlayLogColumn, value: unknown): void {
    if (saving || pending.current) return
    const updated = { ...latest.current, [column.key]: value }
    latest.current = updated
    onDraftChange(updated)
  }
  function isSelected(column: PlayLogColumn, tag: string): boolean {
    const value = draft[column.key]
    return Array.isArray(value) ? value.includes(tag) : formatDraftValue(column, value) === tag
  }
  function pick(column: PlayLogColumn, tag: string): void {
    if (saving || pending.current) return
    const kind = groupKind(column, terminology)
    if (kind.kind !== 'tags') return
    const selected = isSelected(column, tag)
    let value: unknown = selected ? undefined : tag
    if (kind.multi) {
      const current = latest.current[column.key]
      const values = Array.isArray(current) ? current : []
      value = selected ? values.filter((item) => item !== tag) : [...values, tag]
    } else if (!selected && column.kind === 'template') {
      if (column.field.type === 'checkbox') value = tag === 'Yes'
      if (column.field.type === 'rating') value = Number(tag)
    } else if (!selected && column.kind === 'core' && column.field.input.kind === 'number') value = Number(tag)
    change(column, value)
    if (!kind.multi && !selected && active?.key === column.key) setGroupIdx(Math.min(columns.length - 1, groupIdx + 1))
  }
  function clear(): void {
    if (saving || pending.current) return
    onClear(); setGroupIdx(0)
  }
  function save(): void { if (!saving && !pending.current && hasAnyValue(latest.current)) onSave() }
  function addInput(column: PlayLogColumn): ReactNode {
    const list = column.kind === 'core' && column.field.input.kind === 'terminology' ? column.field.input.list : null
    if (!list && !(column.kind === 'template' && (column.field.type === 'select' || column.field.type === 'multiSelect'))) return null
    return <Input key={column.key} className="mt-2 h-8 font-mono text-[12px]" aria-label={`Add new ${column.label}`} placeholder="Add new…" disabled={saving || adding}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
        if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); return }
        if (event.key !== 'Enter') return
        event.preventDefault()
        const input = event.currentTarget
        const value = input.value.trim()
        if (!value || saving || pending.current) return
        pending.current = true; setAdding(true)
        void (async () => {
          try {
            if (list) await onAddTerminology(list, value)
            else if (column.kind === 'template') await onAddFieldOption(column.field._id, value)
            const previous = latest.current[column.key]
            const updated = { ...latest.current, [column.key]: column.kind === 'template' && column.field.type === 'multiSelect'
              ? [...new Set([...(Array.isArray(previous) ? previous : []), value])] : value }
            latest.current = updated; onDraftChange(updated); input.value = ''
          } catch { /* The parent callback displays the failure toast; keep the entered value. */ }
          finally { pending.current = false; setAdding(false) }
        })()
      }} />
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('input, textarea, select, [contenteditable="true"], dialog, [role="dialog"]')) return
      if (target !== document.body && !section.current?.contains(target)) return
      if (target.isContentEditable) return
      const interactive = target.closest('button, a, [role="button"], [role="radio"]')
      if (interactive && (!interactive.matches('[role="tab"], [data-palette-tag]') || event.key === 'Enter' || event.key === ' ' || event.key === 'Tab')) return
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); return }
      if (event.key === 'Escape') { event.preventDefault(); clear(); return }
      if (event.key === 'Tab' && columns.length) {
        event.preventDefault(); setGroupIdx((current) => (current + (event.shiftKey ? -1 : 1) + columns.length) % columns.length); return
      }
      if (!event.shiftKey && /^[1-9]$/.test(event.key) && active && activeKind?.kind === 'tags') {
        const tag = activeKind.tags[Number(event.key) - 1]
        if (tag) { event.preventDefault(); pick(active, tag) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  return (
    <section ref={section}>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <h2><Eyebrow className="text-xs">Chart a snap</Eyebrow></h2>
        <Meta>Click to chart — it advances to the next field · 1-9 picks, Tab next group, Enter saves</Meta>
        <span className="ml-auto"><Segmented label="Palette layout" value={layout} options={[['focus', 'One group'], ['all', 'All groups']]} onChange={setLayout} /></span>
      </div>

      {active && layout === 'focus' ? <div className="flex flex-wrap items-start gap-3.5">
        <div role="tablist" aria-label="Field groups" aria-orientation="vertical" onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? columns.length - 1
            : (groupIdx + (event.key === 'ArrowDown' ? 1 : -1) + columns.length) % columns.length
          setGroupIdx(index)
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus()
        }} className="grid max-h-[420px] min-w-0 flex-[0_0_176px] gap-1 overflow-y-auto">
          {columns.map((column, index) => {
            const value = formatDraftValue(column, draft[column.key])
            return <button key={column.key} type="button" role="tab" id={`${paletteId}-tab-${index}`} aria-controls={`${paletteId}-panel`} tabIndex={index === groupIdx ? 0 : -1} aria-selected={index === groupIdx} onClick={() => setGroupIdx(index)}
              className={cn('flex flex-col items-start gap-0.5 rounded-[9px] border px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                index === groupIdx ? 'border-brand/50 bg-accent text-foreground' : 'border-border bg-card text-muted-foreground')}>
              <span className="text-[11px] font-semibold tracking-[0.07em] uppercase">{column.label}</span>
              <span className={cn('font-mono text-[11.5px]', value ? 'text-brand' : 'text-muted-foreground')}>{value || 'not charted'}</span>
            </button>
          })}
        </div>
        <div role="tabpanel" id={`${paletteId}-panel`} aria-labelledby={`${paletteId}-tab-${groupIdx}`} className="min-w-0 flex-[1_1_320px] rounded-xl border border-brand/40 bg-accent px-4 py-3.5">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow className="text-foreground/70">{active.label}</Eyebrow>
            <Meta className="text-[10.5px]">{(activeKind?.kind === 'tags' ? activeKind.tags.length : 0)} tags · {formatDraftValue(active, draft[active.key]) || 'nothing picked'}</Meta>
          </div>
          {activeKind?.kind === 'tags' ? <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2">
            {activeKind.tags.map((tag, index) => {
              const selected = isSelected(active, tag)
              return <button key={tag} type="button" data-palette-tag disabled={saving || adding} aria-pressed={selected} onClick={() => pick(active, tag)}
                className={cn('flex min-h-[66px] flex-col items-start justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong bg-muted hover:border-muted-foreground/60')}>
                <span className="text-sm leading-tight font-semibold">{tag}</span>
                <span className={cn('font-mono text-[10px] tracking-[0.04em]', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {index < 9 ? `${index + 1} · ` : ''}
                </span>
              </button>
            })}
          </div>
          {addInput(active)}
          {active.kind === 'core' && active.field.key === 'quarter' && <GroupInput key={active.key} column={active} value={draft[active.key]} disabled={saving || adding} onChange={(value) => change(active, value)} onNext={() => next(active)} />}
          </> : <GroupInput key={active.key} column={active} value={draft[active.key]} disabled={saving || adding} onChange={(value) => change(active, value)} onNext={() => next(active)} />}
        </div>
      </div> : <div className="grid gap-2.5">
        {columns.map((column, index) => {
          const kind = groupKind(column, terminology)
          const value = formatDraftValue(column, draft[column.key])
          return <div key={column.key} className={cn('rounded-[11px] border px-3.5 py-3', index === groupIdx ? 'border-brand/50 bg-accent' : 'border-border bg-card')}>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow className="text-[10.5px] text-foreground/70">{column.label}</Eyebrow>
              <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.05em]', value ? 'bg-primary font-bold text-primary-foreground' : 'bg-primary/15 text-brand')}>
                {value || (index === groupIdx ? 'active' : '')}
              </span>
            </div>
            {kind.kind === 'tags' ? <>
            <div className="flex flex-wrap gap-1.5">
              {kind.tags.map((tag) => {
                const selected = isSelected(column, tag)
                return <button key={tag} type="button" data-palette-tag disabled={saving || adding} aria-pressed={selected} onClick={() => pick(column, tag)}
                  className={cn('rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary bg-primary font-bold text-primary-foreground' : 'border-border-strong bg-muted text-foreground/80 hover:border-muted-foreground/60')}>
                  {tag}
                </button>
              })}
            </div>
            {addInput(column)}
            {column.kind === 'core' && column.field.key === 'quarter' && <GroupInput key={column.key} column={column} value={draft[column.key]} disabled={saving || adding} onChange={(value) => change(column, value)} onNext={() => next(column)} />}
            </> : <GroupInput key={column.key} column={column} value={draft[column.key]} disabled={saving || adding} onChange={(value) => change(column, value)} onNext={() => next(column)} />}
          </div>
        })}
      </div>}

      <Panel className="mt-4.5 border-border-strong bg-muted/60 px-4 py-3.5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Eyebrow className="text-[10.5px] text-foreground/70">Snap {String(nextSnapNumber).padStart(2, '0')}</Eyebrow>
          <Meta>{columns.filter((column) => hasAnyValue({ [column.key]: draft[column.key] })).length} of {columns.length} fields</Meta>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" aria-pressed={mustReview} disabled={saving || adding} onClick={() => onMustReviewChange(!mustReview)}
              className={cn('h-8 bg-transparent', mustReview && 'border-warm bg-warm text-primary-foreground hover:bg-warm hover:text-primary-foreground')}>
              {mustReview ? '★' : '☆'} Must review
            </Button>
            <Button variant="outline" size="sm" className="h-8 bg-transparent" disabled={saving || adding} onClick={clear}>Clear</Button>
            <Button size="sm" className="h-8 font-mono text-[11px] font-bold" onClick={save} disabled={saving || adding || !hasAnyValue(draft)}>Save snap</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {columns.map((column, index) => {
            const value = formatDraftValue(column, draft[column.key])
            return <button key={column.key} type="button" onClick={() => setGroupIdx(index)}
              className={cn('min-w-[104px] rounded-lg border px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', value ? 'border-solid border-brand/50' : 'border-dashed border-border-strong')}>
              <div className="mb-0.5 text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{column.label}</div>
              <div className={cn('font-mono text-xs', value ? 'text-foreground' : 'text-muted-foreground')}>{value || '—'}</div>
            </button>
          })}
        </div>
      </Panel>

    </section>
)
}

function GroupInput({ column, value, disabled, onChange, onNext }: {
  readonly column: PlayLogColumn; readonly value: unknown; readonly disabled: boolean
  readonly onChange: (value: unknown) => void; readonly onNext: () => void
}): ReactNode {
  const [raw, setRaw] = useState(() => formatDraftValue(column, value))
  const emitted = useRef(value)
  useEffect(() => {
    if (value !== emitted.current) setRaw(formatDraftValue(column, value))
    emitted.current = value
  }, [value, column])
  function update(text: string): void {
    setRaw(text)
    const numeric = column.kind === 'core' ? column.field.input.kind === 'number' : column.field.type === 'number'
    const next = numeric ? text.trim() === '' ? undefined : Number(text)
      // ponytail: comma-separated tags; use chips if tags need embedded commas.
      : column.kind === 'template' && column.field.type === 'tags' ? text.split(',').map((tag) => tag.trim()).filter(Boolean) : text
    emitted.current = next
    onChange(next)
  }
  const props = { className: 'h-8 font-mono text-[12px]', 'aria-label': column.label, disabled }
  const numeric = column.kind === 'core' ? column.field.input.kind === 'number' : column.field.type === 'number'
  const key = column.kind === 'core' ? column.field.key : null
  const bounds = key === 'quarter' || key === 'down' || key === 'distance' || key === 'yards' ? CORE_NUMBER_BOUNDS[key] : undefined
  const spot = typeof value === 'object' && value !== null && 'side' in value && 'yard' in value ? value : undefined
  const side = spot && typeof spot.side === 'string' ? spot.side : ''
  return <div onKeyDown={(event) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onNext() }
    if (event.key === 'Escape') { event.preventDefault(); (event.target as HTMLElement).blur() }
  }}>
    {key === 'yardLine' ? <div className="flex gap-1">
      <Select {...props} aria-label="Yard Line side" value={side} onChange={(event) => {
        const nextSide = event.target.value
        onChange(nextSide ? { side: nextSide, yard: nextSide === 'mid' ? 50 : side === 'mid' ? '' : spot?.yard ?? '' } : undefined)
      }}><option value="" /><option value="own">OWN</option><option value="mid">50</option><option value="opp">OPP</option></Select>
      <Input {...props} aria-label="Yard Line yard" type="number" min={1} max={49} step={1} disabled={disabled || !side || side === 'mid'}
        aria-invalid={Boolean(side && !isValidYardLine(value))} value={side === 'mid' ? '' : typeof spot?.yard === 'number' || typeof spot?.yard === 'string' ? spot.yard : ''}
        onChange={(event) => onChange({ side, yard: event.target.value === '' ? '' : Number(event.target.value) })} />
    </div> : column.kind === 'template' && column.field.type === 'longText'
      ? <Textarea {...props} value={raw} onChange={(event) => update(event.target.value)} />
      : <Input {...props} type={numeric ? 'number' : 'text'} step={column.kind === 'core' ? 1 : 'any'} {...bounds}
        value={raw} onChange={(event) => update(event.target.value)} />}
  </div>
}
