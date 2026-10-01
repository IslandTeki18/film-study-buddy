import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import schema from './schema'
import { builtInTerminology, effectiveTerminology, type TerminologyList } from './domain/terminology.ts'
import { normalizeName } from './domain/names.ts'

const listValidator = schema.tables.terminology.validator.fields.list

function requireValue(raw: string): string {
  const value = normalizeName(raw)
  if (value === null) throw new Error('Terminology must be 1–80 characters')
  return value
}
async function rowFor(ctx: MutationCtx, list: TerminologyList, value: string): Promise<Doc<'terminology'> | null> {
  return ctx.db.query('terminology').withIndex('by_list', (q) => q.eq('list', list).eq('value', value)).first()
}
async function show(ctx: MutationCtx, list: TerminologyList, value: string): Promise<void> {
  const row = await rowFor(ctx, list, value)
  if (row) { if (row.hidden) await ctx.db.patch(row._id, { hidden: false }) }
  else if (!builtInTerminology(list).includes(value)) await ctx.db.insert('terminology', { list, value, createdAt: Date.now() })
}
async function hide(ctx: MutationCtx, list: TerminologyList, value: string): Promise<void> {
  const row = await rowFor(ctx, list, value)
  // A hidden row, not a delete, so a later Hudl import does not bring the value back.
  if (row) await ctx.db.patch(row._id, { hidden: true })
  else await ctx.db.insert('terminology', { list, value, createdAt: Date.now(), hidden: true })
}

export const list = query({
  args: {}, returns: v.array(v.object({ list: listValidator, value: v.string(), builtIn: v.boolean() })),
  handler: async (ctx) => effectiveTerminology(await ctx.db.query('terminology').collect()),
})

export const add = mutation({
  args: { list: listValidator, value: v.string() }, returns: v.null(),
  handler: async (ctx, args) => { await show(ctx, args.list, requireValue(args.value)); return null },
})

/** Removes a value from the pick list only. Snaps keep the value they already have. */
export const remove = mutation({
  args: { list: listValidator, value: v.string() }, returns: v.null(),
  handler: async (ctx, args) => { await hide(ctx, args.list, requireValue(args.value)); return null },
})

/** Renames a pick-list value only. Snaps keep the value they already have. */
export const rename = mutation({
  args: { list: listValidator, from: v.string(), to: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const from = requireValue(args.from)
    const to = requireValue(args.to)
    if (from === to) return null
    await hide(ctx, args.list, from)
    await show(ctx, args.list, to)
    return null
  },
})
