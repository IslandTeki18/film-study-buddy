import { v, type Infer } from 'convex/values'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalQuery, type QueryCtx } from './_generated/server'
import { AI_BRIEF_MAX_AGGREGATE_ROWS, AI_BRIEF_MAX_GROUPINGS, AI_BRIEF_MAX_PLAYER_NOTES, AI_BRIEF_MAX_QUICK_NOTES } from './domain/aiReport.ts'
import { CORE_FIELDS } from './domain/coreFields.ts'
import { attachedSnapIds } from './domain/diagram.ts'
import { columnCatalog, coreColumnKey, fieldColumnKey } from './domain/templateFields.ts'
import { computeResult } from './opponentData'
import schema from './schema'
import { isIncluded } from './sourceGames'
import { templateTree } from './templates'
import { requireLiveWorkspace } from './workspaces'

const keyLabelValidator = v.object({ key: v.string(), label: v.string() })
export const briefValidator = v.object({
  opponentName: v.string(), week: v.number(), seasonName: v.string(), coachingArea: v.string(),
  sourceGames: v.array(v.object({ label: v.string(), snapCount: v.number() })), totalSnaps: v.number(),
  groupings: v.array(v.object({ key: v.string(), label: v.string(), totalSnaps: v.number(), rows: schema.tables.tendencies.validator.fields.snapshot.fields.rows })),
  tendencies: v.array(v.object({ id: v.id('tendencies'), title: v.string(), category: v.string(), note: v.string(), groupBy: v.string(), groupBy2: v.optional(v.string()), rowCount: v.number(), hasDiagram: v.boolean() })),
  diagrams: v.array(v.object({ id: v.id('diagrams'), name: v.string(), note: v.string(), sourceGameLabel: v.string(), snapCount: v.number() })),
  quickNotes: v.array(v.object({ id: v.id('quickNotes'), text: v.string(), tags: v.array(v.string()), sourceGameLabel: v.string() })),
  players: v.array(v.object({
    jersey: v.string(), position: v.string(), positionGroup: v.string(),
    profile: v.object({ name: v.string(), details: v.string(), traits: v.array(v.string()), summary: v.string(), tendency: v.string(), assignment: v.string(), grade: schema.tables.opponentPlayers.validator.fields.grade }),
    notes: v.array(v.string()),
  })),
  snapColumns: v.array(v.object({ sourceGameId: v.id('sourceGames'), sourceGameLabel: v.string(), columns: v.array(keyLabelValidator) })),
})
export type AiReportBrief = Infer<typeof briefValidator>

export async function loadBrief(ctx: QueryCtx, workspaceId: Id<'workspaces'>): Promise<AiReportBrief> {
  const workspace = await requireLiveWorkspace(ctx, workspaceId)
  const season = await ctx.db.get(workspace.seasonId)
  const [settings, allGames, groupingFields, allTendencies, allDiagrams, allPlayers] = await Promise.all([
    ctx.runQuery(api.settings.get, {}),
    ctx.runQuery(api.sourceGames.listByWorkspace, { workspaceId }),
    ctx.runQuery(api.opponentData.listGroupingFields, { workspaceId }),
    ctx.runQuery(api.tendencies.listByWorkspace, { workspaceId }),
    ctx.runQuery(api.diagrams.listByWorkspace, { workspaceId }),
    ctx.runQuery(api.opponentPlayers.listByWorkspace, { workspaceId }),
  ])
  const games = allGames.filter(isIncluded)
  const gameIds = new Set(games.map((game) => game._id))
  const diagrams = allDiagrams.filter((diagram) => gameIds.has(diagram.sourceGameId))
  const diagramIds = new Set(diagrams.map((diagram) => diagram._id))
  // ponytail: the brief recomputes every single-field aggregate per generation; cache per Workspace if generation latency becomes the complaint.
  const groupings = await Promise.all(groupingFields.slice(0, AI_BRIEF_MAX_GROUPINGS).map(async (field) => {
    const computed = await computeResult(ctx, { workspaceId, groupBy: field.key })
    return { ...field, totalSnaps: computed?.result.totalSnaps ?? 0, rows: computed?.result.rows.slice(0, AI_BRIEF_MAX_AGGREGATE_ROWS) ?? [] }
  }))
  const notes = (await Promise.all(games.map(async (game) =>
    (await ctx.runQuery(api.notes.listQuickNotes, { sourceGameId: game._id })).map((note) => ({ ...note, sourceGameLabel: game.label })))))
    .flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, AI_BRIEF_MAX_QUICK_NOTES)
  let remainingNotes = AI_BRIEF_MAX_PLAYER_NOTES
  const players = allPlayers.slice(0, AI_BRIEF_MAX_PLAYER_NOTES).map((player) => {
    const notes = player.notes.filter((note) => note.snapIds.length === note.snaps.length && note.snaps.every((snap) => gameIds.has(snap.sourceGameId)))
      .slice(0, remainingNotes).map((note) => note.text)
    remainingNotes -= notes.length
    const { name, details, traits, summary, tendency, assignment, grade } = player
    return { jersey: player.jersey, position: player.position, positionGroup: player.group,
      profile: { name, details, traits, summary, tendency, assignment, ...(grade !== undefined ? { grade } : {}) }, notes }
  })
  const snapColumns = await Promise.all(games.map(async (game) => {
    const template = await ctx.db.get(game.templateId)
    const fields = template && template.deletedAt === undefined ? (await templateTree(ctx, game.templateId)).flatMap((section) => section.fields) : []
    const labels = new Map([...CORE_FIELDS.map((field) => [coreColumnKey(field.key), field.label] as const), ...fields.map((field) => [fieldColumnKey(field._id), field.name] as const)])
    return { sourceGameId: game._id, sourceGameLabel: game.label, columns: columnCatalog(fields.map((field) => field._id)).map((key) => ({ key, label: labels.get(key)! })) }
  }))
  return {
    opponentName: workspace.opponentName, week: workspace.week, seasonName: season!.name, coachingArea: settings?.coachingArea ?? '',
    sourceGames: games.map(({ label, snapCount }) => ({ label, snapCount })), totalSnaps: games.reduce((total, game) => total + game.snapCount, 0), groupings,
    tendencies: allTendencies.filter((tendency) => tendency.snapshot.gameIds.length > 0 && tendency.snapshot.gameIds.every((id) => gameIds.has(id))
      && (!tendency.diagramId || !allDiagrams.some((diagram) => diagram._id === tendency.diagramId) || diagramIds.has(tendency.diagramId)))
      .map((tendency) => ({ id: tendency._id, title: tendency.title, category: tendency.category, note: tendency.note,
        groupBy: tendency.snapshot.groupBy, ...(tendency.snapshot.groupBy2 ? { groupBy2: tendency.snapshot.groupBy2 } : {}),
        rowCount: tendency.snapshot.rows.length, hasDiagram: !!tendency.diagramId && diagramIds.has(tendency.diagramId) })),
    diagrams: diagrams.map((diagram) => ({ id: diagram._id, name: diagram.name ?? '', note: diagram.note ?? '', sourceGameLabel: diagram.sourceGameLabel, snapCount: attachedSnapIds(diagram).length })),
    quickNotes: notes.map(({ _id, text, tags, sourceGameLabel }) => ({ id: _id, text, tags, sourceGameLabel })), players, snapColumns,
  }
}

export const brief = internalQuery({
  args: { workspaceId: v.id('workspaces') }, returns: briefValidator,
  handler: (ctx, { workspaceId }): Promise<AiReportBrief> => loadBrief(ctx, workspaceId),
})
