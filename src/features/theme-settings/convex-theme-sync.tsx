import { useEffect, useRef, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { ThemePreference } from './theme'

export interface ConvexThemeSyncProps {
  readonly preference: ThemePreference
  /** Called once, with the stored preference, when one exists. */
  readonly onAdoptStored: (preference: ThemePreference) => void
}

/**
 * Mirrors the theme preference to Convex. Rendered only when a Convex client is configured, so
 * its hooks always have a provider above them.
 */
export function ConvexThemeSync({ preference, onAdoptStored }: ConvexThemeSyncProps): ReactNode {
  const settings = useQuery(api.settings.get, {})
  const storedPreference = settings === undefined ? undefined : (settings?.themePreference ?? null)
  const savePreference = useMutation(api.settings.setThemePreference)
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
