/**
 * Pure theme primitives shared by the provider, the toggle and the pre-render script.
 *
 * Invariants:
 * - `ThemePreference` is what the user chose; `EffectiveTheme` is what the UI renders.
 * - `system` is resolved from the operating system appearance, never persisted as light/dark.
 * - Storage access is best-effort: an unavailable localStorage degrades to in-memory defaults.
 */

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type EffectiveTheme = 'light' | 'dark'

/** Must stay in sync with the inline bootstrap script in src/index.html. */
export const THEME_STORAGE_KEY = 'film-study-buddy.theme'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
  )
}

export function readStoredPreference(): ThemePreference | null {
  try {
    const stored: unknown = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : null
  } catch {
    // Storage can be disabled or full; anonymous users simply fall back to the default.
    return null
  }
}

export function writeStoredPreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Non-fatal: the preference still applies for the lifetime of this window.
  }
}

export function getSystemTheme(): EffectiveTheme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): EffectiveTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

/**
 * Applies the effective theme to the document root so every Tailwind `dark:` rule and CSS
 * variable flips at once.
 */
export function applyTheme(theme: EffectiveTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

/** Subscribes to operating-system appearance changes. Returns the unsubscribe function. */
export function watchSystemTheme(onChange: (theme: EffectiveTheme) => void): () => void {
  const query = window.matchMedia(DARK_MEDIA_QUERY)
  const listener = (event: MediaQueryListEvent): void => {
    onChange(event.matches ? 'dark' : 'light')
  }
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
