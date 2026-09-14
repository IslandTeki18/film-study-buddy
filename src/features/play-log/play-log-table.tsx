import { useMemo, type ReactNode } from 'react'
import { getCoreRowModel, useLegacyTable, type LegacyColumnDef } from '@tanstack/react-table/legacy'
import type { Doc } from '@convex/_generated/dataModel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PlayLogColumn } from './columns'
import { Cell } from './cell'

export function PlayLogTable({ snaps, columns }: {
  readonly snaps: Doc<'snaps'>[]; readonly columns: PlayLogColumn[]
}): ReactNode {
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
  return <div className="max-h-[calc(100dvh-9rem)] overflow-auto" tabIndex={0} aria-label="Play Log">
    <Table className="table-fixed text-xs" style={{ width: table.getTotalSize() }}>
      <colgroup>{table.getAllLeafColumns().map((column) => <col key={column.id} style={{ width: column.getSize() }} />)}</colgroup>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>
        {group.headers.map((header, index) => <TableHead key={header.id} scope="col"
          className={`sticky top-0 bg-muted px-1.5 py-0 ${index === 0 ? 'left-0 z-30' : 'z-20'}`}>
          {columns[index]?.label}
        </TableHead>)}
      </TableRow>)}</TableHeader>
      <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} className="h-7">
        {columns.map((column, index) => <TableCell key={column.key}
          className={`h-7 truncate px-1.5 py-0 ${index === 0 ? 'sticky left-0 z-10 bg-background' : ''}`}>
          <Cell snap={row.original} column={column} />
        </TableCell>)}
      </TableRow>)}</TableBody>
    </Table>
  </div>
}
