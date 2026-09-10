import { useEffect, useRef, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import type { ThemePreference } from './theme'

// Referenced by path rather than through the generated `api` object so the renderer typechecks
// before `npx convex dev` has produced convex/_generated. Keep in sync with
// convex/theme_settings/preferences.ts.
const getThemePreference = makeFunctionReference<
  'query',
  Record<string, never>,
  ThemePreference | null
>('theme_settings/preferences:get')

const setThemePreference = makeFunctionReference<
  'mutation',
  { themePreference: ThemePreference },
  null
>('theme_settings/preferences:set')

export interface ConvexThemeSyncProps {
  readonly preference: ThemePreference
  /** Called once, with the stored preference, when the signed-in user has one. */
  readonly onAdoptStored: (preference: ThemePreference) => void
}

/**
 * Mirrors the theme preference to Convex. Rendered only when a Convex client is configured, so
 * its hooks always have a provider above them.
 *
 * Without Auth the query resolves to null and the mutation is a no-op, which is the documented
 * anonymous behavior.
 */
export function ConvexThemeSync({ preference, onAdoptStored }: ConvexThemeSyncProps): ReactNode {
  const storedPreference = useQuery(getThemePreference, {})
  const savePreference = useMutation(setThemePreference)
  const hasAdopted = useRef(false)
  const lastSynced = useRef<ThemePreference | null>(null)

  useEffect(() => {
    if (hasAdopted.current || storedPreference === undefined) return
    hasAdopted.current = true
    lastSynced.current = storedPreference
    if (storedPreference !== null) onAdoptStored(storedPreference)
  }, [storedPreference, onAdoptStored])

  useEffect(() => {
    // ponytail: nothing is pushed until the first server read lands, so an unreachable
    // deployment stays local-only rather than queueing writes that would fail anyway.
    if (!hasAdopted.current || lastSynced.current === preference) return
    lastSynced.current = preference
    void savePreference({ themePreference: preference }).catch((error: unknown) => {
      console.error('Failed to sync theme preference to Convex', error)
    })
  }, [preference, savePreference])

  return null
}
