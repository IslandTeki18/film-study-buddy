import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import { normalizeHeader } from '../../../convex/domain/csvMapping.ts'

export type CsvParseError =
  | { kind: 'empty' }
  | { kind: 'notCsv' }
  | { kind: 'malformed'; row: number; message: string }

export interface ParsedCsv {
  readonly headers: string[]
  readonly rows: Record<string, string>[]
}

const cellText = (value: unknown): string => value === null || value === undefined ? '' : String(value).trim()

export function sheetRowsToCsv(sheet: readonly (readonly unknown[])[]): ParsedCsv | CsvParseError {
  const nonEmpty = sheet.filter((row) => row.some((value) => cellText(value) !== ''))
  const [headerRow, ...dataRows] = nonEmpty
  if (!headerRow || dataRows.length === 0) return { kind: 'notCsv' }
  const headers = headerRow.map(cellText)
  if (headers.length < 2 || headers.some((header) => !header)) {
    return { kind: 'malformed', row: 1, message: 'Every column needs a header.' }
  }
  const normalized = headers.map(normalizeHeader)
  if (new Set(normalized).size !== normalized.length) {
    return { kind: 'malformed', row: 1, message: 'Duplicate column headers are ambiguous.' }
  }
  const overflow = dataRows.findIndex((row) => row.slice(headers.length).some((value) => cellText(value) !== ''))
  if (overflow !== -1) return { kind: 'malformed', row: overflow + 2, message: 'A value has no column header.' }
  return {
    headers,
    rows: dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, cellText(row[index])]))),
  }
}

export async function parseImportFile(file: File): Promise<ParsedCsv | CsvParseError> {
  if (file.size === 0) return { kind: 'empty' }
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    try {
      return sheetRowsToCsv(await readSheet(file))
    } catch (error) {
      return { kind: 'malformed', row: 1, message: error instanceof Error ? error.message : 'The file could not be read.' }
    }
  }
  return parseCsvFile(file)
}

async function parseCsvFile(file: File): Promise<ParsedCsv | CsvParseError> {
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
