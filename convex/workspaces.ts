import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import schema from './schema'
import { attachedSnapIds } from './domain/diagram.ts'
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

export async function collectSnapCascade(ctx: MutationCtx, snap: Doc<'snaps'>, deletingSourceGame = false): Promise<CascadeRecords> {
  const records: CascadeRecords = [{ table: 'snaps', id: snap._id }]
  const notes = await ctx.db.query('cellNotes').withIndex('by_snap', (q) => q.eq('snapId', snap._id)).collect()
  for (const note of notes) if (note.deletedAt === undefined) records.push({ table: 'cellNotes', id: note._id })
  if (!deletingSourceGame) {
    const diagrams = await ctx.db.query('diagrams').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', snap.sourceGameId)).collect()
    for (const diagram of diagrams) {
      const snapIds = attachedSnapIds(diagram)
      if (diagram.deletedAt !== undefined || !snapIds.includes(snap._id)) continue
      if (snapIds.length === 1) records.push({ table: 'diagrams', id: diagram._id })
      // ponytail: shared detach is not restored by Undo; ledger the attachment if that becomes required.
      else await ctx.db.patch(diagram._id, { snapIds: snapIds.filter((id) => id !== snap._id), snapId: undefined, updatedAt: Date.now() })
    }
  }
  // ponytail: scans the game's Quick Notes per Snap; add a by_snap index if cascades exceed V1 volume.
  const quickNotes = await ctx.db.query('quickNotes').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', snap.sourceGameId)).collect()
  for (const note of quickNotes) if (note.snapId === snap._id && note.deletedAt === undefined) records.push({ table: 'quickNotes', id: note._id })
  return records
}

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
  for (const snap of snaps) records.push(...await collectSnapCascade(ctx, snap, true))
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
    sourceGames: v.array(v.object({ _id: v.id('sourceGames'), label: v.string(), snapCount: v.number(), included: v.boolean() })),
    includedGameCount: v.number(),
    // Charted and Must Review counts cover included Source Games only.
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
      const included = game.included !== false
      if (included) mustReviewCount += review.filter((snap) => snap.deletedAt === undefined).length
      sourceGames.push({ _id: game._id, label: game.label, snapCount: snaps.filter((snap) => snap.deletedAt === undefined).length, included })
    }
    const tendencies = await ctx.db.query('tendencies')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect()
    const reports = await ctx.db.query('reports')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect()
    return {
      opponentName: workspace.opponentName, week: workspace.week, seasonName: season.name,
      ...(workspace.gameDate ? { gameDate: workspace.gameDate } : {}), sourceGames,
      includedGameCount: sourceGames.filter((game) => game.included).length,
      snapCount: sourceGames.reduce((sum, game) => sum + (game.included ? game.snapCount : 0), 0), mustReviewCount,
      tendencyCount: tendencies.filter((tendency) => tendency.deletedAt === undefined).length,
      reports: reports.filter((report) => report.deletedAt === undefined)
        .map(({ _id, name, intent }) => ({ _id, name, intent })),
      continueGameId: games[0]?._id ?? null,
    }
  },
})

/** Archive preserves the full hierarchy and never writes a deletion ledger entry. */
export const archive = mutation({
  args: { workspaceId: v.id('workspaces') }, returns: v.null(),
  handler: async (ctx, args) => {
    const workspace = await requireLiveWorkspace(ctx, args.workspaceId)
    if (workspace.archivedAt !== undefined) throw new Error('Workspace is already archived')
    await ctx.db.patch(args.workspaceId, { archivedAt: Date.now() })
    return null
  },
})

export const unarchive = mutation({
  args: { workspaceId: v.id('workspaces') }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    await ctx.db.patch(args.workspaceId, { archivedAt: undefined })
    return null
  },
})

/** Archived Workspaces stay grouped by Season, newest Season first, then week ascending. */
export const listArchived = query({
  args: {},
  returns: v.array(v.object({ ...workspaceValidator.fields, seasonName: v.string() })),
  handler: async (ctx) => {
    const seasons = (await ctx.db.query('seasons')
      .withIndex('by_deletedAt', (q) => q.eq('deletedAt', undefined)).collect())
      .sort((a, b) => b.createdAt - a.createdAt)
    const archived = []
    for (const season of seasons) {
      const workspaces = await ctx.db.query('workspaces')
        .withIndex('by_season_archived', (q) => q.eq('seasonId', season._id).gt('archivedAt', undefined)).collect()
      archived.push(...workspaces.filter((workspace) => workspace.deletedAt === undefined)
        .sort((a, b) => a.week - b.week || a.createdAt - b.createdAt)
        .map((workspace) => ({ ...workspace, seasonName: season.name })))
    }
    return archived
  },
})
