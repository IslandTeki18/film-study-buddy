import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { normalizeName } from './domain/names.ts'
import schema from './schema'
import { requireLiveWorkspace } from './workspaces'
import { softDeleteBatch } from './deletions'

const reportValidator = v.object({ ...schema.tables.reports.validator.fields, _id: v.id('reports'), _creationTime: v.number() })

function requireName(value: string): string {
  const name = normalizeName(value)
  if (!name) throw new Error('Name must be 1–80 characters')
  return name
}
async function liveWorkspace(ctx: QueryCtx, value: string): Promise<Id<'workspaces'> | null> {
  const id = ctx.db.normalizeId('workspaces', value)
  const workspace = id ? await ctx.db.get(id) : null
  const season = workspace && workspace.deletedAt === undefined ? await ctx.db.get(workspace.seasonId) : null
  return season && season.deletedAt === undefined ? id : null
}
async function requireLiveReport(ctx: QueryCtx, id: Id<'reports'>): Promise<Doc<'reports'>> {
  const report = await ctx.db.get(id)
  if (!report || report.deletedAt !== undefined) throw new Error('Report not found')
  await requireLiveWorkspace(ctx, report.workspaceId)
  return report
}
export const listByWorkspace = query({
  args: { workspaceId: v.string() }, returns: v.array(reportValidator),
  handler: async (ctx, args) => {
    const id = await liveWorkspace(ctx, args.workspaceId)
    if (!id) return []
    return (await ctx.db.query('reports').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((report) => report.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
  },
})
export const get = query({
  args: { workspaceId: v.string(), reportId: v.string() }, returns: v.union(reportValidator, v.null()),
  handler: async (ctx, args) => {
    const workspaceId = await liveWorkspace(ctx, args.workspaceId)
    const id = ctx.db.normalizeId('reports', args.reportId)
    const report = workspaceId && id ? await ctx.db.get(id) : null
    return report && report.deletedAt === undefined && report.workspaceId === workspaceId ? report : null
  },
})
export const create = mutation({
  args: { workspaceId: v.id('workspaces'), name: v.string(), intent: schema.tables.reports.validator.fields.intent }, returns: v.id('reports'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    return ctx.db.insert('reports', { ...args, name: requireName(args.name), showClipReferences: args.intent === 'coach', blocks: [], updatedAt: Date.now() })
  },
})
export const update = mutation({
  args: { reportId: v.id('reports'), name: v.optional(v.string()), showClipReferences: v.optional(v.boolean()) }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveReport(ctx, args.reportId)
    await ctx.db.patch(args.reportId, {
      ...(args.name !== undefined ? { name: requireName(args.name) } : {}),
      ...(args.showClipReferences !== undefined ? { showClipReferences: args.showClipReferences } : {}), updatedAt: Date.now(),
    })
    return null
  },
})
export const remove = mutation({
  args: { reportId: v.id('reports') }, returns: v.string(),
  handler: async (ctx, args) => {
    const report = await requireLiveReport(ctx, args.reportId)
    return softDeleteBatch(ctx, { kind: 'report', label: report.name, records: [{ table: 'reports', id: report._id }] })
  },
})
