import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import schema from './schema'
import { normalizeName } from './domain/names.ts'
import { requireLiveSeason } from './seasons'
import { softDeleteBatch } from './deletions'

type CascadeRecords = Parameters<typeof softDeleteBatch>[1]['records'][number][]

export async function requireLiveWorkspace(
  ctx: QueryCtx | MutationCtx, id: Id<'workspaces'>,
): Promise<Doc<'workspaces'>> {
  const workspace = await ctx.db.get(id)
  if (!workspace || workspace.deletedAt !== undefined) throw new Error('Workspace not found')
  await requireLiveSeason(ctx, workspace.seasonId)
  return workspace
}

function requireOpponentName(value: string): string {
  const name = normalizeName(value)
  if (name === null) throw new Error('Opponent Name must be 1–80 characters')
  return name
}

function requireWeek(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 52) {
    throw new Error('Week must be a whole number between 0 and 52')
  }
  return value
}

const workspaceValidator = v.object({
  ...schema.tables.workspaces.validator.fields,
  _id: v.id('workspaces'), _creationTime: v.number(),
})
const optionalFields = {
  gameDate: v.optional(v.string()), yourTeam: v.optional(v.string()), notes: v.optional(v.string()),
}

/** Current lists exclude both Archive and Soft Deletion. */
export const listBySeason = query({
  args: { seasonId: v.string() }, returns: v.array(workspaceValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('seasons', args.seasonId)
    if (!id) return []
    const season = await ctx.db.get(id)
    if (!season || season.deletedAt !== undefined) return []
    return (await ctx.db.query('workspaces')
      .withIndex('by_season_archived', (q) => q.eq('seasonId', id).eq('archivedAt', undefined))
      .collect()).filter((workspace) => workspace.deletedAt === undefined)
      .sort((a, b) => b.week - a.week || b.createdAt - a.createdAt)
  },
})

