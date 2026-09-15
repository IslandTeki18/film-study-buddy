import assert from 'node:assert/strict'
import test from 'node:test'
import { inDialog, isShortcut } from './shortcuts.ts'

test('fixed shortcuts respect modifiers, typing, composition, repeat, and dialogs', () => {
  class Element {
    isContentEditable = false
    closest(selector: string): Element | null {
      return selector.includes('input') ? this : null
    }
  }
  Object.assign(globalThis, { HTMLElement: Element })
  const event = (overrides: Partial<KeyboardEvent> = {}): KeyboardEvent => ({
    key: 'r', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false,
    isComposing: false, repeat: false, target: null, ...overrides,
  }) as KeyboardEvent
  assert.ok(isShortcut(event(), 'toggleMustReview'))
  assert.ok(isShortcut(event({ metaKey: false, ctrlKey: true }), 'toggleMustReview'))
  for (const overrides of [{ shiftKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }, { metaKey: false }]) {
    assert.ok(!isShortcut(event(overrides), 'toggleMustReview'))
  }
  const input = new Element() as unknown as HTMLElement
  assert.ok(isShortcut(event({ target: input }), 'toggleMustReview'))
  assert.ok(isShortcut(event({ key: 'j', metaKey: false }), 'reviewNext'))
  assert.ok(!isShortcut(event({ key: 'j', metaKey: false, target: input }), 'reviewNext'))
  assert.ok(isShortcut(event({ key: 'k', metaKey: false }), 'reviewPrevious'))
  assert.ok(!inDialog(null))
  assert.ok(!inDialog(input))
  input.closest = () => input
  assert.ok(inDialog(input))
})
