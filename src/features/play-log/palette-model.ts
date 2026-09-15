import type { Doc } from '@convex/_generated/dataModel'
import { CARRY_FORWARD_CORE_KEYS, normalizeCoreValue, type CoreValue } from '../../../convex/domain/coreFields.ts'
import { isValidYardLine } from '../../../convex/domain/fieldZone.ts'
import { hasAnalysisValue, normalizeAnalysisValue, type AnalysisValue, type ColumnKey } from '../../../convex/domain/templateFields.ts'
import { builtInTerminology, type TerminologyList } from '../../../convex/domain/terminology.ts'
import { sectionAppliesTo } from '../../../convex/domain/playSide.ts'
import type { PlayLogColumn } from './columns'

export type Draft = Readonly<Partial<Record<ColumnKey, unknown>>>

type GroupKind = { kind: 'tags'; tags: readonly string[]; multi: boolean } | { kind: 'input' }

export function groupKind(
  column: PlayLogColumn,
  terminology: readonly { list: TerminologyList; value: string }[],
): GroupKind {
  if (column.kind === 'core') {
    const { key, input } = column.field
    if (input.kind === 'select') return { kind: 'tags', tags: input.options, multi: false }
    if (input.kind === 'terminology') {
      const tags = [...new Set([...builtInTerminology(input.list),
        ...terminology.filter((term) => term.list === input.list).map((term) => term.value)])].sort()
      return { kind: 'tags', tags, multi: false }
    }
    if (key === 'down' || key === 'quarter') return { kind: 'tags', tags: ['1', '2', '3', '4'], multi: false }
  } else {
    const { type, options } = column.field
    if (type === 'select' || type === 'multiSelect') return { kind: 'tags', tags: options, multi: type === 'multiSelect' }
    if (type === 'rating') return { kind: 'tags', tags: ['1', '2', '3', '4', '5'], multi: false }
    if (type === 'checkbox') return { kind: 'tags', tags: ['Yes', 'No'], multi: false }
  }
  return { kind: 'input' }
}

export function toCreateArgs(draft: Draft, columns: readonly PlayLogColumn[]): {
  core: Record<string, CoreValue>; analysis: Record<string, AnalysisValue>
} {
  const core: Record<string, CoreValue> = {}
  const analysis: Record<string, AnalysisValue> = {}
  for (const column of columns) {
    const raw = draft[column.key]
    if (column.kind === 'core') {
      const value = normalizeCoreValue(column.field.key, raw)
      if (value !== undefined) core[column.field.key] = value
    } else {
      const value = normalizeAnalysisValue(column.field, raw)
      if (value !== null) analysis[column.field._id] = value
    }
  }
  return { core, analysis }
}

export function carryForwardDraft(
  snap: Pick<Doc<'snaps'>, 'core' | 'analysis'>,
  columns: readonly PlayLogColumn[],
): Draft {
  const draft: Partial<Record<ColumnKey, unknown>> = {}
  for (const column of columns) {
    if (column.kind === 'core') {
      if (CARRY_FORWARD_CORE_KEYS.some((key) => key === column.field.key)) {
        const value = snap.core[column.field.key]
        if (value !== undefined) draft[column.key] = value
      }
    } else if (column.field.carryForward) {
      const value = snap.analysis[column.field._id]
      if (value !== undefined) draft[column.key] = value
    }
  }
  return draft
}

export function hasAnyValue(draft: Draft): boolean {
  return Object.values(draft).some((value) => hasAnalysisValue(value) || isValidYardLine(value))
}

export function applicableColumns(columns: readonly PlayLogColumn[], tree: {
  readonly sections: readonly { readonly _id: string; readonly name: string }[]
}, draft: Draft): PlayLogColumn[] {
  const names = new Map(tree.sections.map((section) => [section._id, section.name]))
  return columns.filter((column) => column.kind === 'core' || sectionAppliesTo(names.get(column.field.sectionId) ?? '', draft['core:playType']))
}
