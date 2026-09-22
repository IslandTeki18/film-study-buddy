import assert from 'node:assert/strict'
import test from 'node:test'
import { autoMap, coerceRow, isOdkHeader } from './csvMapping.ts'

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
