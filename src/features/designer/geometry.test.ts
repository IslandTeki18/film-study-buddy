import assert from 'node:assert/strict'
import test from 'node:test'
import { svgPoint, yards } from './geometry.ts'

test('svgPoint accounts for letterboxing, snaps to the yard grid, and clamps to the field', () => {
  const svg = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 620, height: 800 }) }
  // 620×800 box holds a 620×400 canvas centered vertically: canvas y=0 is at client y=200.
  assert.deepEqual(svgPoint({ clientX: 123, clientY: 200 + 77 }, svg, false), { x: 123, y: 77 })
  assert.deepEqual(svgPoint({ clientX: 123, clientY: 200 + 77 }, svg, true), { x: 120, y: 80 })
  assert.deepEqual(svgPoint({ clientX: 0, clientY: 0 }, svg, false), { x: 20, y: 30 })
  assert.equal(yards([{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: 40, y: 30 }]), 7)
})
