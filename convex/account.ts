import { v } from 'convex/values'
import { query } from './_generated/server'

/** The signed-in coach's identity key, or null. Needed once to claim existing data (hosted-accounts plan S6). */
export const whoami = query({
  args: {}, returns: v.union(v.object({ tokenIdentifier: v.string(), email: v.optional(v.string()) }), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    return identity ? { tokenIdentifier: identity.tokenIdentifier, ...(identity.email ? { email: identity.email } : {}) } : null
  },
})
