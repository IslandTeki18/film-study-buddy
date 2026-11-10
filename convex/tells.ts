import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { groupingFieldsFor, groupingValuesOf, NONE_GROUP, templateGroupingKey } from './domain/aggregate.ts'
import { findTells, tellFieldsFor, type Tell, type TellSnap } from './domain/tells.ts'
import { loadScope, type OpponentScope } from './opponentData'
import schema from './schema'
import { requireCategory, requireNote, requireTitle } from './tendencies'
import { requireLiveWorkspace } from './workspaces'

const odkArg = schema.tables.snaps.validator.fields.core.fields.odk
type Odk = Doc<'snaps'>['core']['odk']
const partValidator = v.object({ key: v.string(), label: v.string(), value: v.string() })
const tellValidator = v.object({
  key: v.string(), indicators: v.array(partValidator), outcome: partValidator,
  hits: v.number(), snaps: v.number(), share: v.number(), baseline: v.number(), confidenceFloor: v.number(), smallSample: v.boolean(),
  snapIds: v.array(v.string()),
  breakdown: v.array(v.object({ value: v.string(), snaps: v.number(), avgYards: v.union(v.number(), v.null()) })),
  clipLabels: v.array(v.string()),
})

async function computeTells(ctx: QueryCtx, workspaceId: Id<'workspaces'>, odk: Odk): Promise<{ scope: OpponentScope; tells: Tell[] } | null> {
  const scope = await loadScope(ctx, workspaceId)
  if (!scope) return null
  const catalog = groupingFieldsFor([...scope.templateFields.values()])
  const { indicators, outcomes } = tellFieldsFor(catalog, scope.preSnapKeys)
  const fields = [...indicators, ...outcomes]
  const templateIds = new Map(scope.games.map((game) => [game._id, fields.map((field) =>
    scope.templateFields.get(game._id)?.find((candidate) => templateGroupingKey(candidate) === field.key)?._id)]))
  const snaps: TellSnap[] = scope.snaps.filter((snap) => odk === undefined || snap.core.odk === odk).map((snap) => {
    const values: Record<string, string> = {}
    fields.forEach((field, index) => {
      const found = groupingValuesOf(snap, field, templateIds.get(snap.sourceGameId)?.[index])
      // ponytail: multi-value fields are excluded (plan A2); count each value separately if coaches need them.
      if (found.length === 1 && found[0] !== undefined && found[0] !== NONE_GROUP) values[field.key] = found[0]
    })
    return { id: snap._id, values, ...(snap.core.yards !== undefined ? { yards: snap.core.yards } : {}) }
  })
  return { scope, tells: findTells(snaps, indicators, outcomes) }
}

export const list = query({
  args: { workspaceId: v.string(), odk: odkArg }, returns: v.array(tellValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('workspaces', args.workspaceId)
    const computed = id ? await computeTells(ctx, id, args.odk) : null
    if (!computed) return []
    const games = new Map(computed.scope.games.map((game) => [game._id, game.label]))
    const snaps = new Map<string, Doc<'snaps'>>(computed.scope.snaps.map((snap) => [snap._id, snap]))
    return computed.tells.map((tell) => ({ ...tell, clipLabels: tell.snapIds.map((snapId) => {
      const snap = snaps.get(snapId)
      return snap ? `${games.get(snap.sourceGameId) ?? ''} #${snap.core.clipNumber ?? snap.order}` : ''
    }) }))
  },
})

export const promote = mutation({
  args: { workspaceId: v.id('workspaces'), odk: odkArg, tellKey: v.string(), title: v.string(), category: v.string(), note: v.string() },
  returns: v.id('tendencies'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    const title = requireTitle(args.title)
    const note = requireNote(args.note)
    const category = await requireCategory(ctx, args.category)
    const computed = await computeTells(ctx, args.workspaceId, args.odk)
    const tell = computed?.tells.find((candidate) => candidate.key === args.tellKey)
    if (!computed || !tell) throw new Error('That Tell changed. Review the updated list and try again.')
    const indicatorValue = tell.indicators.map((part) => part.value).join(' · ')
    return ctx.db.insert('tendencies', {
      workspaceId: args.workspaceId, title, note, category, includeInReport: true, createdAt: Date.now(),
      snapshot: {
        gameIds: computed.scope.games.map((game) => game._id), groupBy: tell.indicators.map((part) => part.label).join(' + '), groupBy2: tell.outcome.label,
        rows: tell.breakdown.map((row) => ({ values: [indicatorValue, row.value], snaps: row.snaps, frequency: row.snaps / tell.snaps, avgYards: row.avgYards })),
      },
    })
  },
})
