import { useMemo, useRef, useState, type ReactNode } from 'react'
import { getCoreRowModel, useLegacyTable, type LegacyColumnDef } from '@tanstack/react-table/legacy'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { isCoreFieldKey, normalizeCoreValue } from '@convex/domain/coreFields'
import { normalizeAnalysisValue } from '@convex/domain/templateFields'
import { useToast } from '@/components/ui/toast'
import type { Doc } from '@convex/_generated/dataModel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PlayLogColumn } from './columns'
import { Cell } from './cell'
import { CellEditor } from './cell-editors'

export function PlayLogTable({ snaps, columns }: {
  readonly snaps: Doc<'snaps'>[]; readonly columns: PlayLogColumn[]
}): ReactNode {
  const container = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState({ row: 0, col: 0 })
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null)
  const { show } = useToast()
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
  function close(move = 0): void {
    const cell = editing ?? active
    setEditing(null)
    const next = Math.max(0, Math.min(snaps.length * columns.length - 1, cell.row * columns.length + cell.col + move))
    focus(Math.floor(next / columns.length), next % columns.length)
  }
  async function commit(snap: Doc<'snaps'>, column: PlayLogColumn, raw: unknown): Promise<void> {
    try {
      if (column.kind === 'core') {
        const value = normalizeCoreValue(column.field.key, raw)
        if (JSON.stringify(value) === JSON.stringify(snap.core[column.field.key])) return
        await updateCore({ snapId: snap._id, key: column.field.key, ...(value === undefined ? {} : { value }) })
      } else {
        const value = normalizeAnalysisValue(column.field, raw)
        if (JSON.stringify(value) === JSON.stringify(snap.analysis[column.field._id] ?? null)) return
        await updateAnalysis({ snapId: snap._id, fieldId: column.field._id, value })
      }
    } catch (error) {
      show({ message: `Could not save ${column.label}. ${error instanceof Error ? error.message : String(error)}` })
    }
  }
  const definitions = useMemo<LegacyColumnDef<Doc<'snaps'>>[]>(() => columns.map((column) => ({
    id: column.key,
    header: column.label,
    size: column.kind === 'core'
      ? column.field.key === 'clipNumber' ? 90
        : ['quarter', 'down', 'distance', 'yards'].includes(column.field.key) ? 70
          : ['hash', 'direction'].includes(column.field.key) ? 100 : 150
      : 150,
  })), [columns])
  const table = useLegacyTable({ data: snaps, columns: definitions, getCoreRowModel: getCoreRowModel(), getRowId: (snap) => snap._id })
  // ponytail: fixed offset; switch the tab panels to a flex column if the chrome height changes.
  // ponytail: no virtualization; add windowing if a Source Game exceeds ~1000 Snaps.
  return <div ref={container} className="max-h-[calc(100dvh-9rem)] overflow-auto" tabIndex={0} aria-label="Play Log">
    <Table className="table-fixed text-xs" style={{ width: table.getTotalSize() }}>
      <colgroup>{table.getAllLeafColumns().map((column) => <col key={column.id} style={{ width: column.getSize() }} />)}</colgroup>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>
        {group.headers.map((header, index) => <TableHead key={header.id} scope="col"
          className={`sticky top-0 bg-muted px-1.5 py-0 ${index === 0 ? 'left-0 z-30' : 'z-20'}`}>
          {columns[index]?.label}
        </TableHead>)}
      </TableRow>)}</TableHeader>
      <TableBody>{table.getRowModel().rows.map((row, rowIndex) => <TableRow key={row.id} className="h-7">
        {columns.map((column, index) => {
          const isEditing = editing?.row === rowIndex && editing.col === index
          const checkbox = column.kind === 'template' && column.field.type === 'checkbox'
          const toggle = (): void => { if (column.kind === 'template') void commit(row.original, column, !row.original.analysis[column.field._id]) }
          return <TableCell key={column.key} data-cell={`${rowIndex}:${index}`}
            tabIndex={active.row === rowIndex && active.col === index ? 0 : -1}
            aria-selected={active.row === rowIndex && active.col === index}
            onFocus={() => setActive({ row: rowIndex, col: index })}
            onClick={() => { if (!isEditing) { focus(rowIndex, index); if (checkbox) toggle() } }}
            onDoubleClick={() => { if (!checkbox) setEditing({ row: rowIndex, col: index }) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || (checkbox && event.key === ' ')) {
                event.preventDefault()
                if (checkbox) toggle()
                else setEditing({ row: rowIndex, col: index })
              }
            }}
            className={`h-7 px-1.5 py-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isEditing ? '' : 'truncate'} ${index === 0 ? 'sticky left-0 z-10 bg-background' : ''}`}>
            {isEditing ? <CellEditor snap={row.original} column={column} onCancel={() => close()}
              onCommit={(value, move) => { void commit(row.original, column, value); close(move) }} />
              : <Cell snap={row.original} column={column} />}
          </TableCell>
        })}
      </TableRow>)}</TableBody>
    </Table>
  </div>
}
