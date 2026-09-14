import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import schema, { analysisValueValidator } from './schema'
import type { Doc, Id } from './_generated/dataModel'
import { requireLiveSourceGame } from './sourceGames'
import { CARRY_FORWARD_CORE_KEYS, getCoreField, isCoreFieldKey, normalizeCoreValue } from './domain/coreFields.ts'
import { restoredValueFor } from './domain/provenance.ts'
import { normalizeAnalysisValue } from './domain/templateFields.ts'

const snapValidator = v.object({
  ...schema.tables.snaps.validator.fields,
  _id: v.id('snaps'), _creationTime: v.number(),
})

export const listBySourceGame = query({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.array(snapValidator),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.sourceGameId)
    if (!game || game.deletedAt !== undefined) return []
    const workspace = await ctx.db.get(game.workspaceId)
    if (!workspace || workspace.deletedAt !== undefined) return []
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return []
    return (await ctx.db.query('snaps')
      .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', args.sourceGameId)).collect())
      .filter((snap) => snap.deletedAt === undefined)
  },
})

async function requireLiveSnap(ctx: MutationCtx, id: Id<'snaps'>): Promise<Doc<'snaps'>> {
  const snap = await ctx.db.get(id)
  if (!snap || snap.deletedAt !== undefined) throw new Error('Snap not found')
  await requireLiveSourceGame(ctx, snap.sourceGameId)
  return snap
}

export const updateCore = mutation({
  args: {
    snapId: v.id('snaps'), key: v.string(),
    value: v.optional(v.union(v.string(), v.number(), v.object({
      side: v.union(v.literal('own'), v.literal('mid'), v.literal('opp')), yard: v.number(),
    }))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const snap = await requireLiveSnap(ctx, args.snapId)
    if (!isCoreFieldKey(args.key)) throw new Error('Unknown Core Snap field')
    const value = normalizeCoreValue(args.key, args.value)
    const core = { ...snap.core }
    if (value === undefined) delete core[args.key]
    else Object.assign(core, { [args.key]: value })
    await ctx.db.patch(snap._id, { core })
    return null
  },
})

export const updateAnalysis = mutation({
  args: { snapId: v.id('snaps'), fieldId: v.id('templateFields'), value: v.union(analysisValueValidator, v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const snap = await requireLiveSnap(ctx, args.snapId)
    const game = await requireLiveSourceGame(ctx, snap.sourceGameId)
    const field = await ctx.db.get(args.fieldId)
    if (!field || field.deletedAt !== undefined || field.templateId !== game.templateId) throw new Error('Template Field not found')
    const section = await ctx.db.get(field.sectionId)
    if (!section || section.deletedAt !== undefined || section.templateId !== game.templateId) throw new Error('Section not found')
    const template = await ctx.db.get(game.templateId)
    if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
    const value = normalizeAnalysisValue(field, args.value)
    const analysis = { ...snap.analysis }
    if (value === null) delete analysis[args.fieldId]
    else analysis[args.fieldId] = value
    await ctx.db.patch(snap._id, { analysis })
    return null
  },
})

export const create = mutation({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.id('snaps'),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    const template = await ctx.db.get(game.templateId)
    if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
    const last = await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id))
      .order('desc').filter((q) => q.eq(q.field('deletedAt'), undefined)).first()
    const core: Doc<'snaps'>['core'] = {}
    const analysis: Doc<'snaps'>['analysis'] = {}
    if (last) {
      for (const key of CARRY_FORWARD_CORE_KEYS) {
        if (last.core[key] !== undefined) core[key] = last.core[key]
      }
      const fields = await ctx.db.query('templateFields').withIndex('by_template', (q) => q.eq('templateId', game.templateId)).collect()
      const sections = await ctx.db.query('templateSections').withIndex('by_template', (q) => q.eq('templateId', game.templateId)).collect()
      const liveSections = new Set(sections.filter((section) => section.deletedAt === undefined).map((section) => section._id))
      for (const field of fields) {
        if (field.deletedAt === undefined && field.carryForward && liveSections.has(field.sectionId) && last.analysis[field._id] !== undefined) {
          analysis[field._id] = last.analysis[field._id]!
        }
      }
    }
    return ctx.db.insert('snaps', {
      sourceGameId: game._id, order: (last?.order ?? 0) + 1, core, analysis, mustReview: false, createdAt: Date.now(),
    })
  },
})

