import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export const SHORTCUTS = {
  toggleMustReview: { key: 'r', mod: true, label: 'Cmd/Ctrl+R' },
  reviewNext: { key: 'j', mod: false, label: 'J' },
  reviewPrevious: { key: 'k', mod: false, label: 'K' },
} as const
export type ShortcutName = keyof typeof SHORTCUTS

export function isShortcut(event: KeyboardEvent | ReactKeyboardEvent, name: ShortcutName): boolean {
  const shortcut = SHORTCUTS[name]
  const native = 'nativeEvent' in event ? event.nativeEvent : event
  if (native.isComposing || event.repeat || event.altKey || event.shiftKey) return false
  if ((event.metaKey || event.ctrlKey) !== shortcut.mod || event.key.toLowerCase() !== shortcut.key) return false
  const target = event.target
  if (!shortcut.mod && target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))) return false
  return true
}

export function inDialog(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('dialog, [role="dialog"]') !== null
}
