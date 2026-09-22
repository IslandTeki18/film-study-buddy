import assert from 'node:assert/strict'
import test from 'node:test'
import { autoMap, coerceRow, coerceValue, includeForOdkFilter, isOdkHeader } from './csvMapping.ts'

test('interprets signed Hudl yard lines from the offense perspective', () => {
  assert.deepEqual(coerceValue('yardLine', '-45'), { ok: true, value: { side: 'own', yard: 45 } })
  assert.deepEqual(coerceValue('yardLine', '37'), { ok: true, value: { side: 'opp', yard: 37 } })
})

test('maps ODK into core and flags special teams', () => {
  const mapping = autoMap(['PLAY #', 'ODK', 'DN'])

  assert.equal(mapping.ODK, 'odk')
  assert.deepEqual(coerceRow({ 'PLAY #': '1', ODK: 'o', DN: '1' }, mapping, 0).core.odk, 'O')
  assert.equal(coerceRow({ 'PLAY #': '2', ODK: 'K', DN: '4' }, mapping, 1).flag, 'specialTeams')
})

test('recognizes every ODK header alias', () => {
  assert.equal(isOdkHeader(' O/D/K '), true)
  assert.equal(isOdkHeader('unit'), true)
  assert.equal(isOdkHeader('down'), false)
})

test('prefers the explicit ODK header regardless of column order', () => {
  assert.deepEqual(autoMap(['UNIT', 'ODK', 'PLAY #']), { UNIT: null, ODK: 'odk', 'PLAY #': 'playNumber' })
})

test('ignores a stale unit filter when ODK is unmapped', () => {
  const row = coerceRow({ 'PLAY #': '1', DN: '1' }, { 'PLAY #': 'playNumber', DN: 'down' }, 0)

  assert.equal(includeForOdkFilter(row, 'O', false), true)
})
