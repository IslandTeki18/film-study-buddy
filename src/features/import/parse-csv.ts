import Papa from 'papaparse'
import { normalizeHeader } from '../../../convex/domain/csvMapping.ts'

export type CsvParseError =
  | { kind: 'empty' }
  | { kind: 'notCsv' }
  | { kind: 'malformed'; row: number; message: string }

export interface ParsedCsv {
  readonly headers: string[]
  readonly rows: Record<string, string>[]
}

export async function parseCsvFile(file: File): Promise<ParsedCsv | CsvParseError> {
  if (file.size === 0) return { kind: 'empty' }
  if (!file.name.toLowerCase().endsWith('.csv') && !['text/csv', 'text/plain'].includes(file.type)) {
    return { kind: 'notCsv' }
  }

  try {
    const text = await file.text()
    if (!text.trim()) return { kind: 'empty' }
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transform: (value) => value.trim(),
      transformHeader: (header) => header.trim(),
    })
    const firstError = result.errors.find((error) => error.code !== 'UndetectableDelimiter')
    if (firstError) {
      return { kind: 'malformed', row: (firstError.row ?? -1) + 2, message: firstError.message }
    }
    const headers = result.meta.fields ?? []
    const originalHeaders = headers.map((header) => result.meta.renamedHeaders?.[header] ?? header)
    const normalized = originalHeaders.map(normalizeHeader)
    if (new Set(normalized).size !== normalized.length) {
      return { kind: 'malformed', row: 1, message: 'Duplicate column headers are ambiguous.' }
    }
    if (headers.length < 2 || result.data.length === 0) return { kind: 'notCsv' }
    return { headers, rows: result.data }
  } catch (error) {
    return { kind: 'malformed', row: 1, message: error instanceof Error ? error.message : 'The file could not be read.' }
  }
}
