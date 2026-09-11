import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { softDeleteBatch } from './deletions'
import { getStarterTemplate, isCoachingArea, type StarterSection } from './domain/starterTemplates.ts'
import {
  NAME_MAX_LENGTH, normalizeName, normalizeOptions, hasOptions, hasAnalysisValue,
} from './domain/templateFields.ts'

type ReadCtx = QueryCtx | MutationCtx

async function requireLiveTemplate(ctx: ReadCtx, id: Id<'templates'>) {
  const template = await ctx.db.get(id)
  if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
  return template
}

async function requireLiveSection(ctx: ReadCtx, id: Id<'templateSections'>) {
  const section = await ctx.db.get(id)
  if (!section || section.deletedAt !== undefined) throw new Error('Section not found')
  await requireLiveTemplate(ctx, section.templateId)
  return section
}

async function requireLiveField(ctx: ReadCtx, id: Id<'templateFields'>) {
  const field = await ctx.db.get(id)
  if (!field || field.deletedAt !== undefined) throw new Error('Template Field not found')
  await requireLiveSection(ctx, field.sectionId)
  await requireLiveTemplate(ctx, field.templateId)
  return field
}

async function countFieldUsage(ctx: ReadCtx, templateId: Id<'templates'>, fieldIds: ReadonlySet<string>) {
  if (fieldIds.size === 0) return 0
  // ponytail: scans Source Games and their Snaps at V1 volume; index template usage if scans become slow.
  const games = await ctx.db.query('sourceGames').filter((q) => q.and(
    q.eq(q.field('templateId'), templateId), q.eq(q.field('deletedAt'), undefined),
  )).collect()
  let count = 0
  for (const game of games) {
    const snaps = await ctx.db.query('snaps')
      .withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect()
    count += snaps.filter((snap) => snap.deletedAt === undefined && [...fieldIds]
      .some((id) => hasAnalysisValue(snap.analysis[id]))).length
  }
  return count
}

function requireName(value: string): string {
  const name = normalizeName(value)
  if (name === null) throw new Error('Name must be 1–80 characters')
  return name
}

async function templateTree(ctx: ReadCtx, templateId: Id<'templates'>) {
  const sections = await ctx.db.query('templateSections')
    .withIndex('by_template', (q) => q.eq('templateId', templateId)).collect()
  const fields = await ctx.db.query('templateFields')
    .withIndex('by_template', (q) => q.eq('templateId', templateId)).collect()
  return sections.filter((section) => section.deletedAt === undefined)
    .sort((a, b) => a.order - b.order)
    .map((section) => ({ ...section, fields: fields
      .filter((field) => field.deletedAt === undefined && field.sectionId === section._id)
      .sort((a, b) => a.order - b.order) }))
}

async function insertTemplateTree(ctx: MutationCtx, args: {
  name: string
  coachingArea: string
  isStarter: boolean
  sections: readonly (Omit<StarterSection, 'fields'> & {
    readonly fields: readonly (StarterSection['fields'][number] & {
      readonly _id?: Id<'templateFields'>
      readonly required?: boolean
      readonly carryForward?: boolean
    })[]
  })[]
}) {
  const templateId = await ctx.db.insert('templates', {
    name: requireName(args.name), coachingArea: args.coachingArea,
    isStarter: args.isStarter, createdAt: Date.now(),
  })
  const fieldIds = new Map<string, string>()
  for (const [order, section] of args.sections.entries()) {
    const sectionId = await ctx.db.insert('templateSections', {
      templateId, name: section.name, order,
    })
    for (const [fieldOrder, field] of section.fields.entries()) {
      const id = await ctx.db.insert('templateFields', {
        templateId, sectionId, name: field.name, type: field.type,
        options: [...field.options], required: field.required ?? false,
        carryForward: field.carryForward ?? false, order: fieldOrder,
      })
      if (field._id) fieldIds.set(field._id, id)
    }
  }
  return { templateId, fieldIds }
}

const templateValidator = v.object({
  ...schema.tables.templates.validator.fields,
  _id: v.id('templates'), _creationTime: v.number(),
})
const fieldValidator = v.object({
  ...schema.tables.templateFields.validator.fields,
  _id: v.id('templateFields'), _creationTime: v.number(),
})
const fullValidator = v.object({
  template: templateValidator,
  sections: v.array(v.object({
    ...schema.tables.templateSections.validator.fields,
    _id: v.id('templateSections'), _creationTime: v.number(), fields: v.array(fieldValidator),
  })),
})

/** Lists only live Coaching Templates. */
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('templates'), name: v.string(), coachingArea: v.string(),
    isStarter: v.boolean(), createdAt: v.number(),
  })),
  handler: async (ctx) => (await ctx.db.query('templates').collect())
    .filter((template) => template.deletedAt === undefined)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ _id, name, coachingArea, isStarter, createdAt }) =>
      ({ _id, name, coachingArea, isStarter, createdAt })),
})

