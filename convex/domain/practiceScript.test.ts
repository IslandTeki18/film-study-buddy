import assert from 'node:assert/strict'
import test from 'node:test'
import {
  allocateReps, buildReps, cardFacts, cardNumbers, cardTitle, formatDownDistance, interleave, patchRep,
  PRACTICE_PERIOD_MAX_REPS, validatePeriods, type ScriptPeriod,
} from './practiceScript.ts'

test('allocateReps is proportional and always sums to the total', () => {
  assert.deepEqual(allocateReps([3, 1], 12), [9, 3])
  assert.deepEqual(allocateReps([1, 1, 1], 10), [4, 3, 3])
  assert.deepEqual(allocateReps([5, 0], 4), [4, 0])
  assert.deepEqual(allocateReps([7, 2, 1], 0), [0, 0, 0])
  assert.deepEqual(allocateReps([], 5), [])
})

test('allocateReps splits evenly when every weight is zero', () => {
  assert.deepEqual(allocateReps([0, 0], 5), [3, 2])
})

test('allocateReps rejects negative or fractional totals', () => {
  assert.throws(() => allocateReps([1], -1))
  assert.throws(() => allocateReps([1], 2.5))
})

test('interleave avoids back-to-back repeats when it can', () => {
  assert.deepEqual(interleave([2, 2]), [0, 1, 0, 1])
  assert.deepEqual(interleave([3, 1]), [0, 1, 0, 0])
  assert.deepEqual(interleave([2, 3]), [1, 0, 1, 0, 1])
  assert.deepEqual(interleave([0, 0]), [])
})

test('buildReps cycles each card through its film situations', () => {
  let id = 0
  const reps = buildReps([
    { diagramId: 'a', weight: 3, situations: [{ down: 1, distance: 10, hash: 'Left' }, { down: 3, distance: 7 }] },
    { diagramId: 'b', weight: 1, situations: [] },
  ], 4, () => `r${id++}`)
  assert.deepEqual(reps.map((rep) => rep.diagramId), ['a', 'b', 'a', 'a'])
  assert.deepEqual(reps.filter((rep) => rep.diagramId === 'a').map((rep) => [rep.down, rep.distance, rep.hash]),
    [[1, 10, 'Left'], [3, 7, undefined], [1, 10, 'Left']])
  assert.equal('down' in (reps[1] ?? {}), false)
  assert.deepEqual(reps.map((rep) => rep.id), ['r0', 'r1', 'r2', 'r3'])
})

test('patchRep sets and clears optional fields without leaving undefined keys', () => {
  const rep = { id: 'r', diagramId: 'a', down: 2, distance: 5, hash: 'Left' as const }
  const cleared = patchRep(rep, { down: undefined, note: 'Watch the H' })
  assert.deepEqual(cleared, { id: 'r', diagramId: 'a', distance: 5, hash: 'Left', note: 'Watch the H' })
  assert.equal('down' in cleared, false)
  assert.equal(patchRep(rep, { diagramId: 'b' }).diagramId, 'b')
})

test('cardNumbers numbers live cards by first appearance', () => {
  const periods: ScriptPeriod[] = [
    { id: 'p1', name: 'One', reps: [{ id: '1', diagramId: 'b' }, { id: '2', diagramId: 'x' }, { id: '3', diagramId: 'a' }] },
    { id: 'p2', name: 'Two', reps: [{ id: '4', diagramId: 'a' }, { id: '5', diagramId: 'c' }] },
  ]
  assert.deepEqual([...cardNumbers(periods, (id) => id !== 'x')], [['b', 1], ['a', 2], ['c', 3]])
})

test('validatePeriods normalizes names, trims notes, and rejects bad values', () => {
  const [period] = validatePeriods([{ id: 'p', name: '  ', reps: [{ id: 'r', diagramId: 'a', note: '  ' }] }])
  assert.equal(period?.name, 'Period 1')
  assert.deepEqual(period?.reps[0], { id: 'r', diagramId: 'a' })
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: [{ id: 'r', diagramId: 'a', down: 5 }] }]), /Down/)
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: [{ id: 'r', diagramId: 'a', distance: 100 }] }]), /Distance/)
  const tooMany = Array.from({ length: PRACTICE_PERIOD_MAX_REPS + 1 }, (_, index) => ({ id: String(index), diagramId: 'a' }))
  assert.throws(() => validatePeriods([{ id: 'p', name: 'A', reps: tooMany }]), /at most/)
})

test('cardFacts reports the most common value per field; cardTitle falls back to facts', () => {
  const facts = cardFacts([
    { formation: 'Trips Rt', playConcept: 'Mesh', hash: 'Left' },
    { formation: 'Trips Rt', playConcept: 'Mesh', hash: 'Right' },
    { formation: 'Deuce', hash: 'Left', situation: '3rd & Long' },
  ])
  assert.equal(facts.snaps, 3)
  assert.deepEqual(facts.top.find((fact) => fact.label === 'Formation'), { label: 'Formation', value: 'Trips Rt', count: 2 })
  assert.deepEqual(facts.top.find((fact) => fact.label === 'Hash'), { label: 'Hash', value: 'Left', count: 2 })
  assert.equal(facts.top.some((fact) => fact.label === 'Personnel'), false)
  assert.equal(cardTitle('  Y Stick ', facts), 'Y Stick')
  assert.equal(cardTitle(undefined, facts), 'Trips Rt Mesh')
  assert.equal(cardTitle(undefined, cardFacts([])), 'Play Diagram')
})

test('formatDownDistance', () => {
  assert.equal(formatDownDistance(3, 7), '3rd & 7')
  assert.equal(formatDownDistance(1, undefined), '1st')
  assert.equal(formatDownDistance(undefined, 10), '')
  assert.equal(formatDownDistance(5, 1), '')
})
