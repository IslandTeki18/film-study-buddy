import assert from 'node:assert/strict'
import test from 'node:test'
import { sheetRowsToCsv } from './parse-csv.ts'

test('converts the first worksheet into import rows', () => {
  assert.deepEqual(sheetRowsToCsv([
    ['PLAY #', 'ODK', 'YARD LN'],
    [1, 'O', -45],
    [2, 'D', 37],
  ]), {
    headers: ['PLAY #', 'ODK', 'YARD LN'],
    rows: [
      { 'PLAY #': '1', ODK: 'O', 'YARD LN': '-45' },
      { 'PLAY #': '2', ODK: 'D', 'YARD LN': '37' },
    ],
  })
})
