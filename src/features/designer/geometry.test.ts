import assert from 'node:assert/strict'
import test from 'node:test'
import { curveControl, distanceToSegment, hitTestShape, simplifyFreehand, toNormalized } from './geometry.ts'

test('geometry helpers account for letterboxing and retain meaningful freehand points', () => {
  const svg = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }) } as SVGSVGElement
  assert.deepEqual(toNormalized({ clientX: 0, clientY: 150 }, svg), { x: 0, y: 0.5 })
  assert.deepEqual(curveControl(0, 0, 1, 0), { cx: 0.5, cy: 0.12 })
  assert.deepEqual(simplifyFreehand([0, 0, 0.001, 0.001, 0.1, 0.1]), [0, 0, 0.1, 0.1])
  assert.equal(distanceToSegment(0.5, 0.1, 0, 0, 1, 0), 0.1)
  assert.equal(hitTestShape([{ id: 'a', tool: 'arrow', points: [0, 0, 1, 0] }], 0.5, 0.01)?.id, 'a')
})
