// TEMPORARY Phase 4 verification fixtures — delete before closeout.
import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { CORE_FIELDS, formatCoreValue, HASHES } from './domain/coreFields.ts'
import type { YardLine } from './domain/fieldZone.ts'
import { requireLiveSourceGame } from './sourceGames'

export const seedSnaps = internalMutation({
  args: { sourceGameId: v.id('sourceGames'), count: v.number(), imported: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await requireLiveSourceGame(ctx, args.sourceGameId)
    if (!game.label.startsWith('Fixture — ')) throw new Error('Fixture Source Game required')
    if (!Number.isInteger(args.count) || args.count < 1 || args.count > 1000) throw new Error('Count must be 1–1000')
    const last = await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).order('desc').first()
    const spots: YardLine[] = [
      { side: 'own', yard: 8 }, { side: 'own', yard: 35 }, { side: 'mid', yard: 50 },
      { side: 'opp', yard: 22 }, { side: 'opp', yard: 10 }, { side: 'opp', yard: 3 },
    ]
    const formations = ['Trips', 'Doubles', 'I Formation']
    for (let index = 0; index < args.count; index++) {
      const core: Doc<'snaps'>['core'] = {
        clipNumber: String(index + 1), quarter: index % 4 + 1, clock: '8:30',
        down: index % 4 + 1, distance: index % 12, yardLine: spots[index % spots.length]!,
        hash: HASHES[index % HASHES.length]!, personnel: '11', formation: formations[index % formations.length]!,
        motion: 'Jet', playType: index % 2 ? 'Pass' : 'Run', playConcept: 'Inside Zone', direction: 'Right', yards: index % 15 - 3,
      }
      const imported = args.imported ? Object.fromEntries(CORE_FIELDS.map(({ key }) => [key, formatCoreValue(key, core[key])])) : undefined
      if (imported && index % 5 === 0) core.formation = 'Coach Formation'
      if (imported && index === 0) imported.yardLine = 'O25'
      await ctx.db.insert('snaps', {
        sourceGameId: game._id, order: (last?.order ?? 0) + index + 1, core,
        ...(imported ? { imported } : {}), analysis: {}, mustReview: false, createdAt: Date.now(),
      })
    }
    return null
  },
})

export const removeFixtures = internalMutation({
  args: { sourceGameId: v.id('sourceGames') }, returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.sourceGameId)
    if (!game || !game.label.startsWith('Fixture — ')) throw new Error('Fixture Source Game required')
    const snaps = await ctx.db.query('snaps').withIndex('by_sourceGame', (q) => q.eq('sourceGameId', game._id)).collect()
    for (const snap of snaps) await ctx.db.delete(snap._id)
    return null
  },
})
