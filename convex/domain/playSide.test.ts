import assert from 'node:assert/strict'
import test from 'node:test'
import { playSideOf, sectionAppliesTo, sectionSideOf } from './playSide.ts'

test('Play Type and Section side rules fail open for neutral or unknown values', () => {
  assert.equal(playSideOf('Run'), 'run')
  assert.equal(playSideOf('Screen'), 'pass')
  assert.equal(playSideOf('RPO'), 'both')
  assert.equal(playSideOf('toString'), 'both')
  assert.equal(sectionSideOf('Pass Game'), 'pass')
  assert.equal(sectionSideOf('Run/Pass Reads'), 'both')
  assert.equal(sectionSideOf('Notes'), 'both')
  assert.equal(sectionAppliesTo('Pass Game', 'Run'), false)
  assert.equal(sectionAppliesTo('Run Game', 'Run'), true)
  assert.equal(sectionAppliesTo('Notes', 'Run'), true)
  assert.equal(sectionAppliesTo('Pass Game', undefined), true)
  assert.equal(sectionAppliesTo('Pass Game', 'RPO'), true)
  assert.equal(sectionAppliesTo('Run/Pass Reads', 'Pass'), true)
})
