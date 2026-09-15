import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeDiagram } from './diagram.ts'

test('diagram normalization clamps valid geometry and rejects a malformed shape without dropping it', () => {
  const document = {
    players: [{ id: 'qb', side: 'offense' as const, x: -1, y: 2, label: ' QB ', jersey: ' 12 ' }],
    shapes: [
      { id: 'route', tool: 'arrow' as const, points: [-1, 0.5, 2, 1] },
      { id: 'bad-route', tool: 'curve' as const, points: [0, 0, 1, 1] },
    ],
    note: '  Counter read  ',
  }

  assert.throws(() => normalizeDiagram(document), /curve.*6 points/i)
  assert.deepEqual(document.shapes[1]!.points, [0, 0, 1, 1])
  assert.deepEqual(normalizeDiagram({ ...document, shapes: [document.shapes[0]!] }), {
    players: [{ id: 'qb', side: 'offense', x: 0, y: 1, label: 'QB', jersey: '12' }],
    shapes: [{ id: 'route', tool: 'arrow', points: [0, 0.5, 1, 1] }],
    note: 'Counter read',
  })
})
