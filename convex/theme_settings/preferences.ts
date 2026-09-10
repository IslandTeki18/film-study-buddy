import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const themePreferenceValidator = v.union(
  v.literal('light'),
  v.literal('dark'),
  v.literal('system'),
)

/**
 * Returns the signed-in user's stored theme preference, or null when there is no signed-in
 * user. Auth is not selected for this build, so this is always null and the client keeps using
 * local storage.
 */
export const get = query({
  args: {},
  returns: v.union(themePreferenceValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) return null
    // Auth selected: read users.themePreference for this identity.
    return null
  },
})

/** Persists the preference for the signed-in user. No-op for anonymous users. */
export const set = mutation({
  args: { themePreference: themePreferenceValidator },
  returns: v.null(),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) return null
    // Auth selected: patch users.themePreference for this identity.
    return null
  },
})
