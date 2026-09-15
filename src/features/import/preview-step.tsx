import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Chip, Panel } from '@/components/ui/panel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IMPORT_TARGETS, type CoercedRow, type ImportTarget } from '../../../convex/domain/csvMapping.ts'

export function PreviewStep({ rows, mappedTargets, included, usingRemembered, onIncludedChange, onBack, onChangeMapping }: {
  readonly rows: readonly CoercedRow[]
  readonly mappedTargets: ReadonlySet<ImportTarget>
  readonly included: ReadonlySet<number>
  readonly usingRemembered: boolean
  readonly onIncludedChange: (included: Set<number>) => void
  readonly onBack: () => void
  readonly onChangeMapping: () => void
}): ReactNode {
  function setIncluded(index: number, include: boolean): void {
    const next = new Set(included)
    if (include) next.add(index)
    else next.delete(index)
    onIncludedChange(next)
  }

  return <Panel className="grid gap-4 overflow-hidden p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Preview import</h1>
        <p className="mt-1 text-sm text-muted-foreground">{included.size} of {rows.length} rows will import</p>
        {usingRemembered && <p className="mt-1 text-sm text-muted-foreground">
          Using remembered mapping · <button type="button" className="underline" onClick={onChangeMapping}>Change mapping</button>
        </p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => onIncludedChange(new Set(rows.map(({ index }) => index)))}>Include all</Button>
        <Button type="button" variant="outline" onClick={() => onIncludedChange(new Set(
          [...included].filter((index) => rows[index]?.flag === null),
        ))}>Exclude flagged</Button>
      </div>
    </div>
    <div className="max-h-[70vh] overflow-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted">
          <TableRow>
            <TableHead>Include</TableHead>
            <TableHead>#</TableHead>
            {IMPORT_TARGETS.filter(({ key }) => mappedTargets.has(key)).map(({ key, label }) => <TableHead key={key}>{label}</TableHead>)}
            <TableHead>Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => <TableRow key={row.index}>
            <TableCell><Checkbox aria-label={`Include row ${row.index + 1}`} label="" checked={included.has(row.index)}
              onChange={(event) => setIncluded(row.index, event.currentTarget.checked)} /></TableCell>
            <TableCell className="font-medium">{row.imported.playNumber ?? row.imported.clipNumber ?? ''}</TableCell>
            {IMPORT_TARGETS.filter(({ key }) => mappedTargets.has(key)).map(({ key }) => <TableCell key={key}>{row.imported[key] ?? ''}</TableCell>)}
            <TableCell><div className="flex min-w-44 flex-wrap gap-1">
              {row.flag === 'specialTeams' && <Chip>Likely special teams (ODK = {row.odk})</Chip>}
              {row.flag === 'noPlay' && <Chip>Likely no play</Chip>}
              {row.rejected.map(({ target, label, raw }) => <Chip key={`${target}:${raw}`}>{label}: &quot;{raw}&quot; not imported</Chip>)}
            </div></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
    <div className="flex items-center justify-between gap-4">
      <Button type="button" variant="outline" onClick={onBack}>Back</Button>
      <Button type="button" disabled>Import {included.size} Snaps</Button>
    </div>
  </Panel>
}
