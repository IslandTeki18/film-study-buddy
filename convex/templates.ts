import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { softDeleteBatch } from './deletions'
import { getStarterTemplate, isCoachingArea, type StarterSection } from './domain/starterTemplates.ts'
import { NAME_MAX_LENGTH, normalizeName } from './domain/templateFields.ts'

type ReadCtx = QueryCtx | MutationCtx

async function requireLiveTemplate(ctx: ReadCtx, id: Id<'templates'>) {
  const template = await ctx.db.get(id)
  if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
  return template
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
