import assert from 'node:assert/strict'
import test from 'node:test'
import { effectiveTerminology } from './terminology.ts'

const formations = (rows: Parameters<typeof effectiveTerminology>[0]) =>
  effectiveTerminology(rows).filter((entry) => entry.list === 'formations')

test('includes built-ins and coach values once each', () => {
  const entries = formations([{ list: 'formations', value: 'Trips Rt' }, { list: 'formations', value: 'Trips' }])
  assert.ok(entries.some((entry) => entry.value === 'Shotgun' && entry.builtIn))
  assert.deepEqual(entries.filter((entry) => entry.value === 'Trips Rt'), [{ list: 'formations', value: 'Trips Rt', builtIn: false }])
  assert.equal(entries.filter((entry) => entry.value === 'Trips').length, 1)
})

test('hidden rows remove built-in and coach values from the list', () => {
  const entries = formations([{ list: 'formations', value: 'Shotgun', hidden: true }, { list: 'formations', value: 'Trips Rt', hidden: true }])
  assert.equal(entries.some((entry) => entry.value === 'Shotgun'), false)
  assert.equal(entries.some((entry) => entry.value === 'Trips Rt'), false)
  assert.ok(entries.some((entry) => entry.value === 'Pistol'))
})

test('hiding is per list', () => {
  const entries = effectiveTerminology([{ list: 'motions', value: 'Empty', hidden: true }])
  assert.ok(entries.some((entry) => entry.list === 'formations' && entry.value === 'Empty'))
})
