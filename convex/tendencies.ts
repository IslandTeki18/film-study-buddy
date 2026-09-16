import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { normalizeName } from './domain/names.ts'
import { categoryVocabulary, normalizeCategoryName, resolveCategory, TENDENCY_NOTE_MAX_LENGTH } from './domain/tendencyCategories.ts'
import { computeResult } from './opponentData'
import schema from './schema'
import { requireLiveWorkspace } from './workspaces'
import { isLiveSourceGame } from './sourceGames'
import { softDeleteBatch } from './deletions'

const tendencyValidator = v.object({ ...schema.tables.tendencies.validator.fields, _id: v.id('tendencies'), _creationTime: v.number() })

function requireTitle(value: string): string {
  const title = normalizeName(value)
  if (!title) throw new Error('Title must be 1–80 characters')
  return title
}
function requireNote(value: string): string {
  const note = value.trim()
  if (note.length > TENDENCY_NOTE_MAX_LENGTH) throw new Error(`Coach explanation must be at most ${TENDENCY_NOTE_MAX_LENGTH} characters`)
  return note
}
async function vocabulary(ctx: QueryCtx): Promise<string[]> {
  return categoryVocabulary((await ctx.db.query('tendencyCategories').collect()).map((row) => row.name))
}
async function requireCategory(ctx: QueryCtx, value: string): Promise<string> {
  const category = resolveCategory(await vocabulary(ctx), value)
  if (!category) throw new Error('Unknown category')
  return category
}

export const listByWorkspace = query({
  args: { workspaceId: v.string() }, returns: v.array(tendencyValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    const workspace = id ? await ctx.db.get(id) : null
    if (!workspace || workspace.deletedAt !== undefined) return []
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return []
    return (await ctx.db.query('tendencies').withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id)).collect())
      .filter((tendency) => tendency.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt)
  },
})
export const listCategories = query({ args: {}, returns: v.array(v.string()), handler: vocabulary })

export const create = mutation({
  args: {
    workspaceId: v.id('workspaces'), groupBy: v.string(), groupBy2: v.optional(v.string()),
    values: v.array(v.string()), title: v.string(), category: v.string(), note: v.string(),
  }, returns: v.id('tendencies'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    const title = requireTitle(args.title)
    const note = requireNote(args.note)
    const category = await requireCategory(ctx, args.category)
    const computed = await computeResult(ctx, args)
    if (!computed) throw new Error('Grouping Field not available')
    const row = computed.result.rows.find((row) => row.values.length === args.values.length && row.values.every((value, index) => value === args.values[index]))
    if (!row) throw new Error('That result changed. Review the updated table and try again.')
    return ctx.db.insert('tendencies', {
      workspaceId: args.workspaceId, title, note, category, includeInReport: true, createdAt: Date.now(),
      snapshot: { gameIds: computed.gameIds, groupBy: computed.groupLabels[0]!, ...(computed.groupLabels[1] ? { groupBy2: computed.groupLabels[1] } : {}), rows: [row] },
    })
  },
})

async function requireLiveTendency(ctx: MutationCtx, id: Id<'tendencies'>): Promise<Doc<'tendencies'>> {
  const tendency = await ctx.db.get(id)
  if (!tendency || tendency.deletedAt !== undefined) throw new Error('Tendency / Alert not found')
  await requireLiveWorkspace(ctx, tendency.workspaceId)
  return tendency
}

export const createCategory = mutation({
  args: { name: v.string() }, returns: v.string(),
  handler: async (ctx, args) => {
    const name = normalizeCategoryName(args.name)
    if (!name) throw new Error('Category must be 1–80 characters')
    const existing = resolveCategory(await vocabulary(ctx), name)
    if (existing) return existing
    await ctx.db.insert('tendencyCategories', { name, isDefault: false })
    return name
  },
})

export const update = mutation({
  args: {
    tendencyId: v.id('tendencies'), title: v.optional(v.string()), category: v.optional(v.string()),
    note: v.optional(v.string()), diagramId: v.optional(v.union(v.id('diagrams'), v.null())),
    includeInReport: v.optional(v.boolean()),
  }, returns: v.null(),
  handler: async (ctx, args) => {
    const tendency = await requireLiveTendency(ctx, args.tendencyId)
    if (args.diagramId) {
      const diagram = await ctx.db.get(args.diagramId)
      const game = diagram ? await ctx.db.get(diagram.sourceGameId) : null
      if (!diagram || diagram.deletedAt !== undefined || !game || game.workspaceId !== tendency.workspaceId || !await isLiveSourceGame(ctx, game._id)) throw new Error('Play Diagram not found')
    }
    await ctx.db.patch(tendency._id, {
      ...(args.title !== undefined ? { title: requireTitle(args.title) } : {}),
      ...(args.category !== undefined ? { category: await requireCategory(ctx, args.category) } : {}),
      ...(args.note !== undefined ? { note: requireNote(args.note) } : {}),
      ...(args.diagramId !== undefined ? { diagramId: args.diagramId ?? undefined } : {}),
      ...(args.includeInReport !== undefined ? { includeInReport: args.includeInReport } : {}),
    })
    return null
  },
})

export const remove = mutation({
  args: { tendencyId: v.id('tendencies') }, returns: v.string(),
  handler: async (ctx, args) => {
    const tendency = await requireLiveTendency(ctx, args.tendencyId)
    return softDeleteBatch(ctx, { kind: 'tendency', label: tendency.title, records: [{ table: 'tendencies', id: tendency._id }] })
  },
})
