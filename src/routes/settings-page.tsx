import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AppHeader } from '@/components/app-header'
import { buttonVariants } from '@/components/ui/button'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { isConvexConfigured } from '@/convex-client'
import { ThemeToggle } from '@/features/theme-settings/theme-toggle'
import { useTheme } from '@/features/theme-settings/theme-provider'

export function SettingsPage(): ReactNode {
  const { preference, effectiveTheme } = useTheme()
  return <>
    <AppHeader title="Settings" />
    <Page width="max-w-[620px]" className="gap-5">
      <Panel className="overflow-hidden">
        {isConvexConfigured ? <DeploymentSettings /> : <SettingsRow label="Deployment" note="Convex is not configured"><span className="text-xs">Unavailable</span></SettingsRow>}
        <SettingsRow label="Appearance" note={`Currently ${preference}${preference === 'system' ? ` (${effectiveTheme})` : ''}`}>
          <ThemeToggle className="w-auto" compact />
        </SettingsRow>
      </Panel>
      <Link to="/templates" className={buttonVariants({ variant: 'outline', className: 'h-11 justify-start px-3.5 text-[11.5px] text-foreground' })}>
        Coaching templates →
      </Link>
    </Page>
  </>
}

function DeploymentSettings(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  const seasons = useQuery(api.seasons.list, {})
  const season = seasons?.find((item) => item._id === settings?.activeSeasonId)
  const rows = [
    { label: 'Coaching area', note: 'Set your starter template', value: settings?.coachingArea ?? '—' },
    { label: 'Current season', note: 'Default for new workspaces', value: season?.name ?? '—' },
  ]
  return rows.map((row) => <SettingsRow key={row.label} label={row.label} note={row.note}>
    {settings === undefined || seasons === undefined
      ? <div role="status" aria-label={`Loading ${row.label}`} className="h-5 w-24 animate-pulse rounded bg-muted" />
      : <span className="font-mono text-xs">{row.value}</span>}
  </SettingsRow>)
}

function SettingsRow({ label, note, children }: { readonly label: string; readonly note: string; readonly children: ReactNode }): ReactNode {
  return <div className="flex flex-wrap items-center gap-3.5 border-b border-border px-4.5 py-3.5 last:border-b-0">
    <div className="min-w-0 flex-[1_1_200px]">
      <div className="text-[13.5px]">{label}</div>
      <Meta className="mt-0.5 block text-[10.5px]">{note}</Meta>
    </div>
    {children}
  </div>
}
