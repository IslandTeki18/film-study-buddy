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

test('assignments: routes clamp, empty routes drop, zones keep a minimum size, dangling man coverage is dropped', () => {
  const normalized = normalizeDiagram({
    players: [
      { id: 'X', side: 'offense', kind: 'WR', x: 0.1, y: 0.6, job: 'Post', route: [0.1, 0.4, 1.5, -0.2] },
      { id: 'dC', side: 'defense', kind: 'CB', x: 0.1, y: 0.4, job: 'Man', coversId: 'X', route: [] },
      { id: 'dS', side: 'defense', kind: 'SS', x: 0.5, y: 0.3, job: 'Zone', zone: { x: 0.5, y: 0.2, rx: 0, ry: 2 }, coversId: 'gone' },
    ],
    shapes: [],
  })
  assert.deepEqual(normalized.players, [
    { id: 'X', side: 'offense', kind: 'WR', x: 0.1, y: 0.6, job: 'Post', route: [0.1, 0.4, 1, 0] },
    { id: 'dC', side: 'defense', kind: 'CB', x: 0.1, y: 0.4, job: 'Man', coversId: 'X' },
    { id: 'dS', side: 'defense', kind: 'SS', x: 0.5, y: 0.3, job: 'Zone', zone: { x: 0.5, y: 0.2, rx: 0.01, ry: 1 } },
  ])
  assert.throws(() => normalizeDiagram({ players: [{ id: 'X', side: 'offense', x: 0, y: 0, route: [0.1] }], shapes: [] }), /even number/)
})
