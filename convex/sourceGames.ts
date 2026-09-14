import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import schema from './schema'
import { normalizeName } from './domain/names.ts'
import { collectSourceGameCascade, requireLiveWorkspace } from './workspaces'
import { softDeleteBatch } from './deletions'

export async function requireLiveSourceGame(
  ctx: QueryCtx | MutationCtx, id: Id<'sourceGames'>,
): Promise<Doc<'sourceGames'>> {
  const game = await ctx.db.get(id)
  if (!game || game.deletedAt !== undefined) throw new Error('Source Game not found')
  await requireLiveWorkspace(ctx, game.workspaceId)
  return game
}

function requireLabel(value: string): string {
  const label = normalizeName(value)
  if (label === null) throw new Error('Label must be 1–80 characters')
  return label
}

const sourceGameValidator = v.object({
  ...schema.tables.sourceGames.validator.fields,
  _id: v.id('sourceGames'), _creationTime: v.number(),
})

export const listByWorkspace = query({
  args: { workspaceId: v.string() },
  returns: v.array(v.object({
    ...sourceGameValidator.fields, templateName: v.string(), snapCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    if (!id) return []
    const workspace = await ctx.db.get(id)
    if (!workspace || workspace.deletedAt !== undefined) return []
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return []
    const games = (await ctx.db.query('sourceGames')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((game) => game.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt)
    // ponytail: per-game Snap scans fit V1 volume; use aggregate counters if query latency shows up.
    return Promise.all(games.map(async (game) => {
      const template = await ctx.db.get(game.templateId)
      const snaps = await ctx.db.query('snaps')
        .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect()
      return {
        ...game,
        templateName: template && template.deletedAt === undefined ? template.name : 'Coaching Template not found',
        snapCount: snaps.filter((snap) => snap.deletedAt === undefined).length,
      }
    }))
  },
})

export const get = query({
  args: { sourceGameId: v.string() }, returns: v.union(sourceGameValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('sourceGames', args.sourceGameId)
    if (!id) return null
    const game = await ctx.db.get(id)
    if (!game || game.deletedAt !== undefined) return null
    const workspace = await ctx.db.get(game.workspaceId)
    if (!workspace || workspace.deletedAt !== undefined) return null
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return null
    return game
  },
})

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), label: v.string(), templateId: v.id('templates') },
  returns: v.id('sourceGames'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    const template = await ctx.db.get(args.templateId)
    if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
    return ctx.db.insert('sourceGames', {
      workspaceId: args.workspaceId, label: requireLabel(args.label),
      templateId: args.templateId, createdAt: Date.now(),
    })
  },
})

export const rename = mutation({
  args: { sourceGameId: v.id('sourceGames'), label: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveSourceGame(ctx, args.sourceGameId)
    await ctx.db.patch(args.sourceGameId, { label: requireLabel(args.label) })
    return null
  },
})

export const remove = mutation({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.string(),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    return softDeleteBatch(ctx, {
      kind: 'sourceGame', label: game.label,
      records: await collectSourceGameCascade(ctx, args.sourceGameId),
    })
  },
})
