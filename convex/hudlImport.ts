import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import { IMPORT_TARGETS, missingRequiredTargets, type ColumnMapping } from './domain/csvMapping.ts'

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
