import { CORE_FIELDS, formatCoreValue } from './domain/coreFields.ts'
import { analysisValueText, columnCatalog, coreColumnKey, fieldColumnKey } from './domain/templateFields.ts'
import { formatAvgYards, formatFrequency } from './domain/aggregate.ts'
import { CLIP_REFERENCE_LABEL, playerReportName, HEADING_MAX_LENGTH, TEXT_BLOCK_MAX_LENGTH, CAPTION_MAX_LENGTH, REPORT_BLOCKS_MAX_BYTES, SELECTED_PLAYS_MAX_SNAPS, SELECTED_PLAYS_MAX_COLUMNS, QUICK_NOTES_BLOCK_MAX_NOTES, TABLE_TITLE_MAX_LENGTH, uniqueLabels } from './domain/reportBlocks.ts'
import { computeResult } from './opponentData'
import { isLiveSourceGame, requireLiveSourceGame } from './sourceGames'
import { templateTree } from './templates'
import { v, type Infer } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server'
import { normalizeName } from './domain/names.ts'
import schema from './schema'
import { requireLiveWorkspace } from './workspaces'
import { softDeleteBatch } from './deletions'

const reportValidator = v.object({ ...schema.tables.reports.validator.fields, _id: v.id('reports'), _creationTime: v.number() })

