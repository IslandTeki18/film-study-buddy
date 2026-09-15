import assert from 'node:assert/strict'
import test from 'node:test'
import { countIncompleteSnaps } from './completeness.ts'

test('completeness counts each Snap once using only applicable Required Template Fields', () => {
  const sections = [
    { name: 'Run Game', fields: [{ _id: 'run', required: true }] },
    { name: 'Pass Game', fields: [{ _id: 'pass', required: true }] },
    { name: 'General', fields: [{ _id: 'optional', required: false }] },
  ]
  assert.equal(countIncompleteSnaps(sections, [
    { core: { playType: 'Run' }, analysis: { run: false } },
    { core: { playType: 'Pass' }, analysis: { pass: 0 } },
    { core: { playType: 'Run' }, analysis: { run: '  ' } },
    { core: { playType: 'RPO' }, analysis: {} },
    { core: {}, analysis: { run: [], pass: 'filled' } },
  ]), 3)
  assert.equal(countIncompleteSnaps([], [{ core: {}, analysis: {} }]), 0)
  assert.equal(countIncompleteSnaps(sections, []), 0)
})
