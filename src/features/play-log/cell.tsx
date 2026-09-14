import type { ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import type { PlayLogColumn } from './columns'

export function Cell({ snap, column }: {
  readonly snap: Doc<'snaps'>; readonly column: PlayLogColumn
}): ReactNode {
  if (column.kind === 'core') return formatCoreValue(column.field.key, snap.core[column.field.key])
  const value = snap.analysis[column.field._id]
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value ?? ''
}
