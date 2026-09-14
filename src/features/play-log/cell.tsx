import type { ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { provenanceOf, restoredValueFor } from '@convex/domain/provenance'
import type { PlayLogColumn } from './columns'

export function Cell({ snap, column }: {
  readonly snap: Doc<'snaps'>; readonly column: PlayLogColumn
}): ReactNode {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = formatCoreValue(column.field.key, value)
    const provenance = provenanceOf(snap.imported, column.field.key, value)
    const display = column.field.key === 'yardLine' && isValidYardLine(value) ? <>
      <span className="block">{text}</span><span className="block text-[10px] text-muted-foreground">{fieldZoneOf(value)}</span>
    </> : text
    return provenance === 'Coach Entered' ? display : <span className={`block border-l-[1.5px] pl-1 ${provenance === 'Imported' ? 'border-muted-foreground/40' : 'border-amber-500'}`}
      title={provenance === 'Imported' ? 'Imported from Hudl' : `Coach Edited — original: ${restoredValueFor(snap.imported, column.field.key)}`}>
      {display}
    </span>
  }
  const value = snap.analysis[column.field._id]
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value ?? ''
}
