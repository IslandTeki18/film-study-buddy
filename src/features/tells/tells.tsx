import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatFrequency } from '@convex/domain/aggregate'
import { ODK_VALUES } from '@convex/domain/coreFields'
import { TELL_MIN_SNAPS } from '@convex/domain/tells'
import { Button } from '@/components/ui/button'
import { Chip, Meta, Page, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { SaveTellDialog, type Odk, type TellRow } from './save-tell-dialog'

export function Tells({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const [odk, setOdk] = useState<Odk | undefined>(undefined)
  const [saving, setSaving] = useState<TellRow | null>(null)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const tells = useQuery(api.tells.list, { workspaceId, ...(odk ? { odk } : {}) })
  if (workspace === undefined || tells === undefined) return <div role="status" aria-label="Loading Tells" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">Tells</h1><Meta>{tells.length} found</Meta>
      <label className="ml-auto flex items-center gap-2 text-sm">ODK
        <Select className="w-28" value={odk ?? ''} onChange={(event) => setOdk(ODK_VALUES.find((value) => value === event.target.value))}>
          <option value="">All</option>{ODK_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
      </label>
    </header>
    <p className="text-sm">Pre-snap looks that predict what comes next. A Tell needs at least {TELL_MIN_SNAPS} snaps. These are counts only, so confirm on film before you coach it.</p>
    {tells.length === 0
      ? <p>No Tells yet. Chart more snaps, or choose a different ODK.</p>
      : <ol className="grid gap-3">{tells.map((tell) => <li key={tell.key}><TellCard tell={tell} onSave={() => setSaving(tell)} /></li>)}</ol>}
    {saving && <SaveTellDialog open onOpenChange={(open) => { if (!open) setSaving(null) }} workspaceId={workspace._id} odk={odk} tell={saving} />}
  </Page>
}

function TellCard({ tell, onSave }: { readonly tell: TellRow; readonly onSave: () => void }): ReactNode {
  return <Panel className="grid gap-2 p-4">
    <p className="font-semibold">{tell.indicators.map((part) => `${part.label}: ${part.value}`).join(' + ')} → {tell.outcome.label}: {tell.outcome.value}</p>
    <p className="flex flex-wrap items-center gap-2 text-sm">{tell.hits} of {tell.snaps} snaps ({formatFrequency(tell.share)}). All snaps: {formatFrequency(tell.baseline)}.{tell.smallSample && <Chip>Small sample</Chip>}</p>
    <details>
      <summary className="cursor-pointer text-sm">Evidence</summary>
      <ul className="text-sm">{tell.breakdown.map((row) => <li key={row.value}>{row.value}: {row.snaps}</li>)}</ul>
      <p className="font-mono text-xs">{tell.clipLabels.join(', ')}</p>
    </details>
    <div><Button size="sm" variant="outline" onClick={onSave}>Save as Tendency</Button></div>
  </Panel>
}
