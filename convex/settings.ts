import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import schema from './schema'
import { isCoachingArea } from './domain/starterTemplates.ts'
import { installStarterTemplate } from './templates'

export const themePreferenceValidator = schema.tables.settings.validator.fields.themePreference
const settingsValidator = v.object({
  ...schema.tables.settings.validator.fields,
  _id: v.id('settings'), _creationTime: v.number(),
})

async function readSettings(ctx: QueryCtx | MutationCtx): Promise<Doc<'settings'> | null> {
  return ctx.db.query('settings').first()
}

async function requireSettings(ctx: MutationCtx): Promise<Doc<'settings'>> {
  const settings = await readSettings(ctx)
  if (settings) return settings
  const id = await ctx.db.insert('settings', { coachingArea: '', themePreference: 'system' })
  const created = await ctx.db.get(id)
  if (!created) throw new Error('Settings could not be created')
  return created
}

/** Reads never create the singleton; concurrent mutations serialize its creation. */
export const get = query({
  args: {}, returns: v.union(settingsValidator, v.null()),
  handler: readSettings,
})

export const setThemePreference = mutation({
  args: { themePreference: themePreferenceValidator }, returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await requireSettings(ctx)
    await ctx.db.patch(settings._id, args)
    return null
  },
})

/** Only a live Season can become active. */
export const setActiveSeason = mutation({
  args: { seasonId: v.id('seasons') }, returns: v.null(),
  handler: async (ctx, args) => {
    const season = await ctx.db.get(args.seasonId)
    if (!season || season.deletedAt !== undefined) throw new Error('Season not found')
    const settings = await requireSettings(ctx)
    await ctx.db.patch(settings._id, { activeSeasonId: args.seasonId })
    return null
  },
})

/** Completion and starter installation share one transaction, including double submits. */
export const completeFirstLaunch = mutation({
  args: { coachingArea: v.string() }, returns: v.id('templates'),
  handler: async (ctx, args) => {
    if (!isCoachingArea(args.coachingArea)) throw new Error('Unknown Coaching Area')
    const settings = await requireSettings(ctx)
    if (settings.firstLaunchCompletedAt !== undefined) throw new Error('First launch is already complete')
    const templateId = await installStarterTemplate(ctx, args.coachingArea)
    await ctx.db.patch(settings._id, {
      coachingArea: args.coachingArea, firstLaunchCompletedAt: Date.now(),
    })
    return templateId
  },
})
