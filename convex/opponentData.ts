import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { groupingFieldsFor, type TemplateFieldLike } from './domain/aggregate.ts'
import { isIncluded } from './sourceGames'
import { templateTree } from './templates'

async function loadScope(ctx: QueryCtx, workspaceId: Id<'workspaces'>) {
  const workspace = await ctx.db.get(workspaceId)
  const season = workspace && workspace.deletedAt === undefined ? await ctx.db.get(workspace.seasonId) : null
  if (!season || season.deletedAt !== undefined) return null
  const games = (await ctx.db.query('sourceGames').withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect())
    .filter((game) => game.deletedAt === undefined && isIncluded(game)).sort((a, b) => b.createdAt - a.createdAt)
  const templateFields = new Map<Id<'sourceGames'>, TemplateFieldLike[]>()
  const snaps: Doc<'snaps'>[] = []
  // ponytail: V1 scans included games' Snaps; use denormalized counters if query latency grows.
  for (const game of games) {
    const template = await ctx.db.get(game.templateId)
    templateFields.set(game._id, template && template.deletedAt === undefined
      ? (await templateTree(ctx, template._id)).flatMap((section) => section.fields) : [])
    snaps.push(...(await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect())
      .filter((snap) => snap.deletedAt === undefined))
  }
  return { games, templateFields, snaps }
}

export const listGroupingFields = query({
  args: { workspaceId: v.string() }, returns: v.array(v.object({ key: v.string(), label: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    const scope = id ? await loadScope(ctx, id) : null
    return scope ? groupingFieldsFor([...scope.templateFields.values()]).map(({ key, label }) => ({ key, label })) : []
  },
})
