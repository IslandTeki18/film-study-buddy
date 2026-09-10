import type { ReactNode } from 'react'
import { ThemeToggle } from '@/features/theme-settings/theme-toggle'
import { useTheme } from '@/features/theme-settings/theme-provider'

export function SettingsPage(): ReactNode {
  const { preference, effectiveTheme } = useTheme()

  return (
    <section className="mx-auto max-w-2xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">Appearance preferences for this device.</p>
      </header>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Theme</h2>
          <p className="text-muted-foreground text-xs">
            Currently {preference}
            {preference === 'system' ? ` (${effectiveTheme})` : ''}.
          </p>
        </div>
        <ThemeToggle />
      </div>
    </section>
  )
}
