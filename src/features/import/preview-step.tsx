import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Chip, Panel } from '@/components/ui/panel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ODK_VALUES } from '../../../convex/domain/coreFields.ts'
import {
  IMPORT_TARGETS,
  type CoercedRow,
  type DuplicateReason,
  type ImportTarget,
  type OdkFilter,
} from '../../../convex/domain/csvMapping.ts'

export type { OdkFilter } from '../../../convex/domain/csvMapping.ts'
const ODK_FILTER_LABELS: Readonly<Record<OdkFilter, string>> = {
  all: 'All rows', O: 'Offense (O)', D: 'Defense (D)', K: 'Special teams (K)',
}

const DUPLICATE_LABELS: Readonly<Record<DuplicateReason, string>> = {
  playNumber: 'Likely duplicate (Play #)',
  clipNumber: 'Likely duplicate (Clip #)',
  quarterClock: 'Likely duplicate (Quarter + Clock)',
}

export function PreviewStep({ rows, duplicates, mappedTargets, included, usingRemembered, odkFilter, pending, error, onIncludedChange, onOdkFilterChange, onBack, onChangeMapping, onImport }: {
  readonly rows: readonly CoercedRow[]
  readonly duplicates: ReadonlyMap<number, DuplicateReason>
  readonly mappedTargets: ReadonlySet<ImportTarget>
  readonly included: ReadonlySet<number>
  readonly usingRemembered: boolean
  readonly odkFilter: OdkFilter
  readonly pending: boolean
  readonly error: string | null
  readonly onIncludedChange: (included: Set<number>) => void
  readonly onOdkFilterChange: (filter: OdkFilter) => void
  readonly onBack: () => void
  readonly onChangeMapping: () => void
  readonly onImport: () => void
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
        {mappedTargets.has('odk') && <fieldset className="mt-2 flex flex-wrap gap-3 text-sm" disabled={pending}>
          <legend className="sr-only">Import only</legend>
          {(['all', ...ODK_VALUES] as const).map((value) => <label key={value} className="flex items-center gap-1">
            <input type="radio" name="odk-filter" value={value} checked={odkFilter === value}
              className="size-4 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={() => onOdkFilterChange(value)} />
            {ODK_FILTER_LABELS[value]}
          </label>)}
        </fieldset>}
        {duplicates.size > 0 && <p className="mt-1 text-sm text-muted-foreground">
          {duplicates.size} rows look like Snaps already in this Source Game.
        </p>}
        {usingRemembered && <p className="mt-1 text-sm text-muted-foreground">
          Using remembered mapping · <button type="button" className="underline" disabled={pending} onClick={onChangeMapping}>Change mapping</button>
        </p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => onIncludedChange(new Set(rows.map(({ index }) => index)))}>Include all</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onIncludedChange(new Set(
          [...included].filter((index) => rows[index]?.flag === null),
        ))}>Exclude flagged</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onIncludedChange(new Set(
          [...included].filter((index) => !duplicates.has(index)),
        ))}>Exclude duplicates</Button>
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
              disabled={pending} onChange={(event) => setIncluded(row.index, event.currentTarget.checked)} /></TableCell>
            <TableCell className="font-medium">{row.imported.playNumber ?? row.imported.clipNumber ?? ''}</TableCell>
            {IMPORT_TARGETS.filter(({ key }) => mappedTargets.has(key)).map(({ key }) => <TableCell key={key}>{row.imported[key] ?? ''}</TableCell>)}
            <TableCell><div className="flex min-w-44 flex-wrap gap-1">
              {row.flag === 'specialTeams' && <Chip>Likely special teams (ODK = {String(row.core.odk)})</Chip>}
              {row.flag === 'noPlay' && <Chip>Likely no play</Chip>}
              {duplicates.has(row.index) && <Chip>{DUPLICATE_LABELS[duplicates.get(row.index)!]}</Chip>}
              {row.rejected.map(({ target, label, raw }) => <Chip key={`${target}:${raw}`}>{label}: &quot;{raw}&quot; not imported</Chip>)}
            </div></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex items-center justify-between gap-4">
      <Button type="button" variant="outline" disabled={pending} onClick={onBack}>Back</Button>
      <Button type="button" disabled={pending || included.size === 0} onClick={onImport}>Import {included.size} Snaps</Button>
    </div>
  </Panel>
}
