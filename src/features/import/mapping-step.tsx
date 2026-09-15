import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  IMPORT_TARGETS,
  missingRequiredTargets,
  type ColumnMapping,
  type ImportTarget,
} from '../../../convex/domain/csvMapping.ts'
import type { ParsedCsv } from './parse-csv'

export function MappingStep({ csv, mapping, onMappingChange, onBack, onContinue }: {
  readonly csv: ParsedCsv
  readonly mapping: ColumnMapping
  readonly onMappingChange: (mapping: ColumnMapping) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}): ReactNode {
  const selected = new Set(Object.values(mapping).filter((target) => target !== null))
  const missingRequired = missingRequiredTargets(mapping).length > 0

  function mapColumn(header: string, target: ImportTarget | null): void {
    onMappingChange({ ...mapping, [header]: target })
  }

  return <Panel className="grid gap-4 overflow-hidden p-6">
    <div>
      <h1 className="text-2xl font-semibold">Map CSV columns</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose where each Hudl column should be imported.</p>
    </div>
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Sample</TableHead>
            <TableHead>Maps to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {csv.headers.map((header) => {
            const current = mapping[header] ?? null
            const sample = csv.rows.find((row) => row[header]?.trim())?.[header] ?? '—'
            return <TableRow key={header}>
              <TableCell className="font-medium">{header}</TableCell>
              <TableCell className="max-w-72 truncate text-muted-foreground">{sample}</TableCell>
              <TableCell>
                <Select aria-label={`Map ${header}`} value={current ?? ''} onChange={(event) => {
                  mapColumn(header, event.target.value ? event.target.value as ImportTarget : null)
                }}>
                  <option value="">Not imported</option>
                  {IMPORT_TARGETS.map(({ key, label }) => <option key={key} value={key}
                    disabled={key !== current && selected.has(key)}>{label}</option>)}
                </Select>
              </TableCell>
            </TableRow>
          })}
        </TableBody>
      </Table>
    </div>
    <div className="flex items-center justify-between gap-4">
      <Button type="button" variant="outline" onClick={onBack}>Back</Button>
      <div className="flex items-center gap-3">
        {missingRequired && <p className="text-sm text-muted-foreground">Map Play # or Clip # to continue.</p>}
        <Button type="button" disabled={missingRequired} onClick={onContinue}>Continue</Button>
      </div>
    </div>
  </Panel>
}
