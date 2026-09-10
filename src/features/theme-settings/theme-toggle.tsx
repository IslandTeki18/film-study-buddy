import type { ReactNode } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEME_PREFERENCES, type ThemePreference } from './theme'
import { useTheme } from './theme-provider'

const OPTIONS: ReadonlyArray<{
  value: ThemePreference
  label: string
  Icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export interface ThemeToggleProps {
  /** Hides the text labels; the accessible name is kept on the input. */
  readonly compact?: boolean
  readonly className?: string
}

/**
 * Segmented light/dark/system control.
 *
 * ponytail: native radio inputs, so arrow-key roving focus, labels and screen-reader
 * semantics come from the platform instead of a custom keyboard handler.
 */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps): ReactNode {
  const { preference, setPreference } = useTheme()

  return (
    <fieldset
      className={cn(
        'flex w-full gap-1 rounded-lg border border-border bg-muted/50 p-1',
        className,
      )}
    >
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = preference === value
        return (
          <label
            key={value}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <input
              type="radio"
              name="theme-preference"
              value={value}
              checked={selected}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className={cn(compact && 'sr-only')}>{label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

// Guards against an option list drifting out of sync with the allowed preferences.
if (OPTIONS.length !== THEME_PREFERENCES.length) {
  throw new Error('ThemeToggle options must cover every theme preference')
}
