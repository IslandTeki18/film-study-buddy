import { ConvexError, v, type Infer, type GenericValidator } from 'convex/values'
import { api } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, internalQuery, type QueryCtx } from './_generated/server'
import { AI_IDENTITY_MAX_LENGTH, AI_PRIORITY_MAX_LENGTH, AI_MAX_PRIORITIES, AI_MAX_ALERTS, AI_IDENTITY_TABLE_MAX_ROWS, AI_COUNTER_MAX_LENGTH, IDENTITY_SLOT_LABEL, PRIORITIES_SLOT_LABEL, ALERTS_SLOT_LABEL, COUNTER_SLOT_LABEL, SECTION_KIND_ORDER, SECTION_KIND_HEADING, AI_BRIEF_MAX_FORMATIONS, AI_BRIEF_FORMATION_BREAKDOWN_KEYS, AI_BRIEF_MAX_BREAKDOWN_ROWS, generatedReportBudget, AI_PLAN_MAX_BLOCKS, AI_BRIEF_MAX_AGGREGATE_ROWS, AI_BRIEF_MAX_GROUPINGS, AI_BRIEF_MAX_PLAYER_NOTES, AI_BRIEF_MAX_QUICK_NOTES } from './domain/aiReport.ts'
import { NONE_GROUP, groupingFieldsFor, groupingValuesOf, templateGroupingKey } from './domain/aggregate.ts'
import { DEFAULT_SELECTED_PLAY_CORE_KEYS, HEADING_MAX_LENGTH, TABLE_TITLE_MAX_LENGTH } from './domain/reportBlocks.ts'
import { buildBlock, requireName, requireSize, type blockSourceValidator } from './reports'
import { CORE_FIELDS } from './domain/coreFields.ts'
import { attachedSnapIds } from './domain/diagram.ts'
import { columnCatalog, coreColumnKey, fieldColumnKey } from './domain/templateFields.ts'
import { computeResult, loadScope, type OpponentScope } from './opponentData'
import schema from './schema'
import { isIncluded } from './sourceGames'
import { templateTree } from './templates'
import { requireLiveWorkspace } from './workspaces'

