import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import { softDeleteBatch } from './deletions'
import { normalizeDiagram } from './domain/diagram.ts'
import schema from './schema'
import { requireLiveSnap } from './snaps'
import { isLiveSourceGame, requireLiveSourceGame } from './sourceGames'

const diagramValidator = v.object({
  ...schema.tables.diagrams.validator.fields,
  _id: v.id('diagrams'), _creationTime: v.number(),
})

async function requireLiveDiagram(ctx: MutationCtx, id: Id<'diagrams'>): Promise<Doc<'diagrams'>> {
  const diagram = await ctx.db.get(id)
  if (!diagram || diagram.deletedAt !== undefined) throw new Error('Play Diagram not found')
  await requireLiveSourceGame(ctx, diagram.sourceGameId)
  return diagram
}

async function hasLiveDiagramForSnap(ctx: MutationCtx, snapId: Id<'snaps'>, exceptId?: Id<'diagrams'>): Promise<boolean> {
  const diagrams = await ctx.db.query('diagrams').withIndex('by_snap', (q) => q.eq('snapId', snapId)).collect()
  return diagrams.some((diagram) => diagram.deletedAt === undefined && diagram._id !== exceptId)
}

export const listBySourceGame = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.array(diagramValidator),
  handler: async (ctx, args) => {
    if (!await isLiveSourceGame(ctx, args.sourceGameId)) return []
    return (await ctx.db.query('diagrams').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).collect())
      .filter((diagram) => diagram.deletedAt === undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const get = query({
  args: { diagramId: v.string() }, returns: v.union(diagramValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('diagrams', args.diagramId)
    const diagram = id ? await ctx.db.get(id) : null
    if (!diagram || diagram.deletedAt !== undefined || !await isLiveSourceGame(ctx, diagram.sourceGameId)) return null
    return diagram
  },
})

export const getBySnap = query({
  args: { snapId: v.id('snaps') }, returns: v.union(diagramValidator, v.null()),
  handler: async (ctx, args) => {
    const snap = await ctx.db.get(args.snapId)
    if (!snap || snap.deletedAt !== undefined || !await isLiveSourceGame(ctx, snap.sourceGameId)) return null
    return (await ctx.db.query('diagrams').withIndex('by_snap', (q) => q.eq('snapId', args.snapId)).collect())
      .find((diagram) => diagram.deletedAt === undefined) ?? null
  },
})

export const create = mutation({
  args: { sourceGameId: v.id('sourceGames'), snapId: v.optional(v.id('snaps')) }, returns: v.id('diagrams'),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    if (args.snapId) {
      const snap = await requireLiveSnap(ctx, args.snapId)
      if (snap.sourceGameId !== game._id) throw new Error('Snap belongs to a different Source Game')
      if (await hasLiveDiagramForSnap(ctx, snap._id)) throw new Error('This Snap already has a Play Diagram')
    }
    return ctx.db.insert('diagrams', {
      sourceGameId: game._id, ...(args.snapId ? { snapId: args.snapId } : {}),
      players: [], shapes: [], updatedAt: Date.now(),
    })
  },
})

export const save = mutation({
  args: {
    diagramId: v.id('diagrams'),
    players: schema.tables.diagrams.validator.fields.players,
    shapes: schema.tables.diagrams.validator.fields.shapes,
    note: v.optional(v.string()),
    hiddenSide: schema.tables.diagrams.validator.fields.hiddenSide,
  }, returns: v.null(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    const normalized = normalizeDiagram({
      players: args.players, shapes: args.shapes, ...(args.note !== undefined ? { note: args.note } : {}),
      ...(args.hiddenSide !== undefined ? { hiddenSide: args.hiddenSide } : {}),
    })
    await ctx.db.patch(diagram._id, {
      players: normalized.players, shapes: normalized.shapes, note: normalized.note, hiddenSide: normalized.hiddenSide, updatedAt: Date.now(),
    })
    return null
  },
})

export const attach = mutation({
  args: { diagramId: v.id('diagrams'), snapId: v.union(v.id('snaps'), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    if (args.snapId) {
      const snap = await requireLiveSnap(ctx, args.snapId)
      if (snap.sourceGameId !== diagram.sourceGameId) throw new Error('Snap belongs to a different Source Game')
      if (await hasLiveDiagramForSnap(ctx, snap._id, diagram._id)) throw new Error('This Snap already has a Play Diagram')
    }
    await ctx.db.patch(diagram._id, { snapId: args.snapId ?? undefined, updatedAt: Date.now() })
    return null
  },
})

export const remove = mutation({
  args: { diagramId: v.id('diagrams') }, returns: v.string(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    return softDeleteBatch(ctx, { kind: 'diagram', label: 'Play Diagram', records: [{ table: 'diagrams', id: diagram._id }] })
  },
})
