import type { ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import type { PlayLogColumn } from './columns'

export function Cell({ snap, column }: {
  readonly snap: Doc<'snaps'>; readonly column: PlayLogColumn
}): ReactNode {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = formatCoreValue(column.field.key, value)
    return column.field.key === 'yardLine' && isValidYardLine(value) ? <>
      <span className="block">{text}</span><span className="block text-[10px] text-muted-foreground">{fieldZoneOf(value)}</span>
    </> : text
  }
  const value = snap.analysis[column.field._id]
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value ?? ''
}
