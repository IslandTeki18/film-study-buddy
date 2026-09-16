import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'

process.loadEnvFile('.env.local')
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL)
const sourceGameId = process.argv[2]
assert(sourceGameId, 'Usage: node src/features/designer/diagrams.check.mjs <Source Game ID>')

const snaps = []
const diagrams = []
try {
  for (let i = 0; i < 2; i++) snaps.push(await client.mutation('snaps:create', { sourceGameId }))
  const [snapA, snapB] = snaps
  const diagramId = await client.mutation('diagrams:create', { sourceGameId, snapId: snapA })
  diagrams.push(diagramId)
  const get = () => client.query('diagrams:get', { diagramId })
  await client.mutation('diagrams:attach', { diagramId, snapId: snapB })
  await client.mutation('diagrams:attach', { diagramId, snapId: snapB })
  assert.deepEqual((await get()).snapIds, snaps)
  assert.equal((await get()).snapId, undefined)
  assert.equal((await client.query('diagrams:getBySnap', { snapId: snapB }))._id, diagramId)
  await assert.rejects(client.mutation('diagrams:create', { sourceGameId, snapId: snapB }), /This Snap already has a Play Diagram/)

  await client.mutation('diagrams:detach', { diagramId, snapId: snapA })
  await client.mutation('diagrams:detach', { diagramId, snapId: snapA })
  assert.deepEqual((await get()).snapIds, [snapB])
  await client.mutation('diagrams:attach', { diagramId, snapId: snapA })
  const snapBatch = await client.mutation('snaps:remove', { snapId: snapA })
  assert.deepEqual((await get()).snapIds, [snapB])
  await client.mutation('deletions:undo', { batchId: snapBatch })
  assert.deepEqual((await get()).snapIds, [snapB])
  assert.equal(await client.query('diagrams:getBySnap', { snapId: snapA }), null)

  let batchId = await client.mutation('diagrams:remove', { diagramId })
  await client.mutation('deletions:undo', { batchId })
  assert.deepEqual((await get()).snapIds, [snapB])
  await client.mutation('diagrams:attach', { diagramId, snapId: snapA })
  batchId = await client.mutation('diagrams:remove', { diagramId })
  const replacementId = await client.mutation('diagrams:create', { sourceGameId, snapId: snapA })
  diagrams.push(replacementId)
  await client.mutation('deletions:undo', { batchId })
  assert.deepEqual((await get()).snapIds, [snapB])
  assert.deepEqual((await client.query('diagrams:get', { diagramId: replacementId })).snapIds, [snapA])
  await assert.rejects(client.mutation('diagrams:attach', { diagramId, snapId: snapA }), /This Snap already has a Play Diagram/)
  assert.deepEqual((await get()).snapIds, [snapB])

  batchId = await client.mutation('snaps:remove', { snapId: snapB })
  assert.equal(await get(), null)
  await client.mutation('deletions:undo', { batchId })
  assert.deepEqual((await get()).snapIds, [snapB])
  console.log('PASS: shared attachments, uniqueness, idempotent attach/detach, shared and sole Snap deletion, Undo and partial attachment conflicts')
} finally {
  for (const diagramId of diagrams) {
    if (await client.query('diagrams:get', { diagramId })) {
      await client.mutation('diagrams:remove', { diagramId })
    }
  }
  for (const snapId of snaps) {
    if (await client.query('snaps:get', { snapId })) await client.mutation('snaps:remove', { snapId })
  }
}
