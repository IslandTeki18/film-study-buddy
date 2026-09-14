import type { ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { isValidYardLine } from '@convex/domain/fieldZone'
import { displayValue } from './row-model'
import { provenanceOf, restoredValueFor } from '@convex/domain/provenance'
import type { PlayLogColumn } from './columns'

export function Cell({ snap, column }: {
  readonly snap: Doc<'snaps'>; readonly column: PlayLogColumn
}): ReactNode {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = displayValue(snap, column)
    const provenance = provenanceOf(snap.imported, column.field.key, value)
    const display = column.field.key === 'yardLine' && isValidYardLine(value) ? <>
      <span className="block">{text.split('\n')[0]}</span><span className="block text-[10px] text-muted-foreground">{text.split('\n')[1]}</span>
    </> : text
    return provenance === 'Coach Entered' ? display : <span className={`block border-l-[1.5px] pl-1 ${provenance === 'Imported' ? 'border-muted-foreground/40' : 'border-amber-500'}`}
      title={provenance === 'Imported' ? 'Imported from Hudl' : `Coach Edited — original: ${restoredValueFor(snap.imported, column.field.key)}`}>
      {display}
    </span>
  }
  return displayValue(snap, column)
}