/** Malformed route ids and deleted parents resolve to not found. */
export const get = query({
  args: { workspaceId: v.string() },
  returns: v.union(v.object({ ...workspaceValidator.fields, seasonName: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    if (!id) return null
    const workspace = await ctx.db.get(id)
    if (!workspace || workspace.deletedAt !== undefined) return null
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return null
    return { ...workspace, seasonName: season.name }
  },
})

export const create = mutation({
  args: {
    seasonId: v.id('seasons'), opponentName: v.string(), week: v.number(), ...optionalFields,
  },
  returns: v.id('workspaces'),
  handler: async (ctx, args) => {
    await requireLiveSeason(ctx, args.seasonId)
    return ctx.db.insert('workspaces', {
      seasonId: args.seasonId, opponentName: requireOpponentName(args.opponentName),
      week: requireWeek(args.week), createdAt: Date.now(),
      ...(args.gameDate ? { gameDate: args.gameDate } : {}),
      ...(args.yourTeam ? { yourTeam: args.yourTeam } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
    })
  },
})

/** Omitted fields stay untouched; explicit empty strings clear optional fields. */
export const update = mutation({
  args: {
    workspaceId: v.id('workspaces'), opponentName: v.optional(v.string()),
    week: v.optional(v.number()), ...optionalFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    await ctx.db.patch(args.workspaceId, {
      ...(args.opponentName !== undefined ? { opponentName: requireOpponentName(args.opponentName) } : {}),
      ...(args.week !== undefined ? { week: requireWeek(args.week) } : {}),
      ...(args.gameDate !== undefined ? { gameDate: args.gameDate || undefined } : {}),
      ...(args.yourTeam !== undefined ? { yourTeam: args.yourTeam || undefined } : {}),
      ...(args.notes !== undefined ? { notes: args.notes || undefined } : {}),
    })
    return null
  },
})

/** Already-deleted descendants keep their original batch and Undo lifetime. */
export async function collectSourceGameCascade(
  ctx: MutationCtx, sourceGameId: Id<'sourceGames'>,
): Promise<CascadeRecords> {
  const game = await ctx.db.get(sourceGameId)
  if (!game || game.deletedAt !== undefined) return []
  const records: CascadeRecords = [{ table: 'sourceGames', id: sourceGameId }]
  const snaps = (await ctx.db.query('snaps')
    .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', sourceGameId)).collect())
    .filter((snap) => snap.deletedAt === undefined)
  for (const snap of snaps) {
    records.push({ table: 'snaps', id: snap._id })
    // ponytail: one Cell Note scan per Snap at V1 volume; batch reads if transaction limits show up.
    const notes = await ctx.db.query('cellNotes')
      .withIndex('by_snap', (q) => q.eq('snapId', snap._id)).collect()
    for (const note of notes) {
      if (note.deletedAt === undefined) records.push({ table: 'cellNotes', id: note._id })
    }
  }
  for (const table of ['quickNotes', 'diagrams'] as const) {
    const rows = await ctx.db.query(table)
      .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', sourceGameId)).collect()
    for (const row of rows) {
      if (row.deletedAt === undefined) records.push({ table, id: row._id } as CascadeRecords[number])
    }
  }
  return records
}

export async function collectWorkspaceCascade(
  ctx: MutationCtx, workspaceId: Id<'workspaces'>,
): Promise<CascadeRecords> {
  await requireLiveWorkspace(ctx, workspaceId)
  const records: CascadeRecords = [{ table: 'workspaces', id: workspaceId }]
  const games = await ctx.db.query('sourceGames')
    .withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect()
  for (const game of games) {
    if (game.deletedAt === undefined) records.push(...await collectSourceGameCascade(ctx, game._id))
  }
  for (const table of ['tendencies', 'reports'] as const) {
    const rows = await ctx.db.query(table)
      .withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect()
    for (const row of rows) {
      if (row.deletedAt === undefined) records.push({ table, id: row._id } as CascadeRecords[number])
    }
  }
  return records
}

/** One batch restores the entire live Workspace hierarchy. */
export const remove = mutation({
  args: { workspaceId: v.id('workspaces') }, returns: v.string(),
  handler: async (ctx, args) => {
    const workspace = await requireLiveWorkspace(ctx, args.workspaceId)
    return softDeleteBatch(ctx, {
      kind: 'workspace', label: `Week ${workspace.week} — ${workspace.opponentName}`,
      records: await collectWorkspaceCascade(ctx, args.workspaceId),
    })
  },
})

/** Overview counts only live records; the coach decides when film study is complete. */
export const getOverview = query({
  args: { workspaceId: v.string() },
  returns: v.union(v.null(), v.object({
    opponentName: v.string(), week: v.number(), seasonName: v.string(), gameDate: v.optional(v.string()),
    sourceGames: v.array(v.object({ _id: v.id('sourceGames'), label: v.string(), snapCount: v.number() })),
    snapCount: v.number(), mustReviewCount: v.number(), tendencyCount: v.number(),
    reports: v.array(v.object({ _id: v.id('reports'), name: v.string(), intent: schema.tables.reports.validator.fields.intent })),
    continueGameId: v.union(v.id('sourceGames'), v.null()),
  })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    if (!id) return null
    const workspace = await ctx.db.get(id)
    if (!workspace || workspace.deletedAt !== undefined) return null
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return null
    const games = (await ctx.db.query('sourceGames')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((game) => game.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt)
    let mustReviewCount = 0
    // ponytail: per-game Snap scans fit V1 volume; use aggregate counters if query latency shows up.
    const sourceGames = []
    for (const game of games) {
      const snaps = await ctx.db.query('snaps')
        .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect()
      const review = await ctx.db.query('snaps')
        .withIndex('by_sourceGame_mustReview', (q) => q.eq('sourceGameId', game._id).eq('mustReview', true)).collect()
      mustReviewCount += review.filter((snap) => snap.deletedAt === undefined).length
      sourceGames.push({ _id: game._id, label: game.label, snapCount: snaps.filter((snap) => snap.deletedAt === undefined).length })
    }
    const tendencies = await ctx.db.query('tendencies')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect()
    const reports = await ctx.db.query('reports')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect()
    return {
      opponentName: workspace.opponentName, week: workspace.week, seasonName: season.name,
      ...(workspace.gameDate ? { gameDate: workspace.gameDate } : {}), sourceGames,
      snapCount: sourceGames.reduce((sum, game) => sum + game.snapCount, 0), mustReviewCount,
      tendencyCount: tendencies.filter((tendency) => tendency.deletedAt === undefined).length,
      reports: reports.filter((report) => report.deletedAt === undefined)
        .map(({ _id, name, intent }) => ({ _id, name, intent })),
      continueGameId: games[0]?._id ?? null,
    }
  },
})
