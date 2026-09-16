/** Template values retain their field identity; new view columns start hidden. */
import { CORE_FIELDS, type CoreFieldKey } from './coreFields.ts'

export const TEMPLATE_FIELD_TYPES = [
  'shortText', 'longText', 'number', 'checkbox', 'select', 'multiSelect', 'rating', 'tags',
] as const
export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number]
export const TEMPLATE_FIELD_TYPE_LABELS: Readonly<Record<TemplateFieldType, string>> = {
  shortText: 'Short Text', longText: 'Long Text', number: 'Number', checkbox: 'Checkbox',
  select: 'Single Select', multiSelect: 'Multi-Select', rating: 'Rating / Grade', tags: 'Tags',
}
export const RATING_MIN = 1
export const RATING_MAX = 5
export { NAME_MAX_LENGTH, normalizeName } from './names.ts'

export function isTemplateFieldType(value: unknown): value is TemplateFieldType {
  return TEMPLATE_FIELD_TYPES.some((type) => type === value)
}

export function hasOptions(type: TemplateFieldType): boolean {
  return type === 'select' || type === 'multiSelect'
}

export function normalizeOptions(values: readonly string[]): string[] | null {
  const options = values.map((value) => value.trim()).filter(Boolean)
  return new Set(options).size === options.length ? options : null
}

export function hasAnalysisValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'boolean' || typeof value === 'number'
}

export type ColumnKey = `core:${CoreFieldKey}` | `field:${string}`

export function coreColumnKey(key: CoreFieldKey): ColumnKey {
  return `core:${key}`
}

export function fieldColumnKey(fieldId: string): ColumnKey {
  return `field:${fieldId}`
}

export function columnCatalog(fieldIds: readonly string[]): ColumnKey[] {
  return [...CORE_FIELDS.map(({ key }) => coreColumnKey(key)), ...fieldIds.map(fieldColumnKey)]
}

export function reconcileView(
  view: { readonly visibleColumns: readonly string[]; readonly columnOrder: readonly string[] },
  catalog: readonly ColumnKey[],
): { visibleColumns: ColumnKey[]; columnOrder: ColumnKey[] } {
  const valid = new Set<string>(catalog)
  const columnOrder = [...new Set(view.columnOrder)]
    .filter((key): key is ColumnKey => valid.has(key))
  const existing = new Set(columnOrder)
  const visibleColumns = [...new Set(view.visibleColumns)]
    .filter((key): key is ColumnKey => valid.has(key) && existing.has(key as ColumnKey))
  return { visibleColumns, columnOrder: [...columnOrder, ...catalog.filter((key) => !existing.has(key))] }
}

export type AnalysisValue = string | number | boolean | string[]

export function normalizeAnalysisValue(
  field: { readonly type: TemplateFieldType; readonly options: readonly string[] }, raw: unknown,
): AnalysisValue | null {
  const value = typeof raw === 'string' ? raw.trim() : raw
  if (value === null || value === undefined || value === '') return null
  switch (field.type) {
    case 'shortText':
    case 'longText':
      if (typeof value === 'string') return value
      break
    case 'number':
      if (typeof value === 'number' && Number.isFinite(value)) return value
      break
    case 'checkbox':
      if (typeof value === 'boolean') return value
      break
    case 'rating':
      if (typeof value === 'number' && Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX) return value
      break
    case 'select':
      if (typeof value === 'string' && field.options.includes(value)) return value
      break
    case 'multiSelect':
    case 'tags':
      if (Array.isArray(value) && value.every((item): item is string => typeof item === 'string')) {
        const values = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
        if (field.type === 'tags' || values.every((item) => field.options.includes(item))) return values.length ? values : null
      }
      break
  }
  throw new Error(`Invalid ${TEMPLATE_FIELD_TYPE_LABELS[field.type]} value`)
}

export function analysisValueText(value: string | number | boolean | readonly string[] | undefined): string {
  return Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value ?? '')
}