/** Invalid route parameters and deleted templates resolve to not found. */
export const getFull = query({
  args: { templateId: v.string() },
  returns: v.union(fullValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('templates', args.templateId)
    if (!id) return null
    const template = await ctx.db.get(id)
    if (!template || template.deletedAt !== undefined) return null
    return { template, sections: await templateTree(ctx, id) }
  },
})

/** Blank templates start in the general Coaching Area. */
export const create = mutation({
  args: { name: v.string() }, returns: v.id('templates'),
  handler: async (ctx, args) => (await insertTemplateTree(ctx, {
    name: args.name, coachingArea: 'Custom / General', isStarter: false, sections: [],
  })).templateId,
})

/** Each installation is an independent editable tree. */
export const installStarter = mutation({
  args: { coachingArea: v.string() }, returns: v.id('templates'),
  handler: async (ctx, args) => {
    if (!isCoachingArea(args.coachingArea)) throw new Error('Unknown Coaching Area')
    return (await insertTemplateTree(ctx, {
      ...getStarterTemplate(args.coachingArea), isStarter: true,
    })).templateId
  },
})

/** Copies live fields and rewrites view references to their new identities. */
export const duplicate = mutation({
  args: { templateId: v.id('templates') }, returns: v.id('templates'),
  handler: async (ctx, args) => {
    const template = await requireLiveTemplate(ctx, args.templateId)
    const { templateId, fieldIds } = await insertTemplateTree(ctx, {
      name: `${template.name.slice(0, NAME_MAX_LENGTH - 7)} (copy)`,
      coachingArea: template.coachingArea, isStarter: false,
      sections: await templateTree(ctx, args.templateId),
    })
    const views = await ctx.db.query('templateViews')
      .withIndex('by_template', (q) => q.eq('templateId', args.templateId)).collect()
    const remap = (keys: string[]): string[] => keys.flatMap((key) => {
      if (!key.startsWith('field:')) return [key]
      const id = fieldIds.get(key.slice(6))
      return id ? [`field:${id}`] : []
    })
    for (const view of views) await ctx.db.insert('templateViews', {
      templateId, name: view.name, visibleColumns: remap(view.visibleColumns),
      columnOrder: remap(view.columnOrder),
    })
    return templateId
  },
})

/** Names are trimmed, bounded, and need not be unique. */
export const rename = mutation({
  args: { templateId: v.id('templates'), name: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveTemplate(ctx, args.templateId)
    await ctx.db.patch(args.templateId, { name: requireName(args.name) })
    return null
  },
})

/** Deleting a template leaves Snap analysis values recoverable through Undo. */
export const remove = mutation({
  args: { templateId: v.id('templates') }, returns: v.string(),
  handler: async (ctx, args) => {
    const template = await requireLiveTemplate(ctx, args.templateId)
    const sections = await templateTree(ctx, args.templateId)
    const fields = await ctx.db.query('templateFields')
      .withIndex('by_template', (q) => q.eq('templateId', args.templateId)).collect()
    // ponytail: views survive Undo but become unreachable after purge; collect orphans if storage matters.
    return softDeleteBatch(ctx, {
      kind: 'template', label: template.name,
      records: [
        { table: 'templates', id: template._id },
        ...sections.map(({ _id }) => ({ table: 'templateSections' as const, id: _id })),
        ...fields.filter((field) => field.deletedAt === undefined)
          .map(({ _id }) => ({ table: 'templateFields' as const, id: _id })),
      ],
    })
  },
})

/** Appends after live sections without changing existing order. */
export const addSection = mutation({
  args: { templateId: v.id('templates'), name: v.string() }, returns: v.id('templateSections'),
  handler: async (ctx, args) => {
    await requireLiveTemplate(ctx, args.templateId)
    const sections = await templateTree(ctx, args.templateId)
    return ctx.db.insert('templateSections', {
      templateId: args.templateId, name: requireName(args.name),
      order: Math.max(-1, ...sections.map((section) => section.order)) + 1,
    })
  },
})

/** Renaming never changes field identities. */
export const renameSection = mutation({
  args: { sectionId: v.id('templateSections'), name: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveSection(ctx, args.sectionId)
    await ctx.db.patch(args.sectionId, { name: requireName(args.name) })
    return null
  },
})

function requireExactOrder(ids: readonly string[], rows: readonly { _id: string }[], kind: string) {
  const unique = new Set(ids)
  if (unique.size !== ids.length || ids.length !== rows.length ||
      rows.some((row) => !unique.has(row._id))) throw new Error(`${kind} list is out of date`)
}

