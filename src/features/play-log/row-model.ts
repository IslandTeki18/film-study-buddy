import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { analysisValueText, hasAnalysisValue } from '@convex/domain/templateFields'
import type { PlayLogColumn } from './columns'
import { applicableColumns, type SectionTree } from './palette-model'

export function displayValue(snap: Doc<'snaps'>, column: PlayLogColumn): string {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = formatCoreValue(column.field.key, value)
    return column.field.key === 'yardLine' && isValidYardLine(value) ? `${text}\n${fieldZoneOf(value)}` : text
  }
  return analysisValueText(snap.analysis[column.field._id])
}

/** Template Analysis fields that apply to the Snap's Play Type, and how many hold a value. */
export function chartingProgress(snap: Doc<'snaps'>, columns: readonly PlayLogColumn[], tree: SectionTree): { charted: number; total: number } {
  const fields = applicableColumns(columns, tree, { 'core:playType': snap.core.playType }).filter((column) => column.kind === 'template')
  return { charted: fields.filter((column) => hasAnalysisValue(snap.analysis[column.field._id])).length, total: fields.length }
}
