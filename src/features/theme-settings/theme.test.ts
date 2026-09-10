/**
 * Self-check for the theme resolution and storage rules.
 * Run with: npm test
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  watchSystemTheme,
  writeStoredPreference,
} from './theme.ts'

interface StubOptions {
  readonly prefersDark: boolean
  readonly storage: Storage | null
}

function stubWindow({ prefersDark, storage }: StubOptions): { emit: (dark: boolean) => void } {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const media = {
    matches: prefersDark,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    },
  }
  const classes = new Set<string>()
  Object.assign(globalThis, {
    window: {
      matchMedia: () => media,
      get localStorage(): Storage {
        if (storage === null) throw new Error('localStorage is unavailable')
        return storage
      },
    },
    document: {
      documentElement: {
        style: { colorScheme: '' },
        classList: {
          toggle: (name: string, force: boolean) => {
            if (force) classes.add(name)
            else classes.delete(name)
          },
          contains: (name: string) => classes.has(name),
        },
      },
    },
  })
  return {
    emit: (dark: boolean) => {
      for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent)
    },
  }
}

function memoryStorage(initial: string | null): Storage {
  let value = initial
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
  } as unknown as Storage
}

test('only the three documented preferences are accepted', () => {
  assert.ok(isThemePreference('light'))
  assert.ok(isThemePreference('system'))
  assert.ok(!isThemePreference('sepia'))
  assert.ok(!isThemePreference(null))
})

test('system resolves from the operating system appearance', () => {
  stubWindow({ prefersDark: true, storage: memoryStorage(null) })
  assert.equal(resolveTheme('system'), 'dark')
  assert.equal(resolveTheme('light'), 'light')

  stubWindow({ prefersDark: false, storage: memoryStorage(null) })
  assert.equal(resolveTheme('system'), 'light')
  assert.equal(resolveTheme('dark'), 'dark')
})

test('stored preferences round-trip and invalid values fall back to the default', () => {
  const storage = memoryStorage(null)
  stubWindow({ prefersDark: false, storage })
  assert.equal(readStoredPreference(), null)
  writeStoredPreference('dark')
  assert.equal(storage.getItem(THEME_STORAGE_KEY), 'dark')
  assert.equal(readStoredPreference(), 'dark')

  stubWindow({ prefersDark: false, storage: memoryStorage('neon') })
  assert.equal(readStoredPreference() ?? DEFAULT_THEME_PREFERENCE, 'system')
})

test('unavailable storage never throws', () => {
  stubWindow({ prefersDark: false, storage: null })
  assert.equal(readStoredPreference(), null)
  assert.doesNotThrow(() => writeStoredPreference('light'))
})

test('the dark class tracks the effective theme', () => {
  stubWindow({ prefersDark: false, storage: memoryStorage(null) })
  applyTheme('dark')
  assert.ok(document.documentElement.classList.contains('dark'))
  applyTheme('light')
  assert.ok(!document.documentElement.classList.contains('dark'))
})

test('system listeners fire while subscribed and stop after cleanup', () => {
  const { emit } = stubWindow({ prefersDark: false, storage: memoryStorage(null) })
  const seen: string[] = []
  const unsubscribe = watchSystemTheme((theme) => seen.push(theme))
  emit(true)
  emit(false)
  unsubscribe()
  emit(true)
  assert.deepEqual(seen, ['dark', 'light'])
})
