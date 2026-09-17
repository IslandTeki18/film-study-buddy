import { v } from 'convex/values'
import { attachedSnapIds } from './domain/diagram.ts'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
} from './_generated/server'

export const DELETION_RETENTION_MS = 24 * 60 * 60 * 1000

const softDeleteTables = [
  'seasons',
  'workspaces',
  'sourceGames',
  'templates',
  'templateSections',
  'templateFields',
  'snaps',
  'cellNotes',
  'quickNotes',
  'diagrams',
  'tendencies',
  'reports',
  'opponentPlayers',
  'playerNotes',
] as const

type SoftDeleteTable = (typeof softDeleteTables)[number]
type SoftDeleteRecord = {
  [Table in SoftDeleteTable]: { table: Table; id: Id<Table> }
}[SoftDeleteTable]

const isSoftDeleteTable = (value: string): value is SoftDeleteTable =>
  softDeleteTables.some((table) => table === value)

/** Called by delete mutations after the caller has collected its own cascade. */
export async function softDeleteBatch(
  ctx: MutationCtx,
  args: { kind: string; label: string; records: ReadonlyArray<SoftDeleteRecord> },
): Promise<string> {
  if (args.records.length === 0) throw new Error('A deletion batch requires at least one record')

  const batchId = crypto.randomUUID()
  const now = Date.now()
  const uniqueRecords = [...new Map(args.records.map((record) => [record.id, record])).values()]

  for (const record of uniqueRecords) {
    if (!isSoftDeleteTable(record.table)) throw new Error(`Table ${record.table} cannot be soft-deleted`)

    const id = ctx.db.normalizeId(record.table, record.id)
    if (id === null) throw new Error(`Invalid ${record.table} id`)
    const document = await ctx.db.get(record.table, id)
    if (document === null) throw new Error(`Unknown ${record.table} id`)
    if (document.deletedAt !== undefined || document.deleteBatchId !== undefined) {
      throw new Error(`${record.table} record is already soft-deleted`)
    }
  }

  for (const record of uniqueRecords) {
    await ctx.db.patch(record.table, record.id, { deletedAt: now, deleteBatchId: batchId })
  }

  await ctx.db.insert('deletions', { batchId, kind: args.kind, label: args.label, createdAt: now })
  return batchId
}

const deletionValidator = v.object({
  _id: v.id('deletions'),
  _creationTime: v.number(),
  batchId: v.string(),
  kind: v.string(),
  label: v.string(),
  createdAt: v.number(),
  undoneAt: v.optional(v.number()),
})

/** Returns active ledger entries still inside the 24-hour Undo window. */
export const listRecent = internalQuery({
  args: {},
  returns: v.array(deletionValidator),
  handler: async (ctx) => {
    const cutoff = Date.now() - DELETION_RETENTION_MS
    const rows = await ctx.db
      .query('deletions')
      .withIndex('by_createdAt', (query) => query.gte('createdAt', cutoff))
      .collect()
    return rows.filter((row) => row.undoneAt === undefined)
  },
})

async function restoreTable(ctx: MutationCtx, table: SoftDeleteTable, batchId: string) {
  if (table === 'diagrams') {
    const diagrams = await ctx.db
      .query('diagrams')
      .filter((query) => query.eq(query.field('deleteBatchId'), batchId))
      .collect()
    for (const diagram of diagrams) {
      const attached = await ctx.db.query('diagrams')
        .withIndex('by_sourceGame', (query) => query.eq('sourceGameId', diagram.sourceGameId)).collect()
      const occupied = new Set(attached.filter((other) => other._id !== diagram._id && other.deletedAt === undefined).flatMap(attachedSnapIds))
      await ctx.db.patch(diagram._id, {
        deletedAt: undefined, deleteBatchId: undefined,
        snapIds: attachedSnapIds(diagram).filter((id) => !occupied.has(id)), snapId: undefined,
      })
    }
    return
  }
  const records = await ctx.db
    .query(table)
    .filter((query) => query.eq(query.field('deleteBatchId'), batchId))
    .collect()
  for (const record of records) {
    // Convex 1.45 removes optional fields when patch receives undefined.
    await ctx.db.patch(record._id, { deletedAt: undefined, deleteBatchId: undefined })
  }
}

async function purgeTable(ctx: MutationCtx, table: SoftDeleteTable, batchId: string) {
  const records = await ctx.db
    .query(table)
    .filter((query) => query.eq(query.field('deleteBatchId'), batchId))
    .collect()
  for (const record of records) await ctx.db.delete(record._id)
}

/** Restores one active batch; unknown and already-undone batches are no-ops. */
export const undo = mutation({
  args: { batchId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deletion = await ctx.db
      .query('deletions')
      .withIndex('by_batchId', (query) => query.eq('batchId', args.batchId))
      .unique()
    if (deletion === null || deletion.undoneAt !== undefined) return null

    // ponytail: scans the fourteen soft-deletable tables per undo; add a by_deleteBatchId index per table if undo latency shows up.
    for (const table of softDeleteTables) await restoreTable(ctx, table, args.batchId)
    await ctx.db.patch(deletion._id, { undoneAt: Date.now() })
    return null
  },
})

/** Permanently removes expired active batches while preserving every undone batch. */
export const purgeExpired = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - DELETION_RETENTION_MS
    const deletions = await ctx.db
      .query('deletions')
      .withIndex('by_createdAt', (query) => query.lt('createdAt', cutoff))
      .collect()

    for (const deletion of deletions) {
      if (deletion.undoneAt !== undefined) continue
      if (deletion.createdAt >= cutoff) continue
      for (const table of softDeleteTables) await purgeTable(ctx, table, deletion.batchId)
      await ctx.db.delete(deletion._id)
    }

    const bulkEdits = await ctx.db.query('bulkEdits').collect()
    for (const edit of bulkEdits) {
      if (edit.createdAt < cutoff) await ctx.db.delete(edit._id)
    }
    return null
  },
})
