import type { Doc } from '@convex/_generated/dataModel'
import { CORE_FIELDS, type CoreField } from '@convex/domain/coreFields'
import { columnCatalog, coreColumnKey, fieldColumnKey, type ColumnKey } from '@convex/domain/templateFields'

export type PlayLogColumn =
  | { readonly key: ColumnKey; readonly kind: 'core'; readonly label: string; readonly field: CoreField }
  | { readonly key: ColumnKey; readonly kind: 'template'; readonly label: string; readonly field: Doc<'templateFields'> }

type TemplateTree = {
  readonly sections: readonly { readonly fields: readonly Doc<'templateFields'>[] }[]
}

export function buildColumns(tree: TemplateTree): PlayLogColumn[] {
  const fields = tree.sections.flatMap((section) => section.fields)
  const columns = new Map<ColumnKey, PlayLogColumn>()
  for (const field of CORE_FIELDS) {
    const key = coreColumnKey(field.key)
    columns.set(key, { key, kind: 'core', label: field.label, field })
  }
  for (const field of fields) {
    const key = fieldColumnKey(field._id)
    columns.set(key, { key, kind: 'template', label: field.name, field })
  }
  return columnCatalog(fields.map((field) => field._id)).map((key) => {
    const column = columns.get(key)
    if (!column) throw new Error(`Unknown Play Log column: ${key}`)
    return column
  })
}

export function defaultWidth(column: PlayLogColumn): number {
  if (column.kind !== 'core') return 150
  if (column.field.key === 'clipNumber') return 90
  if (['quarter', 'down', 'distance', 'yards'].includes(column.field.key)) return 70
  return ['hash', 'direction'].includes(column.field.key) ? 100 : 150
}
