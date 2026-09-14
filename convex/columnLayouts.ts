import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import schema from './schema'
import { requireLiveSourceGame } from './sourceGames'
import { requireValidColumnSelection } from './templates'

// Kept in sync with the renderer; convex must not import src.
const COLUMN_MIN_WIDTH = 40
const layoutValidator = v.object({
  ...schema.tables.columnLayouts.validator.fields,
  _id: v.id('columnLayouts'), _creationTime: v.number(),
})

export const get = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.union(layoutValidator, v.null()),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.sourceGameId)
    if (!game || game.deletedAt !== undefined) return null
    return ctx.db.query('columnLayouts').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).unique()
  },
})

export const save = mutation({
  args: {
    sourceGameId: v.id('sourceGames'), viewId: v.optional(v.id('templateViews')),
    visible: v.array(v.string()), order: v.array(v.string()), widths: v.record(v.string(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    await requireValidColumnSelection(ctx, game.templateId, args.order, args.visible)
    for (const [key, width] of Object.entries(args.widths)) {
      if (!args.order.includes(key) || !Number.isFinite(width) || width < COLUMN_MIN_WIDTH) throw new Error('Invalid column width')
    }
    if (args.viewId) {
      const view = await ctx.db.get(args.viewId)
      if (!view || view.templateId !== game.templateId) throw new Error('Play Log View not found in this template')
    }
    const existing = await ctx.db.query('columnLayouts').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).unique()
    if (existing) await ctx.db.patch(existing._id, { ...args, viewId: args.viewId })
    else await ctx.db.insert('columnLayouts', args)
    return null
  },
})
