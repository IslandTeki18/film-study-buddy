import assert from 'node:assert/strict'
import test from 'node:test'
import { effectiveTerminology, TERMINOLOGY_DESCRIPTION_MAX_LENGTH } from './terminology.ts'

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

test('descriptions: built-ins have defaults, a coach row overrides, coach values carry their own', () => {
  const entries = formations([
    { list: 'formations', value: 'Trips', description: 'Our Trips: always to the field' },
    { list: 'formations', value: 'Trips Rt', description: 'Trips to the right' },
    { list: 'formations', value: 'Deuce' },
  ])
  assert.match(entries.find((entry) => entry.value === 'Bunch')?.description ?? '', /clustered/)
  assert.equal(entries.find((entry) => entry.value === 'Trips')?.description, 'Our Trips: always to the field')
  assert.equal(entries.find((entry) => entry.value === 'Trips Rt')?.description, 'Trips to the right')
  assert.equal('description' in (entries.find((entry) => entry.value === 'Deuce') ?? {}), false)
})

test('every built-in Formation and Play Concept has a description', () => {
  for (const entry of effectiveTerminology([]).filter((item) => item.list === 'formations' || item.list === 'playConcepts')) {
    assert.ok(entry.description && entry.description.length <= TERMINOLOGY_DESCRIPTION_MAX_LENGTH, `${entry.list}: ${entry.value}`)
  }
})
