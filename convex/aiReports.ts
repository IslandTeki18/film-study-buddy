import { ConvexError, v, type Infer } from 'convex/values'
import { api } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, internalQuery, type QueryCtx } from './_generated/server'
import { AI_PLAN_MAX_BLOCKS, AI_BRIEF_MAX_AGGREGATE_ROWS, AI_BRIEF_MAX_GROUPINGS, AI_BRIEF_MAX_PLAYER_NOTES, AI_BRIEF_MAX_QUICK_NOTES } from './domain/aiReport.ts'
import { groupingFieldsFor, groupingValuesOf, templateGroupingKey } from './domain/aggregate.ts'
import { DEFAULT_SELECTED_PLAY_CORE_KEYS, HEADING_MAX_LENGTH, TEXT_BLOCK_MAX_LENGTH } from './domain/reportBlocks.ts'
import { buildBlock, requireName, requireSize, type blockSourceValidator } from './reports'
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
    tendencies: allTendencies.filter((tendency) => tendency.includeInReport && tendency.snapshot.gameIds.length > 0 && tendency.snapshot.gameIds.every((id) => gameIds.has(id))
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

export const planValidator = v.array(v.union(
  v.object({ type: v.literal('heading'), text: v.string() }),
  v.object({ type: v.literal('text'), text: v.string() }),
  v.object({ type: v.literal('dataTable'), groupBy: v.string(), groupBy2: v.optional(v.string()), title: v.string() }),
  v.object({ type: v.literal('tendency'), tendencyId: v.string() }),
  v.object({ type: v.literal('diagram'), diagramId: v.string() }),
  v.object({ type: v.literal('quickNotes'), noteIds: v.array(v.string()) }),
  v.object({ type: v.literal('selectedPlays'), sourceGameLabel: v.string(), groupingKey: v.string(), groupingValue: v.string(), limit: v.number() }),
))
export type AiReportPlan = Infer<typeof planValidator>

export const AI_PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['blocks'],
  properties: { blocks: { type: 'array', items: { anyOf: planValidator.element.members.map((member) => ({
    type: 'object', additionalProperties: false,
    required: Object.entries(member.fields).filter(([, field]) => field.isOptional !== 'optional').map(([key]) => key),
    properties: Object.fromEntries(Object.entries(member.fields).map(([key, field]) => [key,
      field.kind === 'literal' ? { type: 'string', const: field.value }
        : field.kind === 'array' ? { type: 'array', items: { type: 'string' } }
          : { type: field.kind === 'float64' ? 'number' : field.kind },
    ])),
  })) } } },
}
export const generationResultValidator = v.object({ reportId: v.id('reports'), blockCount: v.number(), skipped: v.number() })
export type GenerationResult = Infer<typeof generationResultValidator>

export const createGenerated = internalMutation({
  args: { workspaceId: v.id('workspaces'), name: v.string(), intent: schema.tables.reports.validator.fields.intent, plan: planValidator, sourceGameIds: v.optional(v.array(v.id('sourceGames'))) },
  returns: generationResultValidator,
  handler: async (ctx, { workspaceId, name, intent, plan, sourceGameIds }): Promise<GenerationResult> => {
    await requireLiveWorkspace(ctx, workspaceId)
    const reportName = requireName(name)
    if (plan.length > AI_PLAN_MAX_BLOCKS) throw new ConvexError(`A Generated Report can have at most ${AI_PLAN_MAX_BLOCKS} Blocks.`)
    const brief = await loadBrief(ctx, workspaceId)
    if (sourceGameIds && (sourceGameIds.length !== brief.snapColumns.length || brief.snapColumns.some((game) => !sourceGameIds.includes(game.sourceGameId)))) {
      throw new ConvexError('Included Source Games changed while building the Report. Try again.')
    }
    const blocks: Doc<'reports'>['blocks'] = []
    let skipped = 0
    // ponytail: skipped blocks are counted, not explained; surface per-block reasons if coaches start asking which block vanished.
    for (const entry of plan) {
      try {
        let source: Infer<typeof blockSourceValidator>
        switch (entry.type) {
          case 'heading': case 'text': source = { type: entry.type }; break
          case 'dataTable':
            if (![entry.groupBy, ...(entry.groupBy2 ? [entry.groupBy2] : [])].every((key) => brief.groupings.some((field) => field.key === key))) throw new Error('Grouping Field not available')
            source = entry
            break
          case 'tendency': {
            const tendencyId = ctx.db.normalizeId('tendencies', entry.tendencyId)
            if (!tendencyId || !brief.tendencies.some((item) => item.id === tendencyId)) throw new Error('Tendency / Alert not found')
            source = { type: entry.type, tendencyId }
            break
          }
          case 'diagram': {
            const diagramId = ctx.db.normalizeId('diagrams', entry.diagramId)
            if (!diagramId || !brief.diagrams.some((item) => item.id === diagramId)) throw new Error('Play Diagram not found')
            source = { type: entry.type, diagramId }
            break
          }
          case 'quickNotes': {
            const noteIds = [...new Set(entry.noteIds)].flatMap((value) => {
              const id = ctx.db.normalizeId('quickNotes', value)
              return id && brief.quickNotes.some((note) => note.id === id) ? [id] : []
            })
            if (!noteIds.length) throw new Error('Quick Note not found')
            source = { type: entry.type, noteIds }
            break
          }
          case 'selectedPlays': {
            const games = brief.snapColumns.filter((game) => game.sourceGameLabel === entry.sourceGameLabel)
            if (games.length !== 1 || !Number.isSafeInteger(entry.limit) || entry.limit < 1) throw new Error('Source Game or Snap selection not available')
            const game = await ctx.db.get(games[0]!.sourceGameId)
            if (!game) throw new Error('Source Game not found')
            const template = await ctx.db.get(game.templateId)
            const fields = template && template.deletedAt === undefined ? (await templateTree(ctx, game.templateId)).flatMap((section) => section.fields) : []
            const field = groupingFieldsFor([fields]).find((field) => field.key === entry.groupingKey)
            if (!field || !brief.groupings.some((group) => group.key === field.key && group.rows.some((row) => row.values.includes(entry.groupingValue)))) throw new Error('Grouping Field not available')
            const templateFieldId = fields.find((candidate) => templateGroupingKey(candidate) === field.key)?._id
            const snaps = (await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect())
              .filter((snap) => snap.deletedAt === undefined && groupingValuesOf(snap, field, templateFieldId).includes(entry.groupingValue))
              .sort((a, b) => a.order - b.order).slice(0, Math.min(entry.limit, 12))
            if (!snaps.length) throw new Error('No matching Snaps')
            source = { type: entry.type, sourceGameId: game._id, snapIds: snaps.map((snap) => snap._id), columnKeys: DEFAULT_SELECTED_PLAY_CORE_KEYS.map(coreColumnKey) }
            break
          }
        }
        const block = await buildBlock(ctx, { workspaceId }, source)
        if ((block.type === 'heading' || block.type === 'text') && (entry.type === 'heading' || entry.type === 'text')) {
          block.text = entry.text.slice(0, block.type === 'heading' ? HEADING_MAX_LENGTH : TEXT_BLOCK_MAX_LENGTH)
        }
        blocks.push(block)
      } catch { skipped += 1 }
    }
    if (!blocks.length) throw new ConvexError('The generated Report had no usable content. Try again.')
    requireSize(blocks)
    const reportId = await ctx.db.insert('reports', { workspaceId, name: reportName, intent, showClipReferences: intent === 'coach', blocks, updatedAt: Date.now() })
    return { reportId, blockCount: blocks.length, skipped }
  },
})
