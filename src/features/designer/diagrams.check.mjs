import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'

process.loadEnvFile('.env.local')
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL)
const sourceGameId = process.argv[2]
assert(sourceGameId, 'Usage: node src/features/designer/diagrams.check.mjs <Source Game ID>')

const snapId = await client.mutation('snaps:create', { sourceGameId })
const diagrams = []
try {
  const olderId = await client.mutation('diagrams:create', { sourceGameId, snapId })
  diagrams.push(olderId)
  const batchId = await client.mutation('diagrams:remove', { diagramId: olderId })
  const replacementId = await client.mutation('diagrams:create', { sourceGameId, snapId })
  diagrams.push(replacementId)

  await client.mutation('deletions:undo', { batchId })
  const [older, replacement] = await Promise.all(diagrams.map((diagramId) =>
    client.query('diagrams:get', { diagramId })))
  assert.equal(older.snapId, undefined)
  assert.equal(replacement.snapId, snapId)
  assert.equal((await client.query('diagrams:listBySourceGame', { sourceGameId }))
    .filter((diagram) => diagram.snapId === snapId).length, 1)
  console.log('PASS: Undo preserves the replacement attachment and restores the older diagram unattached')
} finally {
  for (const diagramId of diagrams) {
    if (await client.query('diagrams:get', { diagramId })) {
      await client.mutation('diagrams:remove', { diagramId })
    }
  }
  await client.mutation('snaps:remove', { snapId })
}
