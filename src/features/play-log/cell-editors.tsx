import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useAutosave } from '@/lib/db/use-autosave'
import { useToast } from '@/components/ui/toast'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { TerminologyList } from '@convex/domain/terminology'
import { normalizeCoreValue } from '@convex/domain/coreFields'
import { normalizeAnalysisValue } from '@convex/domain/templateFields'
import type { PlayLogColumn } from './columns'
import { groupKind } from './palette-model'
import { GroupInput } from './snap-palette'

export function CellNoteEditor({ label, note, onSave, onEscape, onRemove }: {
  readonly label: string; readonly note: string; readonly onSave: (text: string) => Promise<void>
  readonly onEscape?: () => void; readonly onRemove?: () => void
}): ReactNode {
  const { draft, setDraft, flush, discard, status } = useAutosave(note, onSave)
  const [removing, setRemoving] = useState(false)
  return <div onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); flush(); onEscape() }
  }}>
    <Textarea aria-label={`Cell Note for ${label}`} value={draft} disabled={removing} onChange={(event) => setDraft(event.target.value)} onBlur={flush} />
    {onRemove && <Button variant="ghost" size="sm" aria-label={`Remove Cell Note for ${label}`} disabled={removing} onClick={() => {
      setRemoving(true)
      void discard().then(() => onSave('')).then(onRemove).catch(() => undefined).finally(() => setRemoving(false))
    }}>Remove note</Button>}
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

/** Saves one field of one Snap through the existing mutations. */
export function useUpdateSnapField(snap: Doc<'snaps'>): (column: PlayLogColumn, value: unknown) => Promise<void> {
  const { show } = useToast()
  const updateCore = useMutation(api.snaps.updateCore)
  const updateAnalysis = useMutation(api.snaps.updateAnalysis)
  return async (column, value) => {
    try {
      if (column.kind === 'core') {
        const next = normalizeCoreValue(column.field.key, value)
        await updateCore(next === undefined ? { snapId: snap._id, key: column.field.key } : { snapId: snap._id, key: column.field.key, value: next })
      } else {
        const next = normalizeAnalysisValue(column.field, value)
        await updateAnalysis({ snapId: snap._id, fieldId: column.field._id, value: next })
      }
    } catch (error) {
      show({ message: `Could not update ${column.label}. ${error instanceof Error ? error.message : String(error)}` })
      throw error
    }
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export const PendingFieldEdits = createContext<Set<() => Promise<void>> | null>(null)

function DeferredInput({ column, value, disabled, onSave }: {
  readonly column: PlayLogColumn; readonly value: unknown; readonly disabled: boolean
  readonly onSave: (value: unknown) => Promise<void>
}): ReactNode {
  const [draft, setDraft] = useState(value)
  const latest = useRef(draft)
  const saved = useRef(value)
  const pending = useRef<Promise<void> | null>(null)
  const cancelled = useRef(false)
  const edits = useContext(PendingFieldEdits)
  const [, rerender] = useState(0)
  useEffect(() => {
    if (!sameValue(value, saved.current)) {
      saved.current = value
      latest.current = value
      setDraft(value)
    }
  }, [value])
  function commit(): Promise<void> {
    if (pending.current) return pending.current
    if (sameValue(latest.current, saved.current)) return Promise.resolve()
    const next = latest.current
    pending.current = onSave(next).then(() => { saved.current = next })
      .finally(() => { pending.current = null; rerender((count) => count + 1) })
    rerender((count) => count + 1)
    return pending.current
  }
  useEffect(() => {
    edits?.add(commit)
    return () => { edits?.delete(commit) }
  })
  function save(): void { void commit().catch(() => undefined) }
  return <div onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      if (cancelled.current) cancelled.current = false
      else save()
    }
  }} onKeyDown={(event) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    cancelled.current = true
    latest.current = saved.current
    setDraft(saved.current);
    (event.target as HTMLElement).blur()
  }}>
    <GroupInput column={column} value={draft} disabled={disabled || pending.current !== null}
      onChange={(next) => { latest.current = next; setDraft(next) }} onNext={save} />
  </div>
}

/** One editable Snap field for Play Detail. */
export function FieldEditor({ column, value, terminology, onSave }: {
  readonly column: PlayLogColumn; readonly value: unknown
  readonly terminology: readonly { list: TerminologyList; value: string }[]
  readonly onSave: (value: unknown) => Promise<void>
}): ReactNode {
  const [pending, setPending] = useState(false)
  const kind = column.kind === 'core' && column.field.key === 'quarter' ? { kind: 'input' as const } : groupKind(column, terminology)
  function commit(next: unknown): void {
    if (pending) return
    setPending(true)
    void onSave(next).catch(() => undefined).finally(() => setPending(false))
  }
  if (kind.kind === 'tags') {
    const multi = kind.multi
    const current = Array.isArray(value) ? value.map(String) : value === undefined ? '' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)
    const singleCurrent = Array.isArray(current) ? '' : current
    const tags = [...new Set([...kind.tags, ...(Array.isArray(current) ? current : singleCurrent ? [singleCurrent] : [])])]
    return <Select aria-label={column.label} multiple={multi} disabled={pending} className="font-mono text-[12px]"
      value={multi ? (Array.isArray(value) ? value.map(String) : []) : singleCurrent}
      onChange={(event) => {
        if (multi) { commit([...event.target.selectedOptions].map((option) => option.value)); return }
        const picked = event.target.value
        if (!picked) { commit(undefined); return }
        if (column.kind === 'template' && column.field.type === 'checkbox') { commit(picked === 'Yes'); return }
        if (column.kind === 'template' && column.field.type === 'rating') { commit(Number(picked)); return }
        if (column.kind === 'core' && column.field.input.kind === 'number') { commit(Number(picked)); return }
        commit(picked)
      }}>
      {!multi && <option value="">—</option>}
      {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
    </Select>
  }
  return <DeferredInput column={column} value={value} disabled={pending} onSave={onSave} />
}
