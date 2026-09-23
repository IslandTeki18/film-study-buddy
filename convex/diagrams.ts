import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { softDeleteBatch } from './deletions'
import { attachedSnapIds, normalizeDiagram } from './domain/diagram.ts'
import schema from './schema'
import { requireLiveSnap } from './snaps'
import { isLiveSourceGame, requireLiveSourceGame } from './sourceGames'
import { requireLiveWorkspace } from './workspaces'

const diagramValidator = v.object({
  ...schema.tables.diagrams.validator.fields,
  _id: v.id('diagrams'), _creationTime: v.number(),
})

async function requireLiveDiagram(ctx: MutationCtx, id: Id<'diagrams'>): Promise<Doc<'diagrams'>> {
  const diagram = await ctx.db.get(id)
  if (!diagram || diagram.deletedAt !== undefined) throw new Error('Play Diagram not found')
  await requireLiveWorkspace(ctx, diagram.workspaceId)
  return diagram
}

async function isLiveWorkspace(ctx: QueryCtx, id: Id<'workspaces'>): Promise<boolean> {
  const workspace = await ctx.db.get(id)
  if (!workspace || workspace.deletedAt !== undefined) return false
  const season = await ctx.db.get(workspace.seasonId)
  return !!season && season.deletedAt === undefined
}

// ponytail: scans the Workspace's diagrams per check; add a snapIds lookup table if Workspace diagram counts grow past V1 volume.
async function hasLiveDiagramForSnap(ctx: MutationCtx, workspaceId: Id<'workspaces'>, snapId: Id<'snaps'>, exceptId?: Id<'diagrams'>): Promise<boolean> {
  const diagrams = await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect()
  return diagrams.some((diagram) => diagram.deletedAt === undefined && diagram._id !== exceptId && attachedSnapIds(diagram).includes(snapId))
}

export async function diagramsOrphanedBy(
  ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, snapIds: ReadonlySet<Id<'snaps'>>,
): Promise<Doc<'diagrams'>[]> {
  const diagrams = await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect()
  const orphaned = []
  for (const diagram of diagrams) {
    if (diagram.deletedAt !== undefined) continue
    const liveSnapIds = []
    for (const snapId of attachedSnapIds(diagram)) {
      const snap = await ctx.db.get(snapId)
      if (snap && snap.deletedAt === undefined && await isLiveSourceGame(ctx, snap.sourceGameId)) liveSnapIds.push(snapId)
    }
    if (liveSnapIds.length > 0 && liveSnapIds.every((snapId) => snapIds.has(snapId))) orphaned.push(diagram)
  }
  return orphaned
}

export const countOrphanedBy = query({
  args: { snapIds: v.array(v.id('snaps')) }, returns: v.number(),
  handler: async (ctx, args) => {
    let workspaceId: Id<'workspaces'> | undefined
    const liveSnapIds = new Set<Id<'snaps'>>()
    for (const snapId of args.snapIds) {
      const snap = await ctx.db.get(snapId)
      if (!snap || snap.deletedAt !== undefined || !await isLiveSourceGame(ctx, snap.sourceGameId)) continue
      const game = await ctx.db.get(snap.sourceGameId)
      if (!game) continue
      if (workspaceId && game.workspaceId !== workspaceId) throw new Error('Snap belongs to a different Weekly Opponent Workspace')
      workspaceId = game.workspaceId
      liveSnapIds.add(snapId)
    }
    return workspaceId ? (await diagramsOrphanedBy(ctx, workspaceId, liveSnapIds)).length : 0
  },
})

export const get = query({
  args: { diagramId: v.string() }, returns: v.union(diagramValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('diagrams', args.diagramId)
    const diagram = id ? await ctx.db.get(id) : null
    if (!diagram || diagram.deletedAt !== undefined || !await isLiveWorkspace(ctx, diagram.workspaceId)) return null
    return diagram
  },
})

export const getBySnap = query({
  args: { snapId: v.id('snaps') }, returns: v.union(diagramValidator, v.null()),
  handler: async (ctx, args) => {
    const snap = await ctx.db.get(args.snapId)
    if (!snap || snap.deletedAt !== undefined) return null
    const game = await ctx.db.get(snap.sourceGameId)
    if (!game || game.deletedAt !== undefined || !await isLiveWorkspace(ctx, game.workspaceId)) return null
    return (await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', game.workspaceId)).collect())
      .find((diagram) => diagram.deletedAt === undefined && attachedSnapIds(diagram).includes(args.snapId)) ?? null
  },
})

export const create = mutation({
  args: { sourceGameId: v.id('sourceGames'), snapId: v.optional(v.id('snaps')) }, returns: v.id('diagrams'),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    if (args.snapId) {
      const snap = await requireLiveSnap(ctx, args.snapId)
      const snapGame = await requireLiveSourceGame(ctx, snap.sourceGameId)
      if (snapGame.workspaceId !== game.workspaceId) throw new Error('Snap belongs to a different Weekly Opponent Workspace')
      if (await hasLiveDiagramForSnap(ctx, game.workspaceId, snap._id)) throw new Error('This Snap already has a Play Diagram')
    }
    return ctx.db.insert('diagrams', {
      sourceGameId: game._id, workspaceId: game.workspaceId, snapIds: args.snapId ? [args.snapId] : [],
      players: [], shapes: [], updatedAt: Date.now(),
    })
  },
})

