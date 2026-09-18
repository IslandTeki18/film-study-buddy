import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export const SHORTCUTS = {
  toggleMustReview: { key: 'r', mod: true, label: 'Cmd/Ctrl+R', description: 'Toggle Must Review', context: 'Play Log' },
  reviewNext: { key: 'j', mod: false, label: 'J', description: 'Next Snap', context: 'Focused Review Mode' },
  reviewPrevious: { key: 'k', mod: false, label: 'K', description: 'Previous Snap', context: 'Focused Review Mode' },
  createSnap: { key: 'n', mod: true, label: 'Cmd/Ctrl+N', description: 'Save the Snap and start the next one (Carry-Forward applies)', context: 'Play Log' },
  openPlayDetail: { key: 'Enter', mod: true, label: 'Cmd/Ctrl+Enter', description: 'Open Play Detail for the latest Snap', context: 'Play Log' },
  undoToast: { key: 'z', mod: true, label: 'Cmd/Ctrl+Z', description: 'Undo the last delete (while the Undo notice is showing)', context: 'Global' },
  showHelp: { key: '?', mod: false, label: '?', description: 'Show keyboard shortcuts', context: 'Global' },
} as const
export type ShortcutName = keyof typeof SHORTCUTS

export const LOCAL_KEYS = [
  { label: '1–9', description: 'Pick a tag', context: 'Play Log' },
  { label: 'Tab / Shift+Tab', description: 'Move between field groups', context: 'Play Log' },
  { label: 'Enter', description: 'Save the palette draft as a Snap', context: 'Play Log' },
  { label: 'Esc', description: 'Clear the palette draft', context: 'Play Log' },
  { label: 'Arrows / Home / End', description: 'Move between field groups', context: 'Play Log' },
  { label: 'Enter', description: 'Commit a field edit', context: 'Play Detail' },
  { label: 'Esc', description: 'Cancel a field edit', context: 'Play Detail' },
  { label: 'Delete / Backspace', description: 'Remove the selected designer object', context: 'Play Detail' },
  { label: 'Esc', description: 'Clear the designer selection', context: 'Play Detail' },
  { label: 'Arrows / Shift+arrows', description: 'Nudge the selected Player Object', context: 'Play Detail' },
  { label: 'Alt+arrows / Shift+Alt+arrows', description: 'Move the selected zone or motion spot (zone wins when both exist)', context: 'Play Detail' },
  { label: 'Alt+[ / Alt+]', description: 'Resize the selected zone', context: 'Play Detail' },
] as const

export function isShortcut(event: KeyboardEvent | ReactKeyboardEvent, name: ShortcutName): boolean {
  const shortcut = SHORTCUTS[name]
  const native = 'nativeEvent' in event ? event.nativeEvent : event
  if (native.isComposing || event.repeat || event.altKey || (event.shiftKey && name !== 'showHelp')) return false
  if ((event.metaKey || event.ctrlKey) !== shortcut.mod || (shortcut.key === 'Enter' || shortcut.key === '?' ? event.key !== shortcut.key : event.key.toLowerCase() !== shortcut.key)) return false
  const target = event.target
  if (!shortcut.mod && target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))) return false
  return true
}

export function inDialog(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('dialog, [role="dialog"]') !== null
}
