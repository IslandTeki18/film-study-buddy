import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import type { PlayLogColumn } from './columns'

export function displayValue(snap: Doc<'snaps'>, column: PlayLogColumn): string {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = formatCoreValue(column.field.key, value)
    return column.field.key === 'yardLine' && isValidYardLine(value) ? `${text}\n${fieldZoneOf(value)}` : text
  }
  const value = snap.analysis[column.field._id]
  return Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value ?? '')
}
