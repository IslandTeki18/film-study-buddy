import { v } from 'convex/values'
import { query } from './_generated/server'
import schema from './schema'

const snapValidator = v.object({
  ...schema.tables.snaps.validator.fields,
  _id: v.id('snaps'), _creationTime: v.number(),
})

export const listBySourceGame = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.array(snapValidator),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.sourceGameId)
    if (!game || game.deletedAt !== undefined) return []
    const workspace = await ctx.db.get(game.workspaceId)
    if (!workspace || workspace.deletedAt !== undefined) return []
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return []
    return (await ctx.db.query('snaps')
      .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).collect())
      .filter((snap) => snap.deletedAt === undefined)
  },
})
