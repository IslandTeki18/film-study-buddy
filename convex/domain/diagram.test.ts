import assert from 'node:assert/strict'
import test from 'node:test'
import { catchPointOf, normalizeDiagram, PASS_ARC, passArcControl } from './diagram.ts'

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

test('passes: a valid pass is kept; a pass from defense, to defense, to self, or to a missing man is dropped', () => {
  const players = normalizeDiagram({
    players: [
      { id: 'QB', side: 'offense', x: 0.5, y: 0.7, passToId: 'X' },
      { id: 'X', side: 'offense', x: 0.1, y: 0.6, passToId: 'X' },
      { id: 'H', side: 'offense', x: 0.3, y: 0.6, passToId: 'dC' },
      { id: 'Y', side: 'offense', x: 0.7, y: 0.6, passToId: 'gone' },
      { id: 'dC', side: 'defense', x: 0.1, y: 0.4, passToId: 'X' },
    ],
    shapes: [],
  }).players
  assert.equal(players.find((player) => player.id === 'QB')?.passToId, 'X')
  for (const id of ['X', 'H', 'Y', 'dC']) assert.equal('passToId' in (players.find((player) => player.id === id) ?? {}), false, id)
})

test('catchPointOf is the end of the route, or the man himself without one', () => {
  assert.deepEqual(catchPointOf({ x: 0.1, y: 0.6, route: [0.1, 0.4, 0.3, 0.2] }), { x: 0.3, y: 0.2 })
  assert.deepEqual(catchPointOf({ x: 0.1, y: 0.6 }), { x: 0.1, y: 0.6 })
})

test('passArcControl bows upfield in either throw direction and clamps the lift', () => {
  assert.deepEqual(passArcControl({ x: 0, y: 100 }, { x: 100, y: 100 }), { x: 50, y: 100 - 22 })
  assert.deepEqual(passArcControl({ x: 100, y: 100 }, { x: 0, y: 100 }), { x: 50, y: 100 - 22 })
  assert.equal(passArcControl({ x: 0, y: 100 }, { x: 20, y: 100 }).y, 100 - PASS_ARC.min)
  assert.equal(passArcControl({ x: 0, y: 100 }, { x: 1000, y: 100 }).y, 100 - PASS_ARC.max)
  assert.ok(passArcControl({ x: 300, y: 300 }, { x: 100, y: 100 }).y < 200)
  assert.deepEqual(passArcControl({ x: 0, y: 100 }, { x: 0, y: 0 }), { x: 22, y: 50 })
  assert.deepEqual(passArcControl({ x: 5, y: 5 }, { x: 5, y: 5 }), { x: 5, y: 5 })
})
