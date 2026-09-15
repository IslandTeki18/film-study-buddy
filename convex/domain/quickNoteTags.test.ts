import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_QUICK_NOTE_TAGS, normalizeQuickNoteTags, tagVocabulary } from './quickNoteTags.ts'

test('Quick Note tags trim, deduplicate, bound length, and keep defaults before sorted custom tags', () => {
  assert.deepEqual(normalizeQuickNoteTags([' Run ', 'run', '', '  ', 'Custom', 'CUSTOM']), ['Run', 'Custom'])
  assert.deepEqual(normalizeQuickNoteTags(['a'.repeat(41), 'a'.repeat(40)]), ['a'.repeat(40)])
  assert.deepEqual(tagVocabulary(['zebra', 'run', 'Alpha', 'alpha']), [...DEFAULT_QUICK_NOTE_TAGS, 'Alpha', 'zebra'])
})