export function requireName(value: string): string {
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

type ReportBlock = Doc<'reports'>['blocks'][number]

export function requireSize(blocks: ReportBlock[]): void {
  // ponytail: inline blocks stop at 800 KB; move blocks to their own table for larger reports.
  if (new TextEncoder().encode(JSON.stringify(blocks)).length > REPORT_BLOCKS_MAX_BYTES) throw new Error('Report is too large. Split it into another report.')
}
function requireSelection(values: readonly string[], max: number, label: string): void {
  if (values.length < 1 || values.length > max || new Set(values).size !== values.length) throw new Error(`Select 1–${max} unique ${label}`)
}
function diagramSnapshot(diagram: Doc<'diagrams'>) {
  const { name, note, players, shapes, updatedAt, hiddenSide } = diagram
  return { players, shapes, updatedAt, ...(name !== undefined ? { name } : {}), ...(note !== undefined ? { note } : {}), ...(hiddenSide ? { hiddenSide } : {}) }
}
async function liveDiagram(ctx: QueryCtx, id: Id<'diagrams'>, workspaceId: Id<'workspaces'>) {
  const diagram = await ctx.db.get(id)
  const game = diagram ? await ctx.db.get(diagram.sourceGameId) : null
  return diagram && diagram.deletedAt === undefined && game?.workspaceId === workspaceId && await isLiveSourceGame(ctx, game._id) ? diagram : null
}

export const blockSourceValidator = v.union(
  v.object({ type: v.literal('heading') }), v.object({ type: v.literal('text') }),
  v.object({ type: v.literal('dataTable'), groupBy: v.string(), groupBy2: v.optional(v.string()), title: v.string() }),
  v.object({ type: v.literal('tendency'), tendencyId: v.id('tendencies') }),
  v.object({ type: v.literal('diagram'), diagramId: v.id('diagrams') }),
  v.object({ type: v.literal('selectedPlays'), sourceGameId: v.id('sourceGames'), snapIds: v.array(v.id('snaps')), columnKeys: v.array(v.string()) }),
  v.object({ type: v.literal('quickNotes'), noteIds: v.array(v.id('quickNotes')) }),
)
type BlockSource = Infer<typeof blockSourceValidator>

export async function buildBlock(ctx: MutationCtx, report: Pick<Doc<'reports'>, 'workspaceId'>, source: BlockSource): Promise<ReportBlock> {
  const id = crypto.randomUUID()
  switch (source.type) {
    case 'heading': case 'text': return { id, type: source.type, text: '' }
    case 'dataTable': {
      if (source.title.length > TABLE_TITLE_MAX_LENGTH) throw new Error(`Title must be at most ${TABLE_TITLE_MAX_LENGTH} characters`)
      const computed = await computeResult(ctx, { workspaceId: report.workspaceId, groupBy: source.groupBy, ...(source.groupBy2 ? { groupBy2: source.groupBy2 } : {}) })
      if (!computed) throw new Error('Grouping Field not available')
      if (!computed.result.totalSnaps) throw new Error('No Snaps in the included Source Games')
      return { id, type: source.type, title: source.title || computed.groupLabels.join(' + ').slice(0, TABLE_TITLE_MAX_LENGTH), columns: [...computed.groupLabels, 'Snaps', 'Frequency', 'Avg. Yards'], rows: computed.result.rows.map((row) => [...row.values, String(row.snaps), formatFrequency(row.frequency), formatAvgYards(row.avgYards)]) }
    }
    case 'tendency': {
      const tendency = await ctx.db.get(source.tendencyId)
      if (!tendency || tendency.deletedAt !== undefined || tendency.workspaceId !== report.workspaceId) throw new Error('Tendency / Alert not found')
      const diagram = tendency.diagramId ? await liveDiagram(ctx, tendency.diagramId, report.workspaceId) : null
      return { id, type: source.type, title: tendency.title, category: tendency.category, note: tendency.note, groupBy: tendency.snapshot.groupBy, ...(tendency.snapshot.groupBy2 ? { groupBy2: tendency.snapshot.groupBy2 } : {}), rows: tendency.snapshot.rows, ...(diagram ? { diagram: diagramSnapshot(diagram) } : {}) }
    }
    case 'diagram': {
      const diagram = await liveDiagram(ctx, source.diagramId, report.workspaceId)
      if (!diagram) throw new Error('Play Diagram not found')
      return { id, type: source.type, diagram: diagramSnapshot(diagram), ...(diagram.name ? { caption: diagram.name } : {}) }
    }
    case 'selectedPlays': {
      const game = await requireLiveSourceGame(ctx, source.sourceGameId)
      if (game.workspaceId !== report.workspaceId) throw new Error('Source Game not found')
      requireSelection(source.snapIds, SELECTED_PLAYS_MAX_SNAPS, 'Snaps')
      requireSelection(source.columnKeys, SELECTED_PLAYS_MAX_COLUMNS, 'columns')
      const template = await ctx.db.get(game.templateId)
      const fields = template && template.deletedAt === undefined ? (await templateTree(ctx, game.templateId)).flatMap((section) => section.fields) : []
      const catalog = new Set<string>(columnCatalog(fields.map((field) => field._id)))
      if (source.columnKeys.some((key) => !catalog.has(key))) throw new Error('Unknown column')
      const columns = source.columnKeys.map((key) => {
        const core = CORE_FIELDS.find((field) => coreColumnKey(field.key) === key)
        const field = fields.find((field) => fieldColumnKey(field._id) === key)
        return { core, field, label: core?.label ?? field!.name }
      })
      const nonClipLabels = uniqueLabels([CLIP_REFERENCE_LABEL, ...columns.filter((column) => column.core?.key !== 'clipNumber').map((column) => column.label)])
      let labelIndex = 1
      const labels = columns.map((column) => column.core?.key === 'clipNumber' ? CLIP_REFERENCE_LABEL : nonClipLabels[labelIndex++]!)
      const snaps = await Promise.all(source.snapIds.map(async (snapId) => {
        const snap = await ctx.db.get(snapId)
        if (!snap || snap.deletedAt !== undefined || snap.sourceGameId !== game._id) throw new Error('Snap not found')
        return snap
      }))
      return { id, type: source.type, fields: labels, rows: snaps.sort((a, b) => a.order - b.order).map((snap) => Object.fromEntries(columns.map((column, index) => [labels[index]!, column.core ? formatCoreValue(column.core.key, snap.core[column.core.key]) : analysisValueText(snap.analysis[column.field!._id])])) ) }
    }
    case 'quickNotes': {
      requireSelection(source.noteIds, QUICK_NOTES_BLOCK_MAX_NOTES, 'Quick Notes')
      const notes = await Promise.all(source.noteIds.map(async (noteId) => {
        const note = await ctx.db.get(noteId)
        const game = note ? await ctx.db.get(note.sourceGameId) : null
        const snap = note?.snapId ? await ctx.db.get(note.snapId) : null
        if (!note || note.deletedAt !== undefined || !game || game.workspaceId !== report.workspaceId || !await isLiveSourceGame(ctx, game._id) || (note.snapId && (!snap || snap.deletedAt !== undefined))) throw new Error('Quick Note not found')
        return note
      }))
      return { id, type: source.type, notes: notes.sort((a, b) => a.createdAt - b.createdAt).map(({ text, tags }) => ({ text, tags })) }
    }
  }
}

export const insertBlock = mutation({
  args: { reportId: v.id('reports'), source: blockSourceValidator }, returns: v.string(),
  handler: async (ctx, { reportId, source }) => {
    const report = await requireLiveReport(ctx, reportId)
    const block = await buildBlock(ctx, report, source)
    const blocks = [...report.blocks, block]
    requireSize(blocks)
    await ctx.db.patch(reportId, { blocks, updatedAt: Date.now() })
    return block.id
  },
})

const blockValidator = schema.tables.reports.validator.fields.blocks.element

function requireTextLimit(block: ReportBlock): void {
  const value = block.type === 'heading' || block.type === 'text' ? block.text : block.type === 'diagram' ? block.caption ?? '' : block.type === 'dataTable' ? block.title : ''
  const max = block.type === 'heading' ? HEADING_MAX_LENGTH : block.type === 'text' ? TEXT_BLOCK_MAX_LENGTH : block.type === 'diagram' ? CAPTION_MAX_LENGTH : TABLE_TITLE_MAX_LENGTH
  if (value.length > max) throw new Error(`Block text must be at most ${max} characters`)
}

export const updateBlockText = mutation({
  args: { reportId: v.id('reports'), blockId: v.string(), value: v.string() }, returns: v.null(),
  handler: async (ctx, { reportId, blockId, value }) => {
    const report = await requireLiveReport(ctx, reportId)
    const block = report.blocks.find((block) => block.id === blockId)
    if (!block) throw new Error('Block not found')
    let updated: ReportBlock
    switch (block.type) {
      case 'heading': case 'text': updated = { ...block, text: value }; break
      case 'diagram':
        updated = { ...block, caption: value }
        if (!value) delete updated.caption
        break
      case 'dataTable': updated = { ...block, title: value }; break
      default: throw new Error("This block's content is a snapshot and cannot be edited")
    }
    requireTextLimit(updated)
    const blocks = report.blocks.map((block) => block.id === blockId ? updated : block)
    requireSize(blocks)
    await ctx.db.patch(reportId, { blocks, updatedAt: Date.now() })
    return null
  },
})
export const reorderBlocks = mutation({
  args: { reportId: v.id('reports'), blockIds: v.array(v.string()) }, returns: v.null(),
  handler: async (ctx, { reportId, blockIds }) => {
    const report = await requireLiveReport(ctx, reportId)
    const byId = new Map(report.blocks.map((block) => [block.id, block]))
    if (blockIds.length !== report.blocks.length || new Set(blockIds).size !== blockIds.length || blockIds.some((id) => !byId.has(id))) throw new Error('Report changed. Try again.')
    await ctx.db.patch(reportId, { blocks: blockIds.map((id) => byId.get(id)!), updatedAt: Date.now() })
    return null
  },
})
export const removeBlock = mutation({
  args: { reportId: v.id('reports'), blockId: v.string() }, returns: v.object({ block: blockValidator, index: v.number() }),
  handler: async (ctx, { reportId, blockId }) => {
    const report = await requireLiveReport(ctx, reportId)
    const index = report.blocks.findIndex((block) => block.id === blockId)
    const block = report.blocks[index]
    if (!block) throw new Error('Block not found')
    await ctx.db.patch(reportId, { blocks: report.blocks.filter((block) => block.id !== blockId), updatedAt: Date.now() })
    return { block, index }
  },
})
export const restoreBlock = mutation({
  args: { reportId: v.id('reports'), block: blockValidator, index: v.number() }, returns: v.null(),
  handler: async (ctx, { reportId, block, index }) => {
    const report = await requireLiveReport(ctx, reportId)
    if (report.blocks.some((item) => item.id === block.id)) throw new Error('Block already exists')
    if (!Number.isSafeInteger(index)) throw new Error('Invalid block position')
    requireTextLimit(block)
    const blocks = [...report.blocks]
    blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, block)
    requireSize(blocks)
    await ctx.db.patch(reportId, { blocks, updatedAt: Date.now() })
    return null
  },
})

export const duplicateAsPlayerReport = mutation({
  args: { reportId: v.id('reports') }, returns: v.id('reports'),
  handler: async (ctx, { reportId }) => {
    const report = await requireLiveReport(ctx, reportId)
    if (report.intent !== 'coach') throw new Error('Only a Coach Report can be duplicated as a Player Report')
    return ctx.db.insert('reports', { workspaceId: report.workspaceId, name: playerReportName(report.name), intent: 'player', showClipReferences: false, blocks: structuredClone(report.blocks), updatedAt: Date.now() })
  },
})
