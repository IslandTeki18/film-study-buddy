import type { Doc } from '@convex/_generated/dataModel'
import { formatCoreValue } from '@convex/domain/coreFields'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import type { ColumnKey } from '@convex/domain/templateFields'
import type { PlayLogColumn } from './columns'

export type SortState = { readonly key: ColumnKey; readonly direction: 'asc' | 'desc' } | null

export function displayValue(snap: Doc<'snaps'>, column: PlayLogColumn): string {
  if (column.kind === 'core') {
    const value = snap.core[column.field.key]
    const text = formatCoreValue(column.field.key, value)
    return column.field.key === 'yardLine' && isValidYardLine(value) ? `${text}\n${fieldZoneOf(value)}` : text
  }
  const value = snap.analysis[column.field._id]
  return Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value ?? '')
}

export function nextSort(current: SortState, key: ColumnKey): SortState {
  return current?.key !== key ? { key, direction: 'asc' }
    : current.direction === 'asc' ? { key, direction: 'desc' } : null
}

export function sortSnaps(snaps: readonly Doc<'snaps'>[], column: PlayLogColumn | undefined, sort: SortState): Doc<'snaps'>[] {
  if (!sort || !column) return [...snaps]
  function valueOf(snap: Doc<'snaps'>): string | number {
    const value = column!.kind === 'core' ? snap.core[column!.field.key] : snap.analysis[column!.field._id]
    if (typeof value === 'number') return value
    if (isValidYardLine(value)) return value.side === 'mid' ? 50 : value.side === 'own' ? value.yard : 100 - value.yard
    return displayValue(snap, column!)
  }
  return [...snaps].sort((a, b) => {
    const left = valueOf(a)
    const right = valueOf(b)
    if (left === '' || right === '') return left === right ? 0 : left === '' ? 1 : -1
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))
    return comparison * (sort.direction === 'asc' ? 1 : -1)
  })
}

export function filterSnaps(snaps: readonly Doc<'snaps'>[], columns: readonly PlayLogColumn[], query: string): Doc<'snaps'>[] {
  const text = query.trim().toLocaleLowerCase()
  return text ? snaps.filter((snap) => columns.some((column) => displayValue(snap, column).toLocaleLowerCase().includes(text))) : [...snaps]
}