const keyLabelValidator = v.object({ key: v.string(), label: v.string() })
export const briefValidator = v.object({
  opponentName: v.string(), week: v.number(), seasonName: v.string(), coachingArea: v.string(),
  sourceGames: v.array(v.object({ label: v.string(), snapCount: v.number() })), totalSnaps: v.number(),
  groupings: v.array(v.object({ key: v.string(), label: v.string(), totalSnaps: v.number(), rows: schema.tables.tendencies.validator.fields.snapshot.fields.rows })),
  formationBreakdowns: v.array(v.object({ value: v.string(), snaps: v.number(), breakdowns: v.array(v.object({ key: v.string(), label: v.string(), rows: schema.tables.tendencies.validator.fields.snapshot.fields.rows })) })),
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

export async function loadBrief(ctx: QueryCtx, workspaceId: Id<'workspaces'>, preloadedScope?: OpponentScope): Promise<AiReportBrief> {
  const workspace = await requireLiveWorkspace(ctx, workspaceId)
  const season = await ctx.db.get(workspace.seasonId)
  const scope = preloadedScope ?? (await loadScope(ctx, workspaceId))!
  const [settings, allGames, groupingFields, allTendencies, allDiagrams, allPlayers] = await Promise.all([
    ctx.runQuery(api.settings.get, {}),
    ctx.runQuery(api.sourceGames.listByWorkspace, { workspaceId }),
    groupingFieldsFor([...scope.templateFields.values()]).map(({ key, label }) => ({ key, label })),
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
    const computed = await computeResult(ctx, { workspaceId, groupBy: field.key, scope })
    return { ...field, totalSnaps: computed?.result.totalSnaps ?? 0, rows: computed?.result.rows.slice(0, AI_BRIEF_MAX_AGGREGATE_ROWS) ?? [] }
  }))
  const totalSnaps = scope.snaps.length
  const { minFormationSnaps } = generatedReportBudget({ totalSnaps, tendencyCount: 0, groupings, intent: 'coach' })
  const formations = groupings.find((field) => field.key === 'core:formation')?.rows
    .filter((row) => row.values[0] !== NONE_GROUP && row.snaps >= minFormationSnaps).slice(0, AI_BRIEF_MAX_FORMATIONS) ?? []
  const formationBreakdowns = await Promise.all(formations.map(async (formation) => ({
    value: formation.values[0]!, snaps: formation.snaps,
    breakdowns: await Promise.all(AI_BRIEF_FORMATION_BREAKDOWN_KEYS.flatMap((key) => {
      const field = groupingFields.find((field) => field.key === key)
      return field ? [field] : []
    }).map(async (field) => {
      const computed = await computeResult(ctx, { workspaceId, groupBy: field.key, filter: { groupBy: 'core:formation', value: formation.values[0]! }, scope })
      return { ...field, rows: computed?.result.rows.slice(0, AI_BRIEF_MAX_BREAKDOWN_ROWS) ?? [] }
    })),
  })))
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
    sourceGames: games.map(({ label, snapCount }) => ({ label, snapCount })), totalSnaps, groupings, formationBreakdowns,
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

const sectionBlockValidator = v.union(
  v.object({ type: v.literal('dataTable'), groupBy: v.string(), groupBy2: v.optional(v.string()), title: v.string() }),
  v.object({ type: v.literal('tendency'), tendencyId: v.string() }),
  v.object({ type: v.literal('diagram'), diagramId: v.string() }),
  v.object({ type: v.literal('quickNotes'), noteIds: v.array(v.string()) }),
  v.object({ type: v.literal('selectedPlays'), sourceGameLabel: v.string(), groupingKey: v.string(), groupingValue: v.string(), limit: v.number() }),
)
export const generatedPlanValidator = v.object({
  summary: v.object({
    identity: v.string(), identityTable: v.object({ groupBy: v.string(), title: v.string() }),
    priorities: v.array(v.string()), alertTendencyIds: v.array(v.string()),
  }),
  tendencySections: v.array(v.object({
    kind: v.union(v.literal('evidence'), v.literal('split'), v.literal('formation')),
    title: v.string(), filter: v.optional(v.object({ groupBy: v.string(), value: v.string() })),
    blocks: v.array(sectionBlockValidator), counter: v.string(),
  })),
})
export type GeneratedPlan = Infer<typeof generatedPlanValidator>

function toJsonSchema(validator: GenericValidator): Record<string, unknown> {
  switch (validator.kind) {
    case 'object': {
      const fields = Object.entries(validator.fields) as [string, GenericValidator][]
      return { type: 'object', additionalProperties: false,
        required: fields.filter(([, field]) => field.isOptional !== 'optional').map(([key]) => key),
        properties: Object.fromEntries(fields.map(([key, field]) => [key, toJsonSchema(field)])) }
    }
    case 'array': return { type: 'array', items: toJsonSchema(validator.element) }
    case 'union': return { anyOf: validator.members.map(toJsonSchema) }
    case 'literal': return { type: typeof validator.value, const: validator.value }
    case 'string': return { type: 'string' }
    case 'float64': return { type: 'number' }
    default: throw new Error(`Unsupported plan validator: ${validator.kind}`)
  }
}
export const AI_PLAN_SCHEMA = toJsonSchema(generatedPlanValidator)
export const generationResultValidator = v.object({ reportId: v.id('reports'), blockCount: v.number(), skipped: v.number() })
export type GenerationResult = Infer<typeof generationResultValidator>

export const createGenerated = internalMutation({
  args: { workspaceId: v.id('workspaces'), name: v.string(), intent: schema.tables.reports.validator.fields.intent, plan: generatedPlanValidator, sourceGameIds: v.optional(v.array(v.id('sourceGames'))) },
  returns: generationResultValidator,
  handler: async (ctx, { workspaceId, name, intent, plan, sourceGameIds }): Promise<GenerationResult> => {
    await requireLiveWorkspace(ctx, workspaceId)
    const reportName = requireName(name)
    const scope = (await loadScope(ctx, workspaceId))!
    const brief = await loadBrief(ctx, workspaceId, scope)
    const budget = generatedReportBudget({ totalSnaps: brief.totalSnaps, tendencyCount: brief.tendencies.length, groupings: brief.groupings, intent })
    if (sourceGameIds && (sourceGameIds.length !== brief.snapColumns.length || brief.snapColumns.some((game) => !sourceGameIds.includes(game.sourceGameId)))) {
      throw new ConvexError('Included Source Games changed while building the Report. Try again.')
    }
    const blocks: Doc<'reports'>['blocks'] = []
    let skipped = 0
    type ReportBlock = Doc<'reports'>['blocks'][number]
    async function materialize(entry: Infer<typeof sectionBlockValidator>, sectionFilter?: { groupBy: string; value: string }): Promise<ReportBlock> {
      let source: Infer<typeof blockSourceValidator>
      switch (entry.type) {
        case 'dataTable':
          if (![entry.groupBy, ...(entry.groupBy2 ? [entry.groupBy2] : [])].every((key) => brief.groupings.some((field) => field.key === key))) throw new Error('Grouping Field not available')
          if (sectionFilter && !brief.groupings.some((field) => field.key === sectionFilter.groupBy &&
            (field.rows.some((row) => row.values.includes(sectionFilter.value)) ||
              (sectionFilter.groupBy === 'core:formation' && brief.formationBreakdowns.some((formation) => formation.value === sectionFilter.value))))) throw new Error('Filter not available')
          source = { ...entry, title: entry.title.slice(0, TABLE_TITLE_MAX_LENGTH), ...(sectionFilter ? { filter: sectionFilter } : {}) }
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
          if (!budget.allowSelectedPlays) throw new Error('Selected Plays are not included in Player Reports')
          const games = brief.snapColumns.filter((game) => game.sourceGameLabel === entry.sourceGameLabel)
          if (games.length !== 1 || !Number.isSafeInteger(entry.limit) || entry.limit < 1) throw new Error('Source Game or Snap selection not available')
          const game = await ctx.db.get(games[0]!.sourceGameId)
          if (!game) throw new Error('Source Game not found')
          const fields = scope.templateFields.get(game._id) ?? []
          const field = groupingFieldsFor([fields]).find((field) => field.key === entry.groupingKey)
          if (!field || !brief.groupings.some((group) => group.key === field.key && group.rows.some((row) => row.values.includes(entry.groupingValue)))) throw new Error('Grouping Field not available')
          const templateFieldId = fields.find((candidate) => templateGroupingKey(candidate) === field.key)?._id
          const snaps = scope.snaps
            .filter((snap) => snap.sourceGameId === game._id && groupingValuesOf(snap, field, templateFieldId).includes(entry.groupingValue))
            .sort((a, b) => a.order - b.order).slice(0, Math.min(entry.limit, 12))
          if (!snaps.length) throw new Error('No matching Snaps')
          source = { type: entry.type, sourceGameId: game._id, snapIds: snaps.map((snap) => snap._id), columnKeys: DEFAULT_SELECTED_PLAY_CORE_KEYS.map(coreColumnKey) }
          break
        }
      }

      return buildBlock(ctx, { workspaceId }, source, scope)
    }
    const heading = (text: string): ReportBlock => ({ id: crypto.randomUUID(), type: 'heading', text: text.slice(0, HEADING_MAX_LENGTH) })
    const text = (value: string): ReportBlock => ({ id: crypto.randomUUID(), type: 'text', text: value })
    const slot = (label: string, value: string, max: number): ReportBlock => text(value.trim() ? `${label} ${value.trim().slice(0, max)}` : `${label}\n\n`)
    blocks.push(heading('Game-Plan Summary'), slot(IDENTITY_SLOT_LABEL, plan.summary.identity, AI_IDENTITY_MAX_LENGTH))
    try {
      const table = await materialize({ type: 'dataTable', ...plan.summary.identityTable })
      if (table.type === 'dataTable') table.rows = table.rows.slice(0, AI_IDENTITY_TABLE_MAX_ROWS)
      blocks.push(table)
    } catch { skipped += 1 }
    const priorities = plan.summary.priorities.map((priority) => priority.trim()).filter(Boolean).slice(0, AI_MAX_PRIORITIES)
    blocks.push(text(priorities.length ? `${PRIORITIES_SLOT_LABEL}\n${priorities.map((priority, index) => `${index + 1}. ${priority.slice(0, AI_PRIORITY_MAX_LENGTH)}`).join('\n')}` : `${PRIORITIES_SLOT_LABEL}\n1.\n2.\n3.`))
    const alerts = [...new Set(plan.summary.alertTendencyIds)].flatMap((id) => {
      const tendency = brief.tendencies.find((tendency) => tendency.id === id)
      return tendency ? [tendency] : []
    }).slice(0, AI_MAX_ALERTS)
    blocks.push(text(alerts.length ? `${ALERTS_SLOT_LABEL}\n${alerts.map((tendency) => `• ${tendency.title} (${tendency.category})`).join('\n')}` : `${ALERTS_SLOT_LABEL}\n•\n•`),
      { id: crypto.randomUUID(), type: 'pageBreak' }, heading('Tendency Report'))
    // ponytail: skipped blocks are counted, not explained; surface per-block reasons if coaches start asking which block vanished.
    for (const kind of SECTION_KIND_ORDER) {
      const sections = plan.tendencySections.filter((section) => section.kind === kind)
      const limit = budget[`${kind}Sections`]
      skipped += Math.max(0, sections.length - limit)
      let hasGroupHeading = false
      for (const section of sections.slice(0, limit)) {
        if (kind === 'formation' && (section.filter?.groupBy !== 'core:formation' ||
          !brief.formationBreakdowns.some((formation) => formation.value === section.filter?.value))) { skipped += 1; continue }
        skipped += Math.max(0, section.blocks.length - budget.blocksPerSection)
        const content: ReportBlock[] = []
        for (const entry of section.blocks.slice(0, budget.blocksPerSection)) {
          try { content.push(await materialize(entry, section.filter)) } catch { skipped += 1 }
        }
        if (!content.length) continue
        if (!hasGroupHeading) { blocks.push(heading(SECTION_KIND_HEADING[kind])); hasGroupHeading = true }
        const titled = content.find((block) => block.type === 'dataTable' || block.type === 'tendency')
        blocks.push(heading(section.title.trim() || section.filter?.value || (titled && 'title' in titled ? titled.title : SECTION_KIND_HEADING[kind])), ...content)
        if (kind !== 'evidence' || !content.some((block) => block.type === 'tendency' && block.note.trim())) {
          blocks.push(slot(COUNTER_SLOT_LABEL, section.counter, AI_COUNTER_MAX_LENGTH))
        }
      }
    }
    if (!blocks.some((block) => block.type !== 'heading' && block.type !== 'text' && block.type !== 'pageBreak')) throw new ConvexError('The generated Report had no usable content. Try again.')
    if (blocks.length > AI_PLAN_MAX_BLOCKS) throw new ConvexError(`A Generated Report can have at most ${AI_PLAN_MAX_BLOCKS} Blocks.`)
    requireSize(blocks)
    const reportId = await ctx.db.insert('reports', { workspaceId, name: reportName, intent, showClipReferences: intent === 'coach', blocks, updatedAt: Date.now() })
    return { reportId, blockCount: blocks.length, skipped }
  },
})
