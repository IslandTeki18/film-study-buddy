import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'

process.loadEnvFile('.env.local')
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL)
const sourceGameId = process.argv[2]
assert(sourceGameId, 'Usage: node src/features/notes/quick-notes.check.mjs <Source Game ID>')
const snapId = await client.mutation('snaps:create', { sourceGameId })
let snapBatch
try {
  const quickNoteId = await client.mutation('notes:createQuickNote', {
    sourceGameId, snapId, text: 'Quick Note liveness regression check', tags: [],
  })
  const batchId = await client.mutation('notes:removeQuickNote', { quickNoteId })
  snapBatch = await client.mutation('snaps:remove', { snapId })
  await client.mutation('deletions:undo', { batchId })
  const visible = async () => (await client.query('notes:listQuickNotes', { sourceGameId }))
    .some((note) => note._id === quickNoteId)
  assert.equal(await visible(), false)
  await assert.rejects(client.mutation('notes:updateQuickNote', { quickNoteId, text: 'Changed', tags: [] }), /Snap not found/)
  await assert.rejects(client.mutation('notes:removeQuickNote', { quickNoteId }), /Snap not found/)
  await client.mutation('deletions:undo', { batchId: snapBatch })
  snapBatch = undefined
  assert.equal(await visible(), true)
  await client.mutation('notes:updateQuickNote', { quickNoteId, text: 'Restored', tags: [] })
  console.log('PASS: Quick Notes follow linked Snap liveness across independent Undo batches')
} finally {
  if (snapBatch) await client.mutation('deletions:undo', { batchId: snapBatch })
  await client.mutation('snaps:remove', { snapId })
}
