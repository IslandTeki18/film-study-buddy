import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { provenanceOf, restoredValueFor } from '@convex/domain/provenance'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useAutosave } from '@/lib/db/use-autosave'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { CORE_NUMBER_BOUNDS, formatCoreValue } from '@convex/domain/coreFields'
import { isValidYardLine } from '@convex/domain/fieldZone'
import { builtInTerminology, type TerminologyList } from '@convex/domain/terminology'
import { RATING_MAX, RATING_MIN } from '@convex/domain/templateFields'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover } from '@/components/ui/popover'
import type { PlayLogColumn } from './columns'

export function CellEditor({ snap, column, initialDraft, canTab, terminology, onCommit, onRestore, onCancel, note, onSaveNote }: {
  readonly note: string
  readonly onSaveNote: (text: string) => Promise<void>
  readonly snap: Doc<'snaps'>
  readonly column: PlayLogColumn
  readonly initialDraft: string | undefined
  readonly canTab: (shift: boolean) => boolean
  readonly terminology: readonly { list: TerminologyList; value: string }[]
  readonly onCommit: (value: unknown, move: number | null, newOption?: string) => void
  readonly onRestore: () => Promise<boolean>
  readonly onCancel: () => void
}): ReactNode {
  const [noting, setNoting] = useState(false)
  const editor = useRef<HTMLDivElement>(null)
  const [booleanValue, setBooleanValue] = useState(column.kind === 'template' && Boolean(snap.analysis[column.field._id]))
  const [restoring, setRestoring] = useState(false)
  const original = column.kind === 'core' && provenanceOf(snap.imported, column.field.key, snap.core[column.field.key]) === 'Coach Edited'
    ? restoredValueFor(snap.imported, column.field.key) : null
  const current = column.kind === 'core' ? snap.core[column.field.key] : snap.analysis[column.field._id]
  const [draft, setDraft] = useState(initialDraft ?? (column.kind === 'core' ? formatCoreValue(column.field.key, current)
    : Array.isArray(current) ? current.join(', ') : current === undefined ? '' : String(current)))
  const [checked, setChecked] = useState<string[]>(Array.isArray(current) ? current : [])
  const yardLine = column.kind === 'core' && column.field.key === 'yardLine'
  const [side, setSide] = useState(isValidYardLine(current) ? current.side : '')
  const [yard, setYard] = useState(isValidYardLine(current) && current.side !== 'mid' ? String(current.yard) : '')
  const spot = side === '' ? undefined : { side, yard: side === 'mid' ? 50 : Number(yard) }
  const invalidSpot = yardLine && spot !== undefined && !isValidYardLine(spot)
  const [adding, setAdding] = useState(false)
  const [newOption, setNewOption] = useState('')
  const datalistId = useId()
  const list = column.kind === 'core' && column.field.input.kind === 'terminology' ? column.field.input.list : null
  const terms = list ? [...builtInTerminology(list), ...terminology.filter((item) => item.list === list).map((item) => item.value)].sort((a, b) => a.localeCompare(b)) : []
  let sentinel = '__add__'
  if (column.kind === 'template') while (column.field.options.includes(sentinel)) sentinel += '_'
  const ended = useRef(false)
  const popover = useRef<HTMLDivElement>(null)
  const multi = column.kind === 'template' && column.field.type === 'multiSelect'
  useEffect(() => {
    if (multi) {
      popover.current?.showPopover()
      popover.current?.querySelector<HTMLInputElement>('input')?.focus()
    }
  }, [multi])
  function commit(move: number | null = 0): void {
    if (ended.current || invalidSpot || (adding && !newOption.trim())) return
    ended.current = true
    let value: unknown = yardLine ? spot : draft
    if (column.kind === 'template') {
      if (column.field.type === 'checkbox') value = booleanValue
      else if (multi) value = newOption.trim() ? [...checked, newOption.trim()] : checked
      else if (adding) value = newOption.trim()
      else if (column.field.type === 'number' || column.field.type === 'rating') value = draft.trim() === '' ? null : Number(draft)
      // ponytail: comma-separated tags; add chip input if coaches need commas inside a tag.
      else if (column.field.type === 'tags') value = draft.split(',')
    }
    onCommit(value, move, adding || multi ? newOption.trim() || undefined : undefined)
  }
  const noteControls = <>
    <Button data-note-toggle aria-keyshortcuts="Alt+N" type="button" variant="outline" size="sm" aria-expanded={noting}
      onClick={() => setNoting((current) => !current)}>Note</Button>
    {noting && <CellNoteEditor label={column.label} note={note} onSave={onSaveNote}
      onEscape={() => { setNoting(false); editor.current?.querySelector<HTMLButtonElement>('[data-note-toggle]')?.focus() }} />}
  </>
  let control: ReactNode
  if (column.kind === 'template' && column.field.type === 'checkbox') {
    control = <Checkbox autoFocus label={column.label} checked={booleanValue} onChange={(event) => setBooleanValue(event.target.checked)} />
  } else if (adding) {
    control = <Input autoFocus aria-label="New option" className="h-7 px-1 text-xs" value={newOption}
      onChange={(event) => setNewOption(event.target.value)} />
  } else if (yardLine) {
    control = <div className="flex gap-1">
      <Select autoFocus aria-label="Yard Line side" className="h-7 w-20 px-1 text-xs" value={side}
        onChange={(event) => { setSide(event.target.value); if (event.target.value === 'mid' || event.target.value === '') setYard('') }}>
        <option value="" /><option value="own">OWN</option><option value="mid">50</option><option value="opp">OPP</option>
      </Select>
      <Input aria-label="Yard Line yard" aria-invalid={invalidSpot} className="h-7 min-w-0 px-1 text-xs"
        type="number" min={1} max={49} step={1} disabled={side === '' || side === 'mid'}
        value={yard} onChange={(event) => setYard(event.target.value)} />
    </div>
  } else if (column.kind === 'template' && multi) {
    control = <Popover trigger="Choose options" contentRef={popover}
      onBeforeToggle={(event) => { if (event.newState === 'closed') commit(null) }}>
      <div className="flex flex-col gap-2">
        {column.field.options.map((option) => <Checkbox key={option} label={option} checked={checked.includes(option)}
          onChange={(event) => setChecked(event.target.checked ? [...checked, option] : checked.filter((item) => item !== option))} />)}
        {column.field.options.length === 0 && <p>No options yet</p>}
        <Input aria-label="New option" placeholder="Add new option…" value={newOption} onChange={(event) => setNewOption(event.target.value)} />
        {noteControls}
      </div>
    </Popover>
  } else if ((column.kind === 'core' && column.field.input.kind === 'select') ||
    (column.kind === 'template' && (column.field.type === 'select' || column.field.type === 'rating'))) {
    const options = column.kind === 'core' && column.field.input.kind === 'select' ? column.field.input.options
      : column.kind === 'template' && column.field.type === 'rating'
        ? Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, index) => String(index + RATING_MIN))
        : column.kind === 'template' ? column.field.options : []
    control = <Select autoFocus aria-label={column.label} className="h-7 px-1 text-xs" value={draft} onChange={(event) => {
      if (event.target.value === sentinel && column.kind === 'template' && column.field.type === 'select') setAdding(true)
      else setDraft(event.target.value)
    }}>
      <option value="" />
      {draft && !options.includes(draft) && <option value={draft}>{draft}</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
      {column.kind === 'template' && column.field.type === 'select' && <option value={sentinel}>Add new option…</option>}
    </Select>
  } else if (column.kind === 'template' && column.field.type === 'longText') {
    control = <Textarea autoFocus rows={2} aria-label={column.label} value={draft} onChange={(event) => setDraft(event.target.value)} />
  } else {
    const numeric = column.kind === 'core' ? column.field.input.kind === 'number' : column.field.type === 'number'
    const key = column.kind === 'core' ? column.field.key : null
    const bounds = key === 'quarter' || key === 'down' || key === 'distance' || key === 'yards' ? CORE_NUMBER_BOUNDS[key] : undefined
    control = <><Input autoFocus aria-label={column.label} list={list ? datalistId : undefined} className="h-7 px-1 text-xs" type={numeric ? 'number' : 'text'}
      step={column.kind === 'core' ? 1 : 'any'} {...bounds} value={draft} onChange={(event) => setDraft(event.target.value)} />
      {list && <datalist id={datalistId}>{terms.map((term) => <option key={term} value={term} />)}</datalist>}
    </>
  }
  return <div ref={editor} onBlur={(event) => {
    if (!multi && !event.currentTarget.contains(event.relatedTarget)) commit(null)
  }} onKeyDown={(event) => {
    event.stopPropagation()
    if (event.nativeEvent.isComposing) return
    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      setNoting(true)
      requestAnimationFrame(() => editor.current?.querySelector<HTMLTextAreaElement>('[aria-label^="Cell Note for"]')?.focus())
      return
    }
    if (event.target instanceof HTMLElement && event.target.hasAttribute('data-note-toggle') && event.key !== 'Escape') return
    if (original !== null && event.altKey && event.key === 'ArrowDown') {
      event.preventDefault()
      event.currentTarget.querySelector<HTMLButtonElement>('[data-restore]')?.focus()
    } else if (event.target instanceof HTMLElement && event.target.hasAttribute('data-restore') && event.key === 'ArrowUp') {
      event.preventDefault()
      event.currentTarget.querySelector<HTMLElement>('input, select, textarea')?.focus()
    } else if (event.target instanceof HTMLElement && event.target.hasAttribute('data-restore') && (event.key === 'Enter' || event.key === ' ')) {
      return
    } else if (yardLine && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault()
      event.currentTarget.querySelector<HTMLElement>(event.key === 'ArrowRight' ? 'input:not(:disabled)' : 'select')?.focus()
    } else if (multi && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      const options = Array.from(popover.current?.querySelectorAll<HTMLInputElement>('input') ?? [])
      const index = options.findIndex((option) => option === document.activeElement)
      options[Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (adding) { setAdding(false); setNewOption(''); return }
      ended.current = true
      onCancel()
    } else if (event.key === 'Tab') {
      if (invalidSpot || (adding && !newOption.trim())) { event.preventDefault(); return }
      const inside = canTab(event.shiftKey)
      if (inside) event.preventDefault()
      else event.currentTarget.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex]')
        .forEach((control) => { control.tabIndex = -1 })
      commit(inside ? event.shiftKey ? -1 : 1 : null)
    } else if (event.key === 'Enter' && !(event.shiftKey && column.kind === 'template' && column.field.type === 'longText')) {
      event.preventDefault()
      commit()
    }
  }}>{control}
    {!multi && noteControls}
    {original !== null && <Button data-restore type="button" variant="outline" size="sm" className="mt-1 max-w-full text-xs"
      disabled={restoring} title="Alt+ArrowDown focuses Restore original" onClick={() => {
        if (restoring || column.kind !== 'core') return
        ended.current = true
        setRestoring(true)
        void onRestore().then((saved) => {
          if (saved) onCancel()
          else ended.current = false
        }).finally(() => setRestoring(false))
      }}>Restore original ({original})</Button>}
  </div>
}

