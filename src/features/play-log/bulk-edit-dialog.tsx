import { useId, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { CORE_NUMBER_BOUNDS, isCoreFieldKey, normalizeCoreValue } from '@convex/domain/coreFields'
import { normalizeAnalysisValue, RATING_MIN, RATING_MAX, type AnalysisValue } from '@convex/domain/templateFields'
import { builtInTerminology, type TerminologyList } from '@convex/domain/terminology'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import type { FunctionArgs } from 'convex/server'
import type { PlayLogColumn } from './columns'

export function BulkEditDialog({ sourceGameId, snapIds, columns, terminology, onClose, onApplied }: {
  readonly sourceGameId: Id<'sourceGames'>; readonly snapIds: Id<'snaps'>[]
  readonly columns: readonly PlayLogColumn[]
  readonly terminology: readonly { list: TerminologyList; value: string }[]
  readonly onClose: () => void; readonly onApplied: () => void
}): ReactNode {
  const choices = columns.filter((column) => column.key !== 'core:yardLine')
  const [key, setKey] = useState(choices[0]?.key ?? '')
  const column = choices.find((column) => column.key === key)
  const [draft, setDraft] = useState('')
  const [checked, setChecked] = useState(false)
  const [multiple, setMultiple] = useState<string[]>([])
  const [clear, setClear] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const datalistId = useId()
  const { show } = useToast()
  const update = useMutation(api.snaps.bulkUpdate).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.snaps.listBySourceGame, { sourceGameId: args.sourceGameId })
    if (!current) return
    const selected = new Set(args.snapIds)
    store.setQuery(api.snaps.listBySourceGame, { sourceGameId: args.sourceGameId }, current.map((snap) => {
      if (!selected.has(snap._id)) return snap
      if (args.target.kind === 'core' && isCoreFieldKey(args.target.key)) {
        const core = { ...snap.core }
        if (args.value === null) delete core[args.target.key]
        else Object.assign(core, { [args.target.key]: args.value })
        return { ...snap, core }
      }
      if (args.target.kind === 'template') {
        const analysis = { ...snap.analysis }
        if (args.value === null) delete analysis[args.target.fieldId]
        else analysis[args.target.fieldId] = args.value
        return { ...snap, analysis }
      }
      return snap
    }))
  })
  const current = useQuery(api.snaps.listBySourceGame, { sourceGameId })
  const before = useRef<Doc<'snaps'>[]>([])
  const undo = useMutation(api.snaps.undoBulkUpdate).withOptimisticUpdate((store) => {
    const snaps = store.getQuery(api.snaps.listBySourceGame, { sourceGameId })
    if (!snaps || !column) return
    store.setQuery(api.snaps.listBySourceGame, { sourceGameId }, snaps.map((snap) => {
      const original = before.current.find((item) => item._id === snap._id)
      if (!original) return snap
      if (column.kind === 'core') {
        const core = { ...snap.core }
        const value = original.core[column.field.key]
        if (value === undefined) delete core[column.field.key]
        else Object.assign(core, { [column.field.key]: value })
        return { ...snap, core }
      }
      const analysis = { ...snap.analysis }
      const value = original.analysis[column.field._id]
      if (value === undefined) delete analysis[column.field._id]
      else analysis[column.field._id] = value
      return { ...snap, analysis }
    }))
  })
  const run = useUndoableMutation(async (args: FunctionArgs<typeof api.snaps.bulkUpdate>) => {
    before.current = (current ?? []).filter((snap) => args.snapIds.includes(snap._id))
    return update(args)
  }, async ({ batchId }) => { await undo({ bulkEditId: batchId }) }, () => `Set ${column?.label ?? 'field'} on ${snapIds.length} Snaps`)
  const list = column?.kind === 'core' && column.field.input.kind === 'terminology' ? column.field.input.list : null
  const terms = list ? [...new Set([...builtInTerminology(list), ...terminology.filter((item) => item.list === list).map((item) => item.value)])].sort() : []
  const options = column?.kind === 'core' && column.field.input.kind === 'select' ? column.field.input.options
    : column?.kind === 'template' && column.field.type === 'rating' ? Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => String(i + RATING_MIN))
      : column?.kind === 'template' && column.field.type === 'select' ? column.field.options : null
  const numeric = column?.kind === 'core' ? column.field.input.kind === 'number' : column?.field.type === 'number'
  const coreKey = column?.kind === 'core' ? column.field.key : null
  const bounds = coreKey === 'quarter' || coreKey === 'down' || coreKey === 'distance' || coreKey === 'yards' ? CORE_NUMBER_BOUNDS[coreKey] : {}
  const label = clear ? 'blank' : column?.kind === 'template' && column.field.type === 'checkbox' ? checked ? 'Yes' : 'No'
    : column?.kind === 'template' && column.field.type === 'multiSelect' ? multiple.join(', ') : draft
  async function apply(): Promise<void> {
    if (!column || pending) return
    setPending(true)
    setError('')
    try {
      let value: AnalysisValue | null = null
      if (!clear) {
        if (column.kind === 'core') {
          const normalized = normalizeCoreValue(column.field.key, draft)
          if (typeof normalized === 'object') throw new Error('Yard Line cannot be bulk edited')
          value = normalized ?? null
        } else {
          const type = column.field.type
          value = normalizeAnalysisValue(column.field, type === 'checkbox' ? checked : type === 'multiSelect' ? multiple
            : type === 'tags' ? draft.split(',') : type === 'number' || type === 'rating' ? draft.trim() ? Number(draft) : null : draft)
        }
      }
      await run({ sourceGameId, snapIds, target: column.kind === 'core' ? { kind: 'core', key: column.field.key }
        : { kind: 'template', fieldId: column.field._id }, value })
      onApplied()
    } catch (error) {
      const message = `Could not bulk edit Snaps. ${error instanceof Error ? error.message : String(error)}`
      setError(message)
      show({ message })
    } finally { setPending(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }} aria-label="Set field on selected Snaps"
    onToggle={(event) => { if (event.currentTarget.open) event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus() }}>
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Set field on {snapIds.length} Snaps</h2>
      <label className="block space-y-1">Field<Select value={key} disabled={pending} onChange={(event) => {
        setKey(event.target.value); setDraft(''); setChecked(false); setMultiple([]); setClear(false)
      }}>{choices.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</Select></label>
      <fieldset disabled={clear || pending}>
        <legend className="mb-1">Value</legend>
        {options ? <Select aria-label="Value" value={draft} onChange={(event) => setDraft(event.target.value)}>
          <option value="" />{options.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select> : column?.kind === 'template' && column.field.type === 'checkbox' ? <Checkbox label={column.label} checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          : column?.kind === 'template' && column.field.type === 'multiSelect' ? <div className="flex flex-col gap-2">
            {column.field.options.map((option) => <Checkbox key={option} label={option} checked={multiple.includes(option)}
              onChange={(event) => setMultiple(event.target.checked ? [...multiple, option] : multiple.filter((item) => item !== option))} />)}
          </div> : <Input aria-label="Value" type={numeric ? 'number' : 'text'} {...bounds} step={column?.kind === 'core' ? 1 : 'any'}
            list={list ? datalistId : undefined} value={draft} onChange={(event) => setDraft(event.target.value)} />}
        {list && <datalist id={datalistId}>{terms.map((term) => <option key={term} value={term} />)}</datalist>}
      </fieldset>
      <Checkbox label="Clear value" checked={clear} disabled={pending} onChange={(event) => setClear(event.target.checked)} />
      <p>Set {column?.label ?? 'field'} to &quot;{label}&quot; on {snapIds.length} Snaps? You can undo this.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button autoFocus variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
        <Button disabled={pending || !column || !snapIds.length} onClick={() => { void apply() }}>Apply</Button>
      </div>
    </div>
  </Dialog>
}