// ponytail: one-off backfill for workspace-shared diagrams; delete after every deployment reports patched=0.
export const backfillWorkspaceId = internalMutation({
  args: {}, returns: v.object({ patched: v.number(), orphaned: v.number() }),
  handler: async (ctx) => {
    let patched = 0
    let orphaned = 0
    for (const diagram of await ctx.db.query('diagrams').collect()) {
      if (diagram.workspaceId !== undefined) continue
      const game = await ctx.db.get(diagram.sourceGameId)
      if (!game) orphaned += 1
      else {
        await ctx.db.patch(diagram._id, { workspaceId: game.workspaceId })
        patched += 1
      }
    }
    return { patched, orphaned }
  },
})

export const save = mutation({
  args: {
    diagramId: v.id('diagrams'),
    players: schema.tables.diagrams.validator.fields.players,
    shapes: schema.tables.diagrams.validator.fields.shapes,
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    hiddenSide: schema.tables.diagrams.validator.fields.hiddenSide,
  }, returns: v.null(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    const normalized = normalizeDiagram({
      players: args.players, shapes: args.shapes, ...(args.name !== undefined ? { name: args.name } : {}), ...(args.note !== undefined ? { note: args.note } : {}),
      ...(args.hiddenSide !== undefined ? { hiddenSide: args.hiddenSide } : {}),
    })
    await ctx.db.patch(diagram._id, {
      snapIds: attachedSnapIds(diagram), snapId: undefined,
      players: normalized.players, shapes: normalized.shapes, ...(args.name !== undefined ? { name: normalized.name } : {}), note: normalized.note, hiddenSide: normalized.hiddenSide, updatedAt: Date.now(),
    })
    return null
  },
})

export const attach = mutation({
  args: { diagramId: v.id('diagrams'), snapId: v.id('snaps') }, returns: v.null(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    const snap = await requireLiveSnap(ctx, args.snapId)
    const game = await requireLiveSourceGame(ctx, snap.sourceGameId)
    if (game.workspaceId !== diagram.workspaceId) throw new Error('Snap belongs to a different Weekly Opponent Workspace')
    if (await hasLiveDiagramForSnap(ctx, game.workspaceId, snap._id, diagram._id)) throw new Error('This Snap already has a Play Diagram')
    await ctx.db.patch(diagram._id, {
      snapIds: [...new Set([...attachedSnapIds(diagram), snap._id])], snapId: undefined, updatedAt: Date.now(),
    })
    return null
  },
})

export const detach = mutation({
  args: { diagramId: v.id('diagrams'), snapId: v.id('snaps') }, returns: v.null(),
  handler: async (ctx, args) => {
    const diagram = await requireLiveDiagram(ctx, args.diagramId)
    await ctx.db.patch(diagram._id, {
      snapIds: attachedSnapIds(diagram).filter((id) => id !== args.snapId), snapId: undefined, updatedAt: Date.now(),
    })
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

export const listByWorkspace = query({
  args: { workspaceId: v.string() },
  returns: v.array(v.object({
    ...diagramValidator.fields,
    sourceGameLabel: v.string(),
    attachedSnaps: v.array(v.object({
      snapId: v.id('snaps'), sourceGameId: v.id('sourceGames'), sourceGameLabel: v.string(), clipLabel: v.string(),
    })),
  })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    if (!id || !await isLiveWorkspace(ctx, id)) return []
    const games = new Map<Id<'sourceGames'>, Doc<'sourceGames'> | null>()
    const gameFor = async (gameId: Id<'sourceGames'>): Promise<Doc<'sourceGames'> | null> => {
      if (!games.has(gameId)) games.set(gameId, await ctx.db.get(gameId))
      return games.get(gameId) ?? null
    }
    const diagrams = (await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((diagram) => diagram.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
    return Promise.all(diagrams.map(async (diagram) => {
      const origin = await gameFor(diagram.sourceGameId)
      const attachedSnaps = []
      for (const snapId of attachedSnapIds(diagram)) {
        const snap = await ctx.db.get(snapId)
        if (!snap || snap.deletedAt !== undefined) continue
        const game = await gameFor(snap.sourceGameId)
        if (!game || game.deletedAt !== undefined) continue
        attachedSnaps.push({ snapId, sourceGameId: game._id, sourceGameLabel: game.label, clipLabel: String(snap.core.clipNumber ?? snap.order) })
      }
      return { ...diagram, sourceGameLabel: origin && origin.deletedAt === undefined ? origin.label : '', attachedSnaps }
    }))
  },
})
