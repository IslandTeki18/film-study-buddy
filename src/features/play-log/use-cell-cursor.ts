import { useState } from 'react'

export type CellCursor = { readonly row: number; readonly col: number }

export function nextCell(cursor: CellCursor, key: string, rows: number, cols: number, shift = false, command = false): CellCursor | null {
  const { row, col } = cursor
  if (key === 'Tab') {
    const next = row * cols + col + (shift ? -1 : 1)
    return next < 0 || next >= rows * cols ? null : { row: Math.floor(next / cols), col: next % cols }
  }
  switch (key) {
    case 'ArrowUp': return { row: Math.max(0, row - 1), col }
    case 'ArrowDown': return { row: Math.min(rows - 1, row + 1), col }
    case 'ArrowLeft': return { row, col: Math.max(0, col - 1) }
    case 'ArrowRight': return { row, col: Math.min(cols - 1, col + 1) }
    case 'Home': return command ? { row: 0, col } : { row, col: 0 }
    case 'End': return command ? { row: rows - 1, col } : { row, col: cols - 1 }
    default: return cursor
  }
}

export function useCellCursor(rows: number, cols: number): {
  cursor: CellCursor
  setCursor: (cursor: CellCursor) => void
  next: (key: string, shift?: boolean, command?: boolean) => CellCursor | null
} {
  const [position, setCursor] = useState<CellCursor>({ row: 0, col: 0 })
  const cursor = { row: Math.max(0, Math.min(rows - 1, position.row)), col: Math.max(0, Math.min(cols - 1, position.col)) }
  return { cursor, setCursor, next: (key, shift, command) => nextCell(cursor, key, rows, cols, shift, command) }
}
