import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AppHeader } from '@/components/app-header'
import { NameDialog } from '@/components/name-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

const NEW_SEASON = '__new__'

export function HomeScreen(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  const seasons = useQuery(api.seasons.list, {})
  const active = seasons?.find((season) => season._id === settings?.activeSeasonId)
  const workspaces = useQuery(api.workspaces.listBySeason, active ? { seasonId: active._id } : 'skip')
  const archived = useQuery(api.workspaces.listArchived, {})
  const create = useMutation(api.seasons.create)
  const setActive = useMutation(api.settings.setActiveSeason)
  const { show } = useToast()
  const [creating, setCreating] = useState(false)
  if (settings === undefined || seasons === undefined || (active && workspaces === undefined)) {
    return <div role="status" aria-label="Loading Home" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  return <>
    <AppHeader meta={settings?.coachingArea} />
    <Page width="max-w-[820px]">
      {!active ? <section className="grid gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Create your first season</h1>
        <Button className="w-fit" onClick={() => setCreating(true)}>Create season</Button>
      </section> : <>
        <header className="flex flex-wrap items-center gap-3.5">
          <h1 className="text-[26px] font-bold tracking-tight">{active.name} season</h1>
          <Select aria-label="Season" className="h-8 w-auto rounded-lg bg-muted/60 text-[11px]" value={active._id} onChange={(event) => {
            const season = seasons.find((item) => item._id === event.target.value)
            if (!season) { setCreating(true); return }
            void setActive({ seasonId: season._id }).catch((error: unknown) => {
              show({ message: `Could not switch Season. ${error instanceof Error ? error.message : String(error)}` })
            })
          }}>
            {seasons.map((season) => <option key={season._id} value={season._id}>{season.name}</option>)}
            <option value={NEW_SEASON}>New season…</option>
          </Select>
          <Meta>{workspaces?.length ?? 0} opponent workspaces</Meta>
        </header>
        <section aria-label="Opponents" className="grid gap-2">
          {workspaces?.map((workspace) => <Link key={workspace._id} to={`/w/${workspace._id}`}
            className="grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-4 rounded-[11px] border border-border bg-card px-4 py-4 transition-colors hover:border-brand/50 hover:bg-accent">
            <Meta className="tracking-[0.08em] uppercase">Week {workspace.week}</Meta>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight">{workspace.opponentName}</span>
              <Meta className="mt-0.5 block">
                {workspace.gameDate ? <time dateTime={workspace.gameDate}>{workspace.gameDate}</time> : 'no game date'}
                {workspace.yourTeam && ` · vs ${workspace.yourTeam}`}
              </Meta>
            </span>
            <Meta className="rounded-md border border-border-strong px-2.5 py-1 text-[10.5px] text-warm">In progress</Meta>
          </Link>)}
          <Link to={`/seasons/${active._id}/new`} className={buttonVariants({ variant: 'dashed', className: 'h-auto justify-start rounded-[11px] px-4 py-4 text-sm' })}>
            <span className="font-mono text-[15px]">+</span> New opponent workspace
          </Link>
        </section>
        {archived && archived.length > 0 && <section aria-label="Recently archived" className="grid gap-2">
          {archived.slice(0, 2).map((workspace) => <Link key={workspace._id} to={`/w/${workspace._id}`}
            className="flex items-center gap-3.5 rounded-[10px] border border-border/70 bg-card/60 px-4 py-3 text-muted-foreground transition-colors hover:text-foreground">
            <Meta className="min-w-14 tracking-[0.08em] uppercase">{workspace.seasonName}</Meta>
            <span className="text-[13.5px]">Week {workspace.week} — {workspace.opponentName}</span>
            <Meta className="ml-auto text-[10.5px]">archived</Meta>
          </Link>)}
        </section>}
      </>}
    </Page>
    <NameDialog open={creating} title="New season" label="Season name" initialValue=""
      confirmLabel="Create" onOpenChange={setCreating} onConfirm={async (name) => {
        const seasonId = await create({ name })
        await setActive({ seasonId })
      }} />
  </>
}
