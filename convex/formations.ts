import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { FORMATION_NAME_MAX_LENGTH, normalizeDiagram } from './domain/diagram.ts'
import schema from './schema'

const formationValidator = v.object({
  ...schema.tables.formations.validator.fields,
  _id: v.id('formations'), _creationTime: v.number(),
})

export const list = query({
  args: {}, returns: v.array(formationValidator),
  handler: async (ctx) => (await ctx.db.query('formations').collect()).sort((a, b) => a.createdAt - b.createdAt),
})

/** Saves the offensive alignment under a name; an existing name is replaced. */
export const save = mutation({
  args: { name: v.string(), players: schema.tables.formations.validator.fields.players }, returns: v.id('formations'),
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, FORMATION_NAME_MAX_LENGTH)
    if (!name) throw new Error('A formation needs a name')
    const players = normalizeDiagram({ players: args.players.filter((player) => player.side === 'offense'), shapes: [] }).players
    if (players.length === 0) throw new Error('Put at least one offensive player on the field first')
    const existing = await ctx.db.query('formations').withIndex('by_name', (q) => q.eq('name', name)).unique()
    if (existing) {
      await ctx.db.patch(existing._id, { players })
      return existing._id
    }
    return ctx.db.insert('formations', { name, players, createdAt: Date.now() })
  },
})

// ponytail: hard delete. Formations are presets, not charted film; add to the soft-delete ledger if Undo is ever asked for.
export const remove = mutation({
  args: { formationId: v.id('formations') }, returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.formationId)) await ctx.db.delete(args.formationId)
    return null
  },
})
