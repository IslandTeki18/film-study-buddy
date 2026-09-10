import { useCallback, useRef, useState, type DragEvent } from 'react'

export interface ReorderOptions {
  readonly itemCount: number
  readonly onReorder: (fromIndex: number, toIndex: number) => void
  readonly label: (index: number) => string
}

export function useReorder({ itemCount, onReorder, label }: ReorderOptions): {
  readonly getItemProps: (index: number) => {
    readonly draggable: true
    readonly onDragStart: (event: DragEvent) => void
    readonly onDragOver: (event: DragEvent) => void
    readonly onDragEnd: () => void
    readonly onDrop: (event: DragEvent) => void
    readonly 'aria-grabbed'?: boolean
  }
  readonly moveUp: (index: number) => void
  readonly moveDown: (index: number) => void
  readonly canMoveUp: (index: number) => boolean
  readonly canMoveDown: (index: number) => boolean
  readonly dragOverIndex: number | null
  readonly announcement: string
} {
  const draggedIndexRef = useRef<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const isValid = useCallback((index: number): boolean => Number.isInteger(index) && index >= 0 && index < itemCount, [itemCount])
  const canMoveUp = useCallback((index: number): boolean => isValid(index) && index > 0, [isValid])
  const canMoveDown = useCallback((index: number): boolean => isValid(index) && index < itemCount - 1, [isValid, itemCount])

  const move = useCallback((fromIndex: number, toIndex: number): void => {
    if (!isValid(fromIndex) || !isValid(toIndex) || fromIndex === toIndex) return
    onReorder(fromIndex, toIndex)
    setAnnouncement(`${label(fromIndex)} moved to position ${toIndex + 1} of ${itemCount}`)
  }, [isValid, itemCount, label, onReorder])

  const moveUp = useCallback((index: number): void => {
    if (canMoveUp(index)) move(index, index - 1)
  }, [canMoveUp, move])
  const moveDown = useCallback((index: number): void => {
    if (canMoveDown(index)) move(index, index + 1)
  }, [canMoveDown, move])

  const getItemProps = useCallback((index: number) => ({
    draggable: true as const,
    onDragStart: (event: DragEvent): void => {
      if (!isValid(index)) return
      draggedIndexRef.current = index
      setDraggedIndex(index)
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (event: DragEvent): void => {
      if (!isValid(index) || draggedIndexRef.current === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    },
    onDragEnd: (): void => {
      draggedIndexRef.current = null
      setDraggedIndex(null)
      setDragOverIndex(null)
    },
    onDrop: (event: DragEvent): void => {
      event.preventDefault()
      const fromIndex = draggedIndexRef.current
      if (fromIndex !== null) move(fromIndex, index)
      draggedIndexRef.current = null
      setDraggedIndex(null)
      setDragOverIndex(null)
    },
    ...(draggedIndex === index ? { 'aria-grabbed': true as const } : {}),
  }), [draggedIndex, isValid, move])

  return { getItemProps, moveUp, moveDown, canMoveUp, canMoveDown, dragOverIndex, announcement }
}
