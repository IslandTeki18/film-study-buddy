import { useState, type ChangeEvent, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { parseCsvFile, type CsvParseError, type ParsedCsv } from './parse-csv'

function errorMessage(error: CsvParseError): string {
  if (error.kind === 'empty') return 'The file is empty.'
  if (error.kind === 'notCsv') return 'That does not look like a Hudl CSV export.'
  return `Row ${error.row} could not be read: ${error.message}`
}

export function UploadStep({ sourceGameLabel, reloadMessage, onParsed }: {
  readonly sourceGameLabel: string
  readonly reloadMessage?: string | undefined
  readonly onParsed: (csv: ParsedCsv) => void
}): ReactNode {
  const [error, setError] = useState<CsvParseError | null>(null)
  const [reading, setReading] = useState(false)

  async function selectFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setReading(true)
    const parsed = await parseCsvFile(file)
    setReading(false)
    if ('kind' in parsed) setError(parsed)
    else { setError(null); onParsed(parsed) }
  }

  return <Panel className="grid gap-4 p-6">
    <div>
      <h1 className="text-2xl font-semibold">Import Hudl CSV</h1>
      <p className="mt-1 text-sm text-muted-foreground">Source Game: {sourceGameLabel}</p>
    </div>
    <label htmlFor="hudl-csv" className="text-sm font-medium">Choose a Hudl CSV export</label>
    {reloadMessage && <p role="status" className="text-sm text-muted-foreground">{reloadMessage}</p>}
    <Input id="hudl-csv" type="file" accept=".csv,text/csv" disabled={reading}
      onChange={(event) => { void selectFile(event) }} className="h-auto py-2" />
    {reading && <p role="status" className="text-sm text-muted-foreground">Reading CSV…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{errorMessage(error)}</p>}
  </Panel>
}
