import { defineSchema } from 'convex/server'

/**
 * Theme settings need no standalone table.
 *
 * Auth is not selected for this build, so anonymous preferences live in the renderer's local
 * storage. When Auth is added, extend the users table with:
 *   themePreference: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system')))
 * and have convex/theme_settings/preferences.ts read and write that field.
 */
export default defineSchema({})