/** Stale or partial reorder requests change nothing. */
export const reorderSections = mutation({
  args: { templateId: v.id('templates'), sectionIds: v.array(v.id('templateSections')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveTemplate(ctx, args.templateId)
    const rows = await templateTree(ctx, args.templateId)
    requireExactOrder(args.sectionIds, rows, 'Section')
    const orders = new Map(rows.map((row) => [row._id, row.order]))
    for (const [order, id] of args.sectionIds.entries()) {
      if (orders.get(id) !== order) await ctx.db.patch(id, { order })
    }
    return null
  },
})

/** Section and live fields share one Undo batch. */
export const removeSection = mutation({
  args: { sectionId: v.id('templateSections') }, returns: v.string(),
  handler: async (ctx, args) => {
    const section = await requireLiveSection(ctx, args.sectionId)
    const fields = await ctx.db.query('templateFields')
      .withIndex('by_section', (q) => q.eq('sectionId', args.sectionId)).collect()
    return softDeleteBatch(ctx, {
      kind: 'templateSection', label: section.name,
      records: [
        { table: 'templateSections', id: section._id },
        ...fields.filter((field) => field.deletedAt === undefined)
          .map(({ _id }) => ({ table: 'templateFields' as const, id: _id })),
      ],
    })
  },
})

/** New fields are optional and do not carry forward. */
export const addField = mutation({
  args: {
    sectionId: v.id('templateSections'), name: v.string(),
    type: schema.tables.templateFields.validator.fields.type,
  },
  returns: v.id('templateFields'),
  handler: async (ctx, args) => {
    const section = await requireLiveSection(ctx, args.sectionId)
    const fields = await ctx.db.query('templateFields')
      .withIndex('by_section', (q) => q.eq('sectionId', args.sectionId)).collect()
    return ctx.db.insert('templateFields', {
      templateId: section.templateId, sectionId: section._id,
      name: requireName(args.name), type: args.type, options: [], required: false,
      carryForward: false,
      order: Math.max(-1, ...fields.filter((field) => field.deletedAt === undefined)
        .map((field) => field.order)) + 1,
    })
  },
})

/** Recorded values forbid a type change; removing options preserves those values. */
export const updateField = mutation({
  args: {
    fieldId: v.id('templateFields'), name: v.optional(v.string()),
    type: v.optional(schema.tables.templateFields.validator.fields.type),
    options: v.optional(v.array(v.string())), required: v.optional(v.boolean()),
    carryForward: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const field = await requireLiveField(ctx, args.fieldId)
    const type = args.type ?? field.type
    if (type !== field.type && await countFieldUsage(ctx, field.templateId, new Set([field._id]))) {
      throw new Error('This field holds data; its type cannot change')
    }
    const patch: Partial<Pick<typeof field, 'name' | 'type' | 'options' | 'required' | 'carryForward'>> = {}
    if (args.name !== undefined) patch.name = requireName(args.name)
    if (args.type !== undefined) patch.type = type
    if (!hasOptions(type)) patch.options = []
    if (args.options !== undefined) {
      if (!hasOptions(type)) throw new Error('This field type does not have options')
      const options = normalizeOptions(args.options)
      if (options === null) throw new Error('Options must be unique')
      patch.options = options
    }
    if (args.required !== undefined) patch.required = args.required
    if (args.carryForward !== undefined) patch.carryForward = args.carryForward
    await ctx.db.patch(field._id, patch)
    return null
  },
})

/** Exact option strings are idempotent; no aliasing or case folding. */
export const addFieldOption = mutation({
  args: { fieldId: v.id('templateFields'), option: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const field = await requireLiveField(ctx, args.fieldId)
    if (!hasOptions(field.type)) throw new Error('This field type does not have options')
    const option = args.option.trim()
    if (!option) throw new Error('Option must not be empty')
    if (!field.options.includes(option)) {
      await ctx.db.patch(field._id, { options: [...field.options, option] })
    }
    return null
  },
})

/** Fields reorder only within their live Section. */
export const reorderFields = mutation({
  args: { sectionId: v.id('templateSections'), fieldIds: v.array(v.id('templateFields')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireLiveSection(ctx, args.sectionId)
    const fields = (await ctx.db.query('templateFields')
      .withIndex('by_section', (q) => q.eq('sectionId', args.sectionId)).collect())
      .filter((field) => field.deletedAt === undefined)
    requireExactOrder(args.fieldIds, fields, 'Field')
    const orders = new Map(fields.map((field) => [field._id, field.order]))
    for (const [order, id] of args.fieldIds.entries()) {
      if (orders.get(id) !== order) await ctx.db.patch(id, { order })
    }
    return null
  },
})

/** Analysis stays on Snaps so Undo restores the field's existing values. */
export const removeField = mutation({
  args: { fieldId: v.id('templateFields') }, returns: v.string(),
  handler: async (ctx, args) => {
    const field = await requireLiveField(ctx, args.fieldId)
    return softDeleteBatch(ctx, {
      kind: 'templateField', label: field.name,
      records: [{ table: 'templateFields', id: field._id }],
    })
  },
})
