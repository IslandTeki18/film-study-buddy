import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { attachedSnapIds } from './domain/diagram.ts'
import { fieldZoneOf, isValidYardLine } from './domain/fieldZone.ts'
import { cardFacts, cardTitle, validatePeriods } from './domain/practiceScript.ts'
import { downDistanceSituationOf } from './domain/situation.ts'
import schema from './schema'
import { softDeleteBatch } from './deletions'
import { liveWorkspace, requireName } from './reports'
import { isIncluded } from './sourceGames'
import { requireLiveWorkspace } from './workspaces'

const scriptFields = schema.tables.practiceScripts.validator.fields
const diagramFields = schema.tables.diagrams.validator.fields
const scriptValidator = v.object({ ...scriptFields, _id: v.id('practiceScripts'), _creationTime: v.number() })
const cardValidator = v.object({
  diagramId: v.id('diagrams'), title: v.string(),
  players: diagramFields.players, shapes: diagramFields.shapes, hiddenSide: diagramFields.hiddenSide,
  weight: v.number(),
  situations: v.array(v.object({ down: v.optional(v.number()), distance: v.optional(v.number()), hash: schema.tables.snaps.validator.fields.core.fields.hash })),
  facts: v.object({ snaps: v.number(), top: v.array(v.object({ label: v.string(), value: v.string(), count: v.number() })) }),
})

async function requireLiveScript(ctx: QueryCtx, id: Id<'practiceScripts'>): Promise<Doc<'practiceScripts'>> {
  const script = await ctx.db.get(id)
  if (!script || script.deletedAt !== undefined) throw new Error('Practice Script not found')
  await requireLiveWorkspace(ctx, script.workspaceId)
  return script
}

export const list = query({
  args: { workspaceId: v.string() }, returns: v.array(scriptValidator),
  handler: async (ctx, args) => {
    const id = await liveWorkspace(ctx, args.workspaceId)
    if (!id) return []
    return (await ctx.db.query('practiceScripts').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((script) => script.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const get = query({
  args: { workspaceId: v.string(), scriptId: v.string() }, returns: v.union(scriptValidator, v.null()),
  handler: async (ctx, args) => {
    const workspaceId = await liveWorkspace(ctx, args.workspaceId)
    const id = ctx.db.normalizeId('practiceScripts', args.scriptId)
    const script = workspaceId && id ? await ctx.db.get(id) : null
    if (!script || script.deletedAt !== undefined || script.workspaceId !== workspaceId) return null
    const exists = new Map<Id<'diagrams'>, boolean>()
    for (const rep of script.periods.flatMap((period) => period.reps)) {
      if (!exists.has(rep.diagramId)) exists.set(rep.diagramId, (await ctx.db.get(rep.diagramId)) !== null)
    }
    return { ...script, periods: script.periods.map((period) => ({ ...period, reps: period.reps.filter((rep) => exists.get(rep.diagramId)) })) }
  },
})

/** Every live Play Diagram in the Workspace, as a Scout Card with its film weight and situations. */
export const cards = query({
  args: { workspaceId: v.string() }, returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    const id = await liveWorkspace(ctx, args.workspaceId)
    if (!id) return []
    const liveGames = new Map<Id<'sourceGames'>, boolean>()
    const isLiveGame = async (gameId: Id<'sourceGames'>): Promise<boolean> => {
      if (!liveGames.has(gameId)) {
        const game = await ctx.db.get(gameId)
        liveGames.set(gameId, !!game && game.deletedAt === undefined && isIncluded(game))
      }
      return liveGames.get(gameId) === true
    }
    const diagrams = (await ctx.db.query('diagrams').withIndex('by_workspace', (q) => q.eq('workspaceId', id)).collect())
      .filter((diagram) => diagram.deletedAt === undefined).sort((a, b) => b.updatedAt - a.updatedAt)
    return Promise.all(diagrams.map(async (diagram) => {
      const snaps: Doc<'snaps'>[] = []
      for (const snapId of attachedSnapIds(diagram)) {
        const snap = await ctx.db.get(snapId)
        if (snap && snap.deletedAt === undefined && await isLiveGame(snap.sourceGameId)) snaps.push(snap)
      }
      const facts = cardFacts(snaps.map(({ core }) => ({
        formation: core.formation, personnel: core.personnel, playConcept: core.playConcept, hash: core.hash,
        situation: downDistanceSituationOf(core.down, core.distance) ?? undefined,
        fieldZone: isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : undefined,
      })))
      return {
        diagramId: diagram._id, title: cardTitle(diagram.name, facts), players: diagram.players, shapes: diagram.shapes,
        ...(diagram.hiddenSide ? { hiddenSide: diagram.hiddenSide } : {}),
        weight: snaps.length, facts,
        situations: snaps.map(({ core }) => ({
          ...(core.down !== undefined ? { down: core.down } : {}),
          ...(core.distance !== undefined ? { distance: core.distance } : {}),
          ...(core.hash !== undefined ? { hash: core.hash } : {}),
        })),
      }
    }))
  },
})

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), name: v.string() }, returns: v.id('practiceScripts'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    return ctx.db.insert('practiceScripts', { workspaceId: args.workspaceId, name: requireName(args.name), periods: [], updatedAt: Date.now() })
  },
})

export const rename = mutation({
  args: { scriptId: v.id('practiceScripts'), name: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    await ctx.db.patch(script._id, { name: requireName(args.name), updatedAt: Date.now() })
    return null
  },
})

export const savePeriods = mutation({
  args: { scriptId: v.id('practiceScripts'), periods: scriptFields.periods }, returns: v.null(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    const periods = validatePeriods(args.periods)
    for (const diagramId of new Set(periods.flatMap((period) => period.reps.map((rep) => rep.diagramId)))) {
      const diagram = await ctx.db.get(diagramId)
      if (!diagram || diagram.workspaceId !== script.workspaceId) throw new Error('Play Diagram not found in this Workspace')
    }
    await ctx.db.patch(script._id, { periods, updatedAt: Date.now() })
    return null
  },
})

export const remove = mutation({
  args: { scriptId: v.id('practiceScripts') }, returns: v.string(),
  handler: async (ctx, args) => {
    const script = await requireLiveScript(ctx, args.scriptId)
    return softDeleteBatch(ctx, { kind: 'practiceScript', label: script.name, records: [{ table: 'practiceScripts', id: script._id }] })
  },
})
