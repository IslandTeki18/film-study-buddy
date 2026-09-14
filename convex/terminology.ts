import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import schema from './schema'
import { builtInTerminology } from './domain/terminology.ts'
import { normalizeName } from './domain/names.ts'

const listValidator = schema.tables.terminology.validator.fields.list

export const list = query({
  args: {}, returns: v.array(v.object({ list: listValidator, value: v.string() })),
  handler: async (ctx) => (await ctx.db.query('terminology').collect()).map(({ list, value }) => ({ list, value })),
})

export const add = mutation({
  args: { list: listValidator, value: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const value = normalizeName(args.value)
    if (value === null) throw new Error('Terminology must be 1–80 characters')
    if (builtInTerminology(args.list).includes(value)) return null
    const existing = await ctx.db.query('terminology')
      .withIndex('by_list', (q) => q.eq('list', args.list).eq('value', value)).first()
    if (!existing) await ctx.db.insert('terminology', { list: args.list, value, createdAt: Date.now() })
    return null
  },
})
