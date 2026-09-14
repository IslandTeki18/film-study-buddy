import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { getCoreRowModel, useLegacyTable, type LegacyColumnDef } from '@tanstack/react-table/legacy'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { isCoreFieldKey, normalizeCoreValue } from '@convex/domain/coreFields'
import { builtInTerminology, type TerminologyList } from '@convex/domain/terminology'
import { restoredValueFor } from '@convex/domain/provenance'
import { normalizeAnalysisValue, type ColumnKey } from '@convex/domain/templateFields'
import { useToast } from '@/components/ui/toast'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { defaultWidth, type PlayLogColumn } from './columns'
import { useReorder } from '@/lib/reorder'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { COLUMN_MIN_WIDTH } from './use-column-layout'
import { nextSort, type SortState } from './row-model'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { BulkEditDialog } from './bulk-edit-dialog'
import { useNavigate } from 'react-router'
import { RowActions } from './row-actions'
import { Cell } from './cell'
import { CellEditor, useSaveCellNote } from './cell-editors'
import { useCellCursor, nextCell, type CellCursor } from './use-cell-cursor'

export function PlayLogTable({ snaps, columns, createdId, terminology, pendingCommit, widths, onReorder, onResize, sort, onSort, base, onDuplicated, sourceGameId, notes }: {
  readonly snaps: Doc<'snaps'>[]; readonly columns: PlayLogColumn[]; readonly createdId: Id<'snaps'> | null
  readonly terminology: readonly { list: TerminologyList; value: string }[]
  readonly sourceGameId: Id<'sourceGames'>
  readonly notes: readonly Doc<'cellNotes'>[]
  readonly onDuplicated: (id: Id<'snaps'>) => void
  readonly base: string
  readonly sort: SortState
  readonly onSort: (sort: SortState) => void
  readonly onReorder: (from: number, to: number) => void
  readonly onResize: (key: ColumnKey, width: number) => void
  readonly widths: Readonly<Record<string, number>>
  readonly pendingCommit: RefObject<Promise<boolean>>
}): ReactNode {
  const saveNote = useSaveCellNote(sourceGameId)
  const noteMap = useMemo(() => new Map(notes.map((note) => [`${note.snapId}:${note.fieldKey}`, note.text])), [notes])
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<Id<'snaps'>>>(new Set())
  const [bulkEditing, setBulkEditing] = useState(false)
  const selectedIds = useMemo(() => snaps.filter((snap) => selected.has(snap._id)).map((snap) => snap._id), [snaps, selected])
  useEffect(() => { setSelected((current) => {
    const live = new Set(snaps.map((snap) => snap._id))
    return [...current].some((id) => !live.has(id)) ? new Set([...current].filter((id) => live.has(id))) : current
  }) }, [snaps])
  useEffect(() => {
    const selectAll = container.current?.querySelector<HTMLInputElement>('[aria-label="Select all visible Snaps"]')
    if (selectAll) selectAll.indeterminate = selectedIds.length > 0 && selectedIds.length < snaps.length
  }, [selectedIds.length, snaps.length])
  const [draftWidth, setDraftWidth] = useState<{ key: ColumnKey; width: number } | null>(null)
  const resizing = useRef<{ key: ColumnKey; x: number; width: number } | null>(null)
  const drag = useReorder({ itemCount: columns.length, onReorder, label: (index) => columns[index]?.label ?? 'Column' })
  const container = useRef<HTMLDivElement>(null)
  const { cursor: active, setCursor: setActive, next } = useCellCursor(snaps.length, columns.length)
  const [editing, setEditing] = useState<(CellCursor & { readonly draft?: string }) | null>(null)
  const focusedId = useRef<Id<'snaps'> | null>(null)
  const pendingCells = useRef(new Map<string, Promise<boolean>>())
  const pendingCheckboxes = useRef(new Map<string, { value: boolean; saving: Promise<boolean> }>())
  useEffect(() => {
    if (!createdId || focusedId.current === createdId) return
    const row = snaps.findIndex((snap) => snap._id === createdId)
    if (row < 0) return
    focusedId.current = createdId
    setEditing(null)
    setActive({ row, col: 0 })
    requestAnimationFrame(() => container.current?.querySelector<HTMLElement>(`[data-cell="${row}:0"]`)?.focus())
  }, [createdId, snaps, setActive])
  const { show } = useToast()
  const addTerminology = useMutation(api.terminology.add)
  const addFieldOption = useMutation(api.templates.addFieldOption)
  const restore = useMutation(api.snaps.restoreImportedValue).withOptimisticUpdate((store, args) => {
    const sourceGameId = snaps[0]?.sourceGameId
    if (!sourceGameId || !isCoreFieldKey(args.key)) return
    const key = args.key
    const current = store.getQuery(api.snaps.listBySourceGame, { sourceGameId })
    if (!current) return
    const target = current.find((item) => item._id === args.snapId)
    const original = target ? restoredValueFor(target.imported, key) : null
    if (original === null) return
    let value
    try { value = normalizeCoreValue(key, original) } catch { return }
    store.setQuery(api.snaps.listBySourceGame, { sourceGameId }, current.map((item) => {
      if (item._id !== args.snapId) return item
      const core = { ...item.core }
      if (value === undefined) delete core[key]
      else Object.assign(core, { [key]: value })
      return { ...item, core }
    }))
  })
  const updateCore = useMutation(api.snaps.updateCore).withOptimisticUpdate((store, args) => {
    const sourceGameId = snaps[0]?.sourceGameId
    if (!sourceGameId || !isCoreFieldKey(args.key)) return
    const key = args.key
    const current = store.getQuery(api.snaps.listBySourceGame, { sourceGameId })
    if (!current) return
    const value = normalizeCoreValue(key, args.value)
    store.setQuery(api.snaps.listBySourceGame, { sourceGameId }, current.map((snap) => {
      if (snap._id !== args.snapId) return snap
      const core = { ...snap.core }
      if (value === undefined) delete core[key]
      else Object.assign(core, { [key]: value })
      return { ...snap, core }
    }))
  })
  const updateAnalysis = useMutation(api.snaps.updateAnalysis).withOptimisticUpdate((store, args) => {
    const sourceGameId = snaps[0]?.sourceGameId
    if (!sourceGameId) return
    const current = store.getQuery(api.snaps.listBySourceGame, { sourceGameId })
    if (!current) return
    store.setQuery(api.snaps.listBySourceGame, { sourceGameId }, current.map((snap) => {
      if (snap._id !== args.snapId) return snap
      const analysis = { ...snap.analysis }
      if (args.value === null) delete analysis[args.fieldId]
      else analysis[args.fieldId] = args.value
      return { ...snap, analysis }
    }))
  })
  function focus(row: number, col: number): void {
    setActive({ row, col })
    requestAnimationFrame(() => container.current?.querySelector<HTMLElement>(`[data-cell="${row}:${col}"]`)?.focus())
  }
  function close(move: number | null = 0): void {
    const cell = editing ?? active
    if (move === null) {
      setTimeout(() => setEditing(null), 0)
      return
    }
    setEditing(null)
    const target = move === 0 ? cell : nextCell(cell, 'Tab', snaps.length, columns.length, move < 0)
    if (target) focus(target.row, target.col)
  }
  function canTab(shift: boolean): boolean {
    if (next('Tab', shift)) return true
    if (container.current) container.current.tabIndex = -1
    setTimeout(() => { if (container.current) container.current.tabIndex = 0 }, 0)
    return false
  }
  async function persist(snap: Doc<'snaps'>, column: PlayLogColumn, raw: unknown, newOption: string | undefined, forceWrite: boolean): Promise<boolean> {
    try {
      if (column.kind === 'core') {
        const value = normalizeCoreValue(column.field.key, raw)
        if (!forceWrite && JSON.stringify(value) === JSON.stringify(snap.core[column.field.key])) return true
        if (column.field.input.kind === 'terminology' && typeof value === 'string') {
          const list = column.field.input.list
          if (!builtInTerminology(list).includes(value) && !terminology.some((item) => item.list === list && item.value === value)) {
            await addTerminology({ list, value })
          }
        }
        await updateCore({ snapId: snap._id, key: column.field.key, ...(value === undefined ? {} : { value }) })
      } else {
        const option = newOption?.trim()
        const field = option ? { ...column.field, options: [...column.field.options, option] } : column.field
        const value = normalizeAnalysisValue(field, raw)
        if (option) await addFieldOption({ fieldId: column.field._id, option })
        if (!forceWrite && JSON.stringify(value) === JSON.stringify(snap.analysis[column.field._id] ?? null)) return true
        await updateAnalysis({ snapId: snap._id, fieldId: column.field._id, value })
      }
      return true
    } catch (error) {
      show({ message: `Could not save ${column.label}. ${error instanceof Error ? error.message : String(error)}` })
      return false
    }
  }
  function enqueue(snap: Doc<'snaps'>, column: PlayLogColumn, operation: (forceWrite: boolean) => Promise<boolean>): Promise<boolean> {
    const key = `${snap._id}:${column.key}`
    const forceWrite = pendingCells.current.has(key)
    const saving = pendingCommit.current.then(() => operation(forceWrite))
    pendingCommit.current = saving
    pendingCells.current.set(key, saving)
    void saving.then(() => {
      if (pendingCells.current.get(key) === saving) pendingCells.current.delete(key)
      if (pendingCommit.current === saving) pendingCommit.current = Promise.resolve(true)
    })
    return saving
  }
  function commit(snap: Doc<'snaps'>, column: PlayLogColumn, raw: unknown, newOption?: string): Promise<boolean> {
    return enqueue(snap, column, (forceWrite) => persist(snap, column, raw, newOption, forceWrite))
  }
  function toggleCheckbox(snap: Doc<'snaps'>, column: PlayLogColumn): void {
    if (column.kind !== 'template') return
    const key = `${snap._id}:${column.key}`
    const value = !(pendingCheckboxes.current.get(key)?.value ?? Boolean(snap.analysis[column.field._id]))
    const saving = commit(snap, column, value)
    pendingCheckboxes.current.set(key, { value, saving })
    void saving.then(() => {
      if (pendingCheckboxes.current.get(key)?.saving === saving) pendingCheckboxes.current.delete(key)
    })
  }
  function restoreOriginal(snap: Doc<'snaps'>, column: PlayLogColumn): Promise<boolean> {
    return enqueue(snap, column, async () => {
      if (column.kind !== 'core') return false
      try {
        await restore({ snapId: snap._id, key: column.field.key })
        return true
      } catch (error) {
        show({ message: `Could not restore ${column.label}. ${error instanceof Error ? error.message : String(error)}` })
        return false
      }
    })
  }
  const definitions = useMemo<LegacyColumnDef<Doc<'snaps'>>[]>(() => columns.map((column) => ({
    id: column.key,
    header: column.label,
    size: draftWidth?.key === column.key ? draftWidth.width : widths[column.key] ?? defaultWidth(column),
  })), [columns, widths, draftWidth])
  const table = useLegacyTable({ data: snaps, columns: definitions, getCoreRowModel: getCoreRowModel(), getRowId: (snap) => snap._id })
  // ponytail: 32px selection column matches left-[2rem]; use a shared CSS variable if its size changes.
  // ponytail: fixed offset; switch the tab panels to a flex column if the chrome height changes.
  // ponytail: no virtualization; add windowing if a Source Game exceeds ~1000 Snaps.
  return <>
    {selectedIds.length > 0 && <div className="flex items-center gap-3">
      <span>{selectedIds.length} Snaps selected</span>
      <Button variant="outline" onClick={() => setBulkEditing(true)}>Set field…</Button>
      <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
    </div>}
    {bulkEditing && snaps[0] && <BulkEditDialog sourceGameId={snaps[0].sourceGameId} snapIds={selectedIds} columns={columns}
      terminology={terminology} onClose={() => setBulkEditing(false)} onApplied={() => { setSelected(new Set()); setBulkEditing(false) }} />}
    <div ref={container} className="max-h-[calc(100dvh-9rem)] overflow-auto" tabIndex={editing ? -1 : 0} aria-label="Play Log" onKeyDown={(event) => {
    if (editing || event.nativeEvent.isComposing) return
    if (event.target instanceof Element && !event.target.matches('[data-cell], [aria-label="Play Log"]')) return
    const column = columns[active.col]
    const snap = snaps[active.row]
    if (!column || !snap) return
    const command = event.ctrlKey || event.metaKey
    if (command && event.key === 'Enter') {
      event.preventDefault()
      navigate(`${base}/snap/${snap._id}`)
      return
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) {
      if (event.key === 'Tab' && !canTab(event.shiftKey)) return
      const target = next(event.key, event.shiftKey, command)
      if (target) { event.preventDefault(); focus(target.row, target.col) }
      return
    }
    if (event.key === 'F2') { event.preventDefault(); setEditing(active); return }
    const checkbox = column.kind === 'template' && column.field.type === 'checkbox'
    if (event.key === 'Enter' || (checkbox && event.key === ' ')) {
      event.preventDefault()
      if (checkbox) toggleCheckbox(snap, column)
      else setEditing(active)
    } else if (event.key.length === 1 && !command && !event.altKey && !checkbox &&
      (column.kind === 'core' ? column.field.input.kind !== 'select' && column.field.input.kind !== 'fieldPosition'
        : !['select', 'multiSelect', 'rating'].includes(column.field.type))) {
      event.preventDefault()
      setEditing({ ...active, draft: event.key })
    }
  }}>
    <p className="sr-only" aria-live="polite">{drag.announcement}</p>
    <Table role="grid" className="table-fixed text-xs" style={{ width: table.getTotalSize() + 64 }}>
      <colgroup><col style={{ width: 32 }} />{table.getAllLeafColumns().map((column) => <col key={column.id} style={{ width: column.getSize() }} />)}<col style={{ width: 32 }} /></colgroup>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>
        <TableHead className="sticky top-0 left-0 z-30 bg-muted px-1.5">
          <Checkbox label="" aria-label="Select all visible Snaps" checked={snaps.length > 0 && selectedIds.length === snaps.length}
            onChange={(event) => setSelected(event.target.checked ? new Set(snaps.map((snap) => snap._id)) : new Set())} />
        </TableHead>
        {group.headers.map((header, index) => {
          const column = columns[index]
          if (!column) return null
          const width = header.getSize()
          return <TableHead key={header.id} scope="col" aria-sort={sort?.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} {...drag.getItemProps(index)}
            className={`sticky top-0 bg-muted px-1.5 py-0 ${index === 0 ? 'left-[2rem] z-30' : 'z-20'} ${drag.dragOverIndex === index ? 'border-2 border-primary' : ''}`}>
            <div className="flex items-center pr-2">
              <button className="min-w-0 flex-1 truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSort(nextSort(sort, column.key))}>{column.label}{sort?.key === column.key ? sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}</button>
              <DropdownMenu label="⋯" triggerProps={{ size: 'sm', variant: 'ghost', className: 'h-7 px-1', 'aria-label': `Column options for ${column.label}` }} items={[
                { label: 'Sort ascending', onSelect: () => onSort({ key: column.key, direction: 'asc' }) },
                { label: 'Sort descending', onSelect: () => onSort({ key: column.key, direction: 'desc' }) },
                { label: 'Clear sort', onSelect: () => onSort(null), disabled: sort?.key !== column.key },
                { label: 'Move left', onSelect: () => drag.moveUp(index), disabled: !drag.canMoveUp(index) },
                { label: 'Move right', onSelect: () => drag.moveDown(index), disabled: !drag.canMoveDown(index) },
              ]} />
            </div>
            <div role="separator" aria-orientation="vertical" aria-label={`Resize ${column.label}`} tabIndex={0}
              aria-valuenow={width} aria-valuemin={COLUMN_MIN_WIDTH} draggable={false}
              className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize select-none hover:bg-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              onDragStart={(event) => { event.preventDefault(); event.stopPropagation() }}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.setPointerCapture(event.pointerId)
                resizing.current = { key: column.key, x: event.clientX, width }
              }}
              onPointerMove={(event) => {
                const start = resizing.current
                if (start?.key === column.key) setDraftWidth({ key: column.key, width: Math.max(COLUMN_MIN_WIDTH, start.width + event.clientX - start.x) })
              }}
              onPointerUp={(event) => {
                const start = resizing.current
                if (start?.key !== column.key) return
                onResize(column.key, Math.max(COLUMN_MIN_WIDTH, start.width + event.clientX - start.x))
                resizing.current = null
                setDraftWidth(null)
              }}
              onPointerCancel={() => { resizing.current = null; setDraftWidth(null) }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                onResize(column.key, Math.max(COLUMN_MIN_WIDTH, width + (event.key === 'ArrowLeft' ? -10 : 10)))
              }} />
          </TableHead>
        })}
        <TableHead className="sticky top-0 z-20 bg-muted"><span className="sr-only">Snap actions</span></TableHead>
      </TableRow>)}</TableHeader>
      <TableBody>{table.getRowModel().rows.map((row, rowIndex) => <TableRow key={row.id} className="h-7" data-must-review={row.original.mustReview || undefined}>
        <TableCell className="sticky left-0 z-10 bg-background px-1.5">
          <Checkbox label="" aria-label={`Select Snap ${row.original.core.clipNumber ?? row.original.order}`} checked={selectedIds.includes(row.original._id)}
            onChange={(event) => setSelected((current) => {
              const next = new Set(current)
              if (event.target.checked) next.add(row.original._id)
              else next.delete(row.original._id)
              return next
            })} />
        </TableCell>
        {columns.map((column, index) => {
          const note = noteMap.get(`${row.original._id}:${column.key}`) ?? ''
          const isEditing = editing?.row === rowIndex && editing.col === index
          const checkbox = column.kind === 'template' && column.field.type === 'checkbox'
          return <TableCell title={note || undefined} aria-keyshortcuts="F2" role="gridcell" key={column.key} data-cell={`${rowIndex}:${index}`}
            tabIndex={!editing && active.row === rowIndex && active.col === index ? 0 : -1}
            aria-selected={active.row === rowIndex && active.col === index}
            onFocus={() => setActive({ row: rowIndex, col: index })}
            onClick={() => { if (!isEditing) { focus(rowIndex, index); if (checkbox) toggleCheckbox(row.original, column) } }}
            onDoubleClick={() => setEditing({ row: rowIndex, col: index })}
            className={`relative h-7 px-1.5 py-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isEditing ? '' : 'truncate'} ${index === 0 ? 'sticky left-[2rem] z-10 bg-background' : ''}`}>
            {note && <span aria-label="Has Cell Note" className="absolute top-0.5 right-0.5 size-1 rounded-full bg-primary" />}
            {isEditing ? <CellEditor note={note} onSaveNote={(text) => saveNote({ snapId: row.original._id, fieldKey: column.key, text })} snap={row.original} column={column} initialDraft={editing.draft} canTab={canTab} terminology={terminology} onCancel={() => close()}
              onRestore={() => restoreOriginal(row.original, column)}
              onCommit={(value, move, option) => { void commit(row.original, column, value, option); close(move) }} />
              : <Cell snap={row.original} column={column} />}
          </TableCell>
        })}
        <TableCell className={`px-0 ${row.original.mustReview ? 'border-l-2 border-amber-500' : ''}`}>
          <RowActions snap={row.original} base={base} onDuplicated={onDuplicated} />
        </TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </div>
  </>
}
