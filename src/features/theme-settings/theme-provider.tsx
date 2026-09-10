import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isConvexConfigured } from '@/convex-client'
import { ConvexThemeSync } from './convex-theme-sync'
import {
  DEFAULT_THEME_PREFERENCE,
  applyTheme,
  readStoredPreference,
  resolveTheme,
  watchSystemTheme,
  writeStoredPreference,
  type EffectiveTheme,
  type ThemePreference,
} from './theme'

export interface ThemeContextValue {
  /** What the user selected. */
  readonly preference: ThemePreference
  /** What the document is actually rendering. */
  readonly effectiveTheme: EffectiveTheme
  readonly setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  // The inline script in index.html already applied this value; reading it here keeps React
  // state and the DOM in agreement on the very first render.
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => readStoredPreference() ?? DEFAULT_THEME_PREFERENCE,
  )
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() => resolveTheme('system'))

  useEffect(() => {
    if (preference !== 'system') return
    return watchSystemTheme(setSystemTheme)
  }, [preference])

  const effectiveTheme: EffectiveTheme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    applyTheme(effectiveTheme)
  }, [effectiveTheme])

  const setPreference = useCallback((next: ThemePreference): void => {
    setPreferenceState(next)
    if (next === 'system') setSystemTheme(resolveTheme('system'))
    writeStoredPreference(next)
  }, [])

  const adoptStored = useCallback((next: ThemePreference): void => {
    setPreferenceState(next)
    writeStoredPreference(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, effectiveTheme, setPreference }),
    [preference, effectiveTheme, setPreference],
  )

  return (
    <ThemeContext.Provider value={value}>
      {/* Constant for the lifetime of the process, so this branch never reorders hooks. */}
      {isConvexConfigured && (
        <ConvexThemeSync preference={preference} onAdoptStored={adoptStored} />
      )}
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