export const restoreImportedValue = mutation({
  args: { snapId: v.id('snaps'), key: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const snap = await requireLiveSnap(ctx, args.snapId)
    if (!isCoreFieldKey(args.key)) throw new Error('Unknown Core Snap field')
    const label = getCoreField(args.key).label
    const original = restoredValueFor(snap.imported, args.key)
    if (original === null) throw new Error(`No imported value for ${label}`)
    let value
    try { value = normalizeCoreValue(args.key, original) }
    catch { throw new Error(`Original value "${original}" is not a valid ${label}`) }
    const core = { ...snap.core }
    if (value === undefined) delete core[args.key]
    else Object.assign(core, { [args.key]: value })
    await ctx.db.patch(snap._id, { core })
    return null
  },
})

export const bulkUpdate = mutation({
  args: {
    sourceGameId: v.id('sourceGames'), snapIds: v.array(v.id('snaps')),
    target: v.union(v.object({ kind: v.literal('core'), key: v.string() }),
      v.object({ kind: v.literal('template'), fieldId: v.id('templateFields') })),
    value: v.union(analysisValueValidator, v.null()),
  },
  returns: v.id('bulkEdits'),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    if (!args.snapIds.length) throw new Error('Select at least one Snap')
    const target = args.target
    let value
    let fieldKey: string
    if (target.kind === 'core') {
      if (target.key === 'yardLine') throw new Error('Yard Line cannot be bulk edited')
      if (!isCoreFieldKey(target.key)) throw new Error('Unknown Core Snap field')
      value = normalizeCoreValue(target.key, args.value) ?? null
      fieldKey = `core:${target.key}`
    } else {
      const field = await ctx.db.get(target.fieldId)
      if (!field || field.deletedAt !== undefined || field.templateId !== game.templateId) throw new Error('Template Field not found')
      const section = await ctx.db.get(field.sectionId)
      if (!section || section.deletedAt !== undefined || section.templateId !== game.templateId) throw new Error('Section not found')
      const template = await ctx.db.get(game.templateId)
      if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
      value = normalizeAnalysisValue(field, args.value)
      fieldKey = `field:${field._id}`
    }
    const snaps = await Promise.all([...new Set(args.snapIds)].map((id) => requireLiveSnap(ctx, id)))
    if (snaps.some((snap) => snap.sourceGameId !== game._id)) throw new Error('Snap belongs to another Source Game')
    const changes = snaps.map((snap) => {
      const before = target.kind === 'core' && isCoreFieldKey(target.key) ? snap.core[target.key] :
        target.kind === 'template' ? snap.analysis[target.fieldId] : undefined
      if (typeof before === 'object' && before !== null && !Array.isArray(before)) throw new Error('Yard Line cannot be bulk edited')
      return { snapId: snap._id, fieldKey, before: before ?? null }
    })
    const id = await ctx.db.insert('bulkEdits', { sourceGameId: game._id, createdAt: Date.now(), changes })
    // ponytail: 200 Snaps in one transaction; chunk if Convex write limits appear.
    for (const snap of snaps) {
      if (target.kind === 'core' && isCoreFieldKey(target.key)) {
        const core = { ...snap.core }
        if (value === null) delete core[target.key]
        else Object.assign(core, { [target.key]: value })
        await ctx.db.patch(snap._id, { core })
      } else if (target.kind === 'template') {
        const analysis = { ...snap.analysis }
        if (value === null) delete analysis[target.fieldId]
        else if (typeof value !== 'object' || Array.isArray(value)) analysis[target.fieldId] = value
        await ctx.db.patch(snap._id, { analysis })
      }
    }
    return id
  },
})

export const undoBulkUpdate = mutation({
  args: { bulkEditId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('bulkEdits', args.bulkEditId)
    const edit = id ? await ctx.db.get(id) : null
    if (!edit) throw new Error('Bulk edit not found')
    await requireLiveSourceGame(ctx, edit.sourceGameId)
    for (const change of edit.changes) {
      const snap = await ctx.db.get(change.snapId)
      if (!snap || snap.deletedAt !== undefined) continue
      if (snap.sourceGameId !== edit.sourceGameId) throw new Error('Snap belongs to another Source Game')
      if (change.fieldKey.startsWith('core:')) {
        const key = change.fieldKey.slice(5)
        if (!isCoreFieldKey(key)) throw new Error('Unknown Core Snap field')
        const value = normalizeCoreValue(key, change.before)
        const core = { ...snap.core }
        if (value === undefined) delete core[key]
        else Object.assign(core, { [key]: value })
        await ctx.db.patch(snap._id, { core })
      } else {
        const analysis = { ...snap.analysis }
        const key = change.fieldKey.slice(6)
        if (change.before === null) delete analysis[key]
        else analysis[key] = change.before
        await ctx.db.patch(snap._id, { analysis })
      }
    }
    await ctx.db.delete(edit._id)
    return null
  },
})
