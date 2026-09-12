import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { NameDialog } from '@/components/name-dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'

export function SeasonPicker(): ReactNode {
  const seasons = useQuery(api.seasons.list, {})
  const settings = useQuery(api.settings.get, {})
  const create = useMutation(api.seasons.create)
  const rename = useMutation(api.seasons.rename)
  const setActive = useMutation(api.settings.setActiveSeason)
  const { show } = useToast()
  const [dialog, setDialog] = useState<'create' | Doc<'seasons'> | null>(null)
  const active = seasons?.find((season) => season._id === settings?.activeSeasonId)
  const loading = seasons === undefined || settings === undefined
  return <div className="p-2">
    <DropdownMenu label={loading ? 'Loading seasons…' : (active?.name ?? 'No season')}
      triggerProps={{ disabled: loading, variant: 'outline', className: 'w-full', 'aria-label': 'Season' }}
      items={[
        ...(seasons ?? []).map((season) => ({
          label: season.name,
          onSelect: () => { void setActive({ seasonId: season._id }).catch((error: unknown) => {
            show({ message: `Could not switch Season. ${error instanceof Error ? error.message : String(error)}` })
          }) },
        })),
        { label: 'New season…', onSelect: () => setDialog('create') },
        ...(active ? [{ label: 'Rename season…', onSelect: () => setDialog(active) }] : []),
      ]} />
    <NameDialog open={dialog !== null} title={dialog === 'create' ? 'New season' : 'Rename season'}
      label="Season name" initialValue={dialog && dialog !== 'create' ? dialog.name : ''}
      confirmLabel={dialog === 'create' ? 'Create' : 'Rename'}
      onOpenChange={(open) => { if (!open) setDialog(null) }} onConfirm={async (name) => {
        if (dialog === 'create') {
          const seasonId = await create({ name })
          await setActive({ seasonId })
        } else if (dialog) await rename({ seasonId: dialog._id, name })
      }} />
  </div>
}
