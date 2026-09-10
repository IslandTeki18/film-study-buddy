import { ConvexReactClient } from 'convex/react'

const rawUrl = import.meta.env.VITE_CONVEX_URL?.trim() ?? ''

/**
 * The Convex client, or null when VITE_CONVEX_URL is not configured.
 *
 * The app stays usable without it: theme settings are local-storage backed until Auth is
 * selected, so a missing deployment degrades to local-only instead of a blank window.
 */
export const convexClient: ConvexReactClient | null =
  rawUrl.startsWith('http') ? new ConvexReactClient(rawUrl) : null

export const isConvexConfigured: boolean = convexClient !== null