export function CellNoteEditor({ label, note, onSave, onEscape }: {
  readonly label: string; readonly note: string; readonly onSave: (text: string) => Promise<void>
  readonly onEscape?: () => void
}): ReactNode {
  const { draft, setDraft, flush, status } = useAutosave(note, onSave)
  return <div onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); flush(); onEscape() }
  }}>
    <Textarea aria-label={`Cell Note for ${label}`} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
    {status === 'error' && <p role="alert">Cell Note could not be saved. Edit or blur to retry.</p>}
  </div>
}

export function useSaveCellNote(sourceGameId: Id<'sourceGames'>): (args: { snapId: Id<'snaps'>; fieldKey: string; text: string }) => Promise<void> {
  const { show } = useToast()
  const save = useMutation(api.notes.setCellNote).withOptimisticUpdate((store, args) => {
    function update(notes: Doc<'cellNotes'>[]): Doc<'cellNotes'>[] {
      const existing = notes.find((note) => note.snapId === args.snapId && note.fieldKey === args.fieldKey)
      const rest = notes.filter((note) => note !== existing)
      const text = args.text.trim()
      return text ? [...rest, { _id: existing?._id ?? `optimistic-${args.snapId}-${args.fieldKey}` as Id<'cellNotes'>,
        _creationTime: existing?._creationTime ?? Date.now(), snapId: args.snapId, sourceGameId, fieldKey: args.fieldKey, text }] : rest
    }
    const gameNotes = store.getQuery(api.notes.listCellNotesBySourceGame, { sourceGameId })
    if (gameNotes) store.setQuery(api.notes.listCellNotesBySourceGame, { sourceGameId }, update(gameNotes))
    const snapNotes = store.getQuery(api.notes.listCellNotes, { snapId: args.snapId })
    if (snapNotes) store.setQuery(api.notes.listCellNotes, { snapId: args.snapId }, update(snapNotes))
  })
  return async (args) => {
    try { await save(args) }
    catch (error) {
      show({ message: `Could not update Cell Note. ${error instanceof Error ? error.message : String(error)}` })
      throw error
    }
  }
}
