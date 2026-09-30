import assert from 'node:assert/strict'
import test from 'node:test'
import { findTells, isTellIndicatorKey, isTellOutcomeKey, TELL_MIN_SNAPS, wilsonLowerBound, type TellSnap } from './tells.ts'

const FORMATION = { key: 'core:formation', label: 'Formation' }
const HASH = { key: 'core:hash', label: 'Hash' }
const PLAY_TYPE = { key: 'core:playType', label: 'Play Type' }
let next = 0
function snaps(count: number, values: Record<string, string>, yards?: number): TellSnap[] {
  return Array.from({ length: count }, () => ({ id: `s${next++}`, values, ...(yards !== undefined ? { yards } : {}) }))
}

test('wilsonLowerBound is 0 for no data and about 0.72 for 10 of 10', () => {
  assert.equal(wilsonLowerBound(0, 0), 0)
  assert.ok(Math.abs(wilsonLowerBound(10, 10) - 0.7225) < 0.001)
  assert.ok(wilsonLowerBound(12, 12) > wilsonLowerBound(6, 6))
})

test('classifies indicator and outcome keys', () => {
  assert.ok(isTellIndicatorKey('derived:fieldZone'))
  assert.ok(!isTellIndicatorKey('core:playType'))
  assert.ok(isTellOutcomeKey('core:playType'))
  assert.ok(isTellOutcomeKey('field:select:coverage'))
  assert.ok(!isTellOutcomeKey('field:tags:notes'))
})

test('finds a single-indicator Tell with breakdown, baseline, and yards', () => {
  const data = [
    ...snaps(9, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }, 6),
    ...snaps(1, { 'core:formation': 'Trips Rt', 'core:playType': 'Run' }, 2),
    ...snaps(10, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION], [PLAY_TYPE])
  const trips = tells.find((tell) => tell.indicators[0]?.value === 'Trips Rt')
  assert.ok(trips)
  assert.equal(trips.outcome.value, 'Pass')
  assert.equal(trips.hits, 9)
  assert.equal(trips.snaps, 10)
  assert.equal(trips.share, 0.9)
  assert.equal(trips.baseline, 9 / 20)
  assert.equal(trips.smallSample, false)
  assert.equal(trips.snapIds.length, 10)
  assert.deepEqual(trips.breakdown, [{ value: 'Pass', snaps: 9, avgYards: 6 }, { value: 'Run', snaps: 1, avgYards: 2 }])
})

test('ignores groups below the minimum snap count', () => {
  const data = [
    ...snaps(TELL_MIN_SNAPS - 1, { 'core:formation': 'Empty', 'core:playType': 'Pass' }),
    ...snaps(10, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  assert.equal(findTells(data, [FORMATION], [PLAY_TYPE]).some((tell) => tell.indicators[0]?.value === 'Empty'), false)
})

test('ignores a high share that does not beat the baseline', () => {
  const data = [
    ...snaps(9, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }),
    ...snaps(1, { 'core:formation': 'Trips Rt', 'core:playType': 'Run' }),
  ]
  assert.deepEqual(findTells(data, [FORMATION], [PLAY_TYPE]), [])
})

test('Snaps missing the outcome or an indicator do not count toward N', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips Rt', 'core:playType': 'Pass' }),
    ...snaps(3, { 'core:formation': 'Trips Rt' }),
    ...snaps(5, { 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
  ]
  const trips = findTells(data, [FORMATION], [PLAY_TYPE]).find((tell) => tell.indicators[0]?.value === 'Trips Rt')
  assert.ok(trips)
  assert.equal(trips.snaps, 5)
  assert.equal(trips.smallSample, true)
})

test('finds pair Tells that no single indicator reveals', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Left', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Right', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Left', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Right', 'core:playType': 'Pass' }),
  ]
  const tells = findTells(data, [FORMATION, HASH], [PLAY_TYPE])
  assert.equal(tells.length, 4)
  assert.ok(tells.every((tell) => tell.indicators.length === 2 && tell.share === 1))
})

test('drops a pair Tell when a single indicator already explains it', () => {
  const data = [
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Left', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Trips', 'core:hash': 'Right', 'core:playType': 'Pass' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Left', 'core:playType': 'Run' }),
    ...snaps(5, { 'core:formation': 'Pro', 'core:hash': 'Right', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION, HASH], [PLAY_TYPE])
  assert.equal(tells.length, 2)
  assert.ok(tells.every((tell) => tell.indicators.length === 1 && tell.indicators[0]?.key === 'core:formation'))
})

test('results are ranked by confidence floor over baseline and have unique keys', () => {
  const data = [
    ...snaps(12, { 'core:formation': 'Trips', 'core:playType': 'Pass' }),
    ...snaps(6, { 'core:formation': 'Pro', 'core:playType': 'Run' }),
    ...snaps(6, { 'core:formation': 'Ace', 'core:playType': 'Run' }),
  ]
  const tells = findTells(data, [FORMATION], [PLAY_TYPE])
  const scores = tells.map((tell) => tell.confidenceFloor - tell.baseline)
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
  assert.equal(new Set(tells.map((tell) => tell.key)).size, tells.length)
})
