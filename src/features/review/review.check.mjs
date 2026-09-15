// Run: node src/features/review/review.check.mjs
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
const root = fileURLToPath(new URL('../../../', import.meta.url))
const server = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': `${root}/src`, '@convex': `${root}/convex` } }, esbuild: { jsx: 'automatic' } })
try {
  const { reviewWalk } = await server.ssrLoadModule('/src/features/review/focused-review.tsx')
  const snaps = [{ _id: 'c', order: 3, mustReview: true }, { _id: 'a', order: 1, mustReview: true },
    { _id: 'b', order: 2, mustReview: true }, { _id: 'd', order: 4, mustReview: false }]
  const ids = (deferred) => reviewWalk(snaps, deferred).map((snap) => snap._id)
  assert.deepEqual(ids([]), ['a', 'b', 'c'])
  assert.deepEqual(ids(['b', 'a']), ['c', 'b', 'a'])
  assert.deepEqual(ids(['missing', 'd', 'b']), ['a', 'c', 'b'])
  assert.deepEqual(reviewWalk([], ['a']), [])
  assert.deepEqual(snaps.map((snap) => snap._id), ['c', 'a', 'b', 'd'])
  console.log('Review Queue walk checks passed (order, skips, resolved/deleted Snaps, empty queue).')
} finally { await server.close() }
