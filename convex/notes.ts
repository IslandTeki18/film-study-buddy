import { softDeleteBatch } from './deletions'
import { normalizeQuickNoteTags, QUICK_NOTE_TEXT_MAX_LENGTH } from './domain/quickNoteTags.ts'
import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
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

const quickNoteValidator = v.object({ ...schema.tables.quickNotes.validator.fields, _id: v.id('quickNotes'), _creationTime: v.number() })

function requireNoteText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('A Quick Note needs text')
  if (trimmed.length > QUICK_NOTE_TEXT_MAX_LENGTH) throw new Error(`A Quick Note is at most ${QUICK_NOTE_TEXT_MAX_LENGTH} characters`)
  return trimmed
}

async function requireLiveQuickNote(ctx: MutationCtx, id: Id<'quickNotes'>): Promise<Doc<'quickNotes'>> {
  const note = await ctx.db.get(id)
  if (!note || note.deletedAt !== undefined) throw new Error('Quick Note not found')
  await requireLiveSourceGame(ctx, note.sourceGameId)
  return note
}

export const listQuickNotes = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.array(quickNoteValidator),
  handler: async (ctx, args) => {
    if (!await isLiveGame(ctx, args.sourceGameId)) return []
    return (await ctx.db.query('quickNotes').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).collect())
      .filter((note) => note.deletedAt === undefined)
      .sort((a, b) => a.createdAt - b.createdAt)
  },
})

export const createQuickNote = mutation({
  args: { sourceGameId: v.id('sourceGames'), snapId: v.optional(v.id('snaps')), text: v.string(), tags: v.array(v.string()) },
  returns: v.id('quickNotes'),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    if (args.snapId) {
      const snap = await requireLiveSnap(ctx, args.snapId)
      if (snap.sourceGameId !== game._id) throw new Error('Snap belongs to a different Source Game')
    }
    return await ctx.db.insert('quickNotes', {
      sourceGameId: game._id, snapId: args.snapId, text: requireNoteText(args.text),
      tags: normalizeQuickNoteTags(args.tags), createdAt: Date.now(),
    })
  },
})

export const updateQuickNote = mutation({
  args: { quickNoteId: v.id('quickNotes'), text: v.string(), tags: v.array(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const note = await requireLiveQuickNote(ctx, args.quickNoteId)
    await ctx.db.patch(note._id, { text: requireNoteText(args.text), tags: normalizeQuickNoteTags(args.tags) })
    return null
  },
})

export const removeQuickNote = mutation({
  args: { quickNoteId: v.id('quickNotes') }, returns: v.string(),
  handler: async (ctx, args) => {
    const note = await requireLiveQuickNote(ctx, args.quickNoteId)
    return await softDeleteBatch(ctx, { kind: 'quickNote', label: 'Quick Note', records: [{ table: 'quickNotes', id: note._id }] })
  },
})
