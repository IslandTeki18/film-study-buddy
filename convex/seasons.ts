import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import schema from './schema'
import { softDeleteBatch } from './deletions'
import { collectWorkspaceCascade } from './workspaces'
import { normalizeName } from './domain/names.ts'

export async function requireLiveSeason(
  ctx: QueryCtx | MutationCtx, id: Id<'seasons'>,
): Promise<Doc<'seasons'>> {
  const season = await ctx.db.get(id)
  if (!season || season.deletedAt !== undefined) throw new Error('Season not found')
  return season
}

function requireName(value: string): string {
  const name = normalizeName(value)
  if (name === null) throw new Error('Name must be 1–80 characters')
  return name
}

const seasonValidator = v.object({
  ...schema.tables.seasons.validator.fields,
  _id: v.id('seasons'), _creationTime: v.number(),
})

/** Deleted Seasons never appear in the picker. */
export const list = query({
  args: {}, returns: v.array(seasonValidator),
  handler: async (ctx) => (await ctx.db.query('seasons')
    .withIndex('by_deletedAt', (q) => q.eq('deletedAt', undefined)).collect())
    .sort((a, b) => b.createdAt - a.createdAt),
})

/** Creation leaves active Season selection to the caller. */
export const create = mutation({
  args: { name: v.string() }, returns: v.id('seasons'),
  handler: (ctx, args) => ctx.db.insert('seasons', {
    name: requireName(args.name), createdAt: Date.now(),
  }),
})

export const rename = mutation({
  args: { seasonId: v.id('seasons'), name: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveSeason(ctx, args.seasonId)
    await ctx.db.patch(args.seasonId, { name: requireName(args.name) })
    return null
  },
})

/** Archive is not deletion: archived Workspaces join the same Season batch. */
export const remove = mutation({
  args: { seasonId: v.id('seasons') }, returns: v.string(),
  handler: async (ctx, args) => {
    const season = await requireLiveSeason(ctx, args.seasonId)
    const records: Parameters<typeof softDeleteBatch>[1]['records'][number][] = [
      { table: 'seasons', id: args.seasonId },
    ]
    const workspaces = await ctx.db.query('workspaces')
      .withIndex('by_season', (q) => q.eq('seasonId', args.seasonId)).collect()
    for (const workspace of workspaces) {
      if (workspace.deletedAt === undefined) records.push(...await collectWorkspaceCascade(ctx, workspace._id))
    }
    return softDeleteBatch(ctx, { kind: 'season', label: season.name, records })
  },
})
