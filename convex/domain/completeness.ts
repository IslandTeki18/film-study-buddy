import { sectionAppliesTo } from './playSide.ts'
import { hasAnalysisValue } from './templateFields.ts'

export interface CompletenessSection {
  readonly name: string
  readonly fields: readonly { readonly _id: string; readonly required: boolean }[]
}
export interface CompletenessSnap {
  readonly core: { readonly playType?: string }
  readonly analysis: Readonly<Record<string, unknown>>
}

export function countIncompleteSnaps(sections: readonly CompletenessSection[], snaps: readonly CompletenessSnap[]): number {
  const required = sections.flatMap((section) => section.fields.filter((field) => field.required)
    .map((field) => ({ sectionName: section.name, fieldId: field._id })))
  if (required.length === 0) return 0
  let count = 0
  for (const snap of snaps) {
    const incomplete = required.some(({ sectionName, fieldId }) =>
      sectionAppliesTo(sectionName, snap.core.playType) && !hasAnalysisValue(snap.analysis[fieldId]))
    if (incomplete) count += 1
  }
  return count
}
