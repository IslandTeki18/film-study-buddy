import { v } from 'convex/values'
import { mutation, query, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { requireLiveSnap } from './snaps'
import { requireLiveSourceGame } from './sourceGames'
import { requireValidColumnSelection } from './templates'

const noteValidator = v.object({ ...schema.tables.cellNotes.validator.fields, _id: v.id('cellNotes'), _creationTime: v.number() })

async function isLiveGame(ctx: QueryCtx, sourceGameId: Id<'sourceGames'>): Promise<boolean> {
  const game = await ctx.db.get(sourceGameId)
  if (!game || game.deletedAt !== undefined) return false
  const workspace = await ctx.db.get(game.workspaceId)
  if (!workspace || workspace.deletedAt !== undefined) return false
  const season = await ctx.db.get(workspace.seasonId)
  return !!season && season.deletedAt === undefined
}

export const listCellNotesBySourceGame = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.array(noteValidator),
  handler: async (ctx, args) => {
    if (!await isLiveGame(ctx, args.sourceGameId)) return []
    return (await ctx.db.query('cellNotes').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).collect())
      .filter((note) => note.deletedAt === undefined)
  },
})

export const listCellNotes = query({
  args: { snapId: v.id('snaps') }, returns: v.array(noteValidator),
  handler: async (ctx, args) => {
    const snap = await ctx.db.get(args.snapId)
    if (!snap || snap.deletedAt !== undefined || !await isLiveGame(ctx, snap.sourceGameId)) return []
    return (await ctx.db.query('cellNotes').withIndex('by_snap', (q) => q.eq('snapId', args.snapId)).collect())
      .filter((note) => note.deletedAt === undefined)
  },
})

export const setCellNote = mutation({
  args: { snapId: v.id('snaps'), fieldKey: v.string(), text: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const snap = await requireLiveSnap(ctx, args.snapId)
    const game = await requireLiveSourceGame(ctx, snap.sourceGameId)
    await requireValidColumnSelection(ctx, game.templateId, [args.fieldKey], [args.fieldKey])
    const existing = (await ctx.db.query('cellNotes').withIndex('by_snap', (q) => q.eq('snapId', args.snapId)).collect())
      .find((note) => note.fieldKey === args.fieldKey && note.deletedAt === undefined)
    const text = args.text.trim()
    if (!text) { if (existing) await ctx.db.delete(existing._id) }
    else if (existing) await ctx.db.patch(existing._id, { text })
    else await ctx.db.insert('cellNotes', { snapId: snap._id, sourceGameId: snap.sourceGameId, fieldKey: args.fieldKey, text })
    return null
  },
})
