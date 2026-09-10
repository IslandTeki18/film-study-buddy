/** Compare trimmed canonical display strings: Hudl strings and typed Snap values share meaning. */
// ponytail: shell provenance checks only; add node --test coverage before Phase 6.
import { formatCoreValue } from './core-fields.ts'
import type { CoreFieldKey } from './core-fields.ts'

export const PROVENANCE_STATES = ['Imported', 'Coach Entered', 'Coach Edited'] as const
export type Provenance = (typeof PROVENANCE_STATES)[number]

export function restoredValueFor(
  imported: Readonly<Record<string, string>> | undefined,
  key: CoreFieldKey,
): string | null {
  return imported && Object.hasOwn(imported, key) ? imported[key] ?? null : null
}

export function provenanceOf(
  imported: Readonly<Record<string, string>> | undefined,
  key: CoreFieldKey,
  currentValue: unknown,
): Provenance {
  const original = restoredValueFor(imported, key)
  if (original === null) return 'Coach Entered'
  return original.trim() === formatCoreValue(key, currentValue).trim() ? 'Imported' : 'Coach Edited'
}
