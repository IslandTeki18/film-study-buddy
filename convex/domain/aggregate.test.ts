import assert from 'node:assert/strict'
import test from 'node:test'
import { groupingFieldsFor } from './aggregate.ts'

test('offers ODK as an Opponent Data grouping field', () => {
  assert.ok(groupingFieldsFor([]).some(({ key, label }) => key === 'core:odk' && label === 'ODK'))
})
