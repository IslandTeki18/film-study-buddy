import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { aggregate as aggregateSnaps, groupingFieldsFor, groupingValuesOf, templateGroupingKey, type TemplateFieldLike } from './domain/aggregate.ts'
import { isIncluded } from './sourceGames'
import { templateTree } from './templates'
import schema from './schema'

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

export async function computeResult(ctx: QueryCtx, args: { workspaceId: Id<'workspaces'>; groupBy: string; groupBy2?: string }) {
  const scope = await loadScope(ctx, args.workspaceId)
  if (!scope || args.groupBy === args.groupBy2) return null
  const catalog = groupingFieldsFor([...scope.templateFields.values()])
  const keys = args.groupBy2 === undefined ? [args.groupBy] : [args.groupBy, args.groupBy2]
  const fields = keys.map((key) => catalog.find((field) => field.key === key))
  if (fields.some((field) => !field)) return null
  const selected = fields.filter((field) => field !== undefined)
  const matches = new Map(scope.games.map((game) => [game._id, selected.map((field) =>
    scope.templateFields.get(game._id)?.find((candidate) => templateGroupingKey(candidate) === field.key)?._id)]))
  return {
    gameIds: scope.games.map((game) => game._id), groupLabels: selected.map((field) => field.label),
    result: aggregateSnaps(scope.snaps.map((snap) => ({
      levels: selected.map((field, index) => groupingValuesOf(snap, field, matches.get(snap.sourceGameId)?.[index])),
      yards: snap.core.yards,
    }))),
  }
}

export const aggregate = query({
  args: { workspaceId: v.string(), groupBy: v.string(), groupBy2: v.optional(v.string()) },
  returns: v.union(v.null(), v.object({
    gameIds: v.array(v.id('sourceGames')), groupLabels: v.array(v.string()), totalSnaps: v.number(),
    overlapping: v.boolean(), rows: schema.tables.tendencies.validator.fields.snapshot.fields.rows,
  })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    const computed = id ? await computeResult(ctx, { ...args, workspaceId: id }) : null
    return computed ? { gameIds: computed.gameIds, groupLabels: computed.groupLabels, ...computed.result } : null
  },
})
