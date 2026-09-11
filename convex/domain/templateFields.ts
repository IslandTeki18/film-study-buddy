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
export const NAME_MAX_LENGTH = 80

export function isTemplateFieldType(value: unknown): value is TemplateFieldType {
  return TEMPLATE_FIELD_TYPES.some((type) => type === value)
}

export function hasOptions(type: TemplateFieldType): boolean {
  return type === 'select' || type === 'multiSelect'
}

export function normalizeName(value: string): string | null {
  const name = value.trim()
  return name.length > 0 && name.length <= NAME_MAX_LENGTH ? name : null
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
