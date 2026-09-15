import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { IMPORT_TARGETS, missingRequiredTargets, type ColumnMapping } from './domain/csvMapping.ts'
import { formatCoreValue, isCoreFieldKey, normalizeCoreValue } from './domain/coreFields.ts'
import { builtInTerminology } from './domain/terminology.ts'
import { normalizeName } from './domain/names.ts'
import { requireLiveSourceGame } from './sourceGames.ts'

const mappingValidator = v.record(v.string(), v.union(v.string(), v.null()))
const importTargets = new Set<string>(IMPORT_TARGETS.map(({ key }) => key))

function validateMapping(mapping: Record<string, string | null>): ColumnMapping {
  const claimed = new Set<string>()
  for (const target of Object.values(mapping)) {
    if (target === null) continue
    if (!importTargets.has(target)) throw new Error('Unknown import target')
    if (claimed.has(target)) throw new Error('Each import target can only be mapped once')
    claimed.add(target)
  }
  const validated = mapping as ColumnMapping
  if (missingRequiredTargets(validated).length) throw new Error('Map Play # or Clip #')
  return validated
}

export async function upsertRememberedMapping(
  ctx: MutationCtx, signature: string, mapping: Record<string, string | null>,
): Promise<null> {
  const validated = validateMapping(mapping)
  const existing = await ctx.db.query('importMappings')
    .withIndex('by_signature', (q) => q.eq('signature', signature)).unique()
  if (existing) await ctx.db.patch(existing._id, { mapping: validated, lastUsedAt: Date.now() })
  else await ctx.db.insert('importMappings', { signature, mapping: validated, lastUsedAt: Date.now() })
  return null
}

export const getRememberedMapping = query({
  args: { signature: v.string() },
  returns: v.union(mappingValidator, v.null()),
  handler: async (ctx, args) => (await ctx.db.query('importMappings')
    .withIndex('by_signature', (q) => q.eq('signature', args.signature)).unique())?.mapping ?? null,
})

export const rememberMapping = mutation({
  args: { signature: v.string(), mapping: mappingValidator },
  returns: v.null(),
  handler: (ctx, args) => upsertRememberedMapping(ctx, args.signature, args.mapping),
})

const coreValueValidator = v.union(v.string(), v.number(), v.object({
  side: v.union(v.literal('own'), v.literal('mid'), v.literal('opp')), yard: v.number(),
}))

export const commit = mutation({
  args: {
    sourceGameId: v.id('sourceGames'), signature: v.string(), mapping: mappingValidator,
    rows: v.array(v.object({
      core: v.record(v.string(), coreValueValidator),
      imported: v.record(v.string(), v.string()),
    })),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    const template = await ctx.db.get(game.templateId)
    if (!template || template.deletedAt !== undefined) throw new Error('Coaching Template not found')
    if (!args.rows.length) throw new Error('Nothing to import')
    validateMapping(args.mapping)

    const rows = args.rows.map((row) => {
      const core: Doc<'snaps'>['core'] = {}
      for (const [key, raw] of Object.entries(row.core)) {
        if (key === 'playNumber') {
          if (typeof raw !== 'string' || !raw.trim()) throw new Error('Play # must be non-empty text')
          core.playNumber = raw.trim()
        } else {
          if (!isCoreFieldKey(key)) throw new Error('Unknown Core Snap field')
          const value = normalizeCoreValue(key, raw)
          if (value !== undefined) Object.assign(core, { [key]: value })
        }
      }
      const imported: Record<string, string> = {}
      for (const key of Object.keys(row.imported)) {
        if (!Object.hasOwn(row.core, key) || !Object.hasOwn(core, key)) throw new Error('Imported field must be present in Core Snap data')
        const canonical = key === 'playNumber' ? core.playNumber : isCoreFieldKey(key) ? formatCoreValue(key, core[key]) : null
        if (typeof canonical !== 'string' || row.imported[key] !== canonical) throw new Error('Imported value must match Core Snap data')
        imported[key] = canonical
      }
      return { core, imported }
    })

    const last = await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id))
      .order('desc').filter((q) => q.eq(q.field('deletedAt'), undefined)).first()
    const start = (last?.order ?? 0) + 1
    for (const [index, row] of rows.entries()) await ctx.db.insert('snaps', {
      sourceGameId: game._id, order: start + index, ...row,
      analysis: {}, mustReview: false, createdAt: Date.now(),
    })

    const terminologyFields = [
      ['formation', 'formations'], ['motion', 'motions'], ['playConcept', 'playConcepts'],
    ] as const
    for (const [key, list] of terminologyFields) {
      for (const raw of new Set(rows.map(({ core }) => core[key]).filter((value): value is string => typeof value === 'string'))) {
        const value = normalizeName(raw)
        if (value === null || builtInTerminology(list).includes(value)) continue
        const existing = await ctx.db.query('terminology')
          .withIndex('by_list', (q) => q.eq('list', list).eq('value', value)).first()
        if (!existing) await ctx.db.insert('terminology', { list, value, createdAt: Date.now() })
      }
    }
    await upsertRememberedMapping(ctx, args.signature, args.mapping)
    return { inserted: rows.length }
  },
})
