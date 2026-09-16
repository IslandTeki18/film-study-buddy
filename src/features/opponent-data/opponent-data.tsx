import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { DEFAULT_GROUP_BY, formatAvgYards, formatFrequency } from '@convex/domain/aggregate'
import { Checkbox } from '@/components/ui/checkbox'
import { Meta, Page } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'

export function OpponentData({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const id = useId()
  const { show } = useToast()
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId })
  const fields = useQuery(api.opponentData.listGroupingFields, { workspaceId })
  const [groupBy, setGroupBy] = useState<string>(DEFAULT_GROUP_BY)
  const [groupBy2, setGroupBy2] = useState('')
  const resolved = fields?.some((field) => field.key === groupBy) && (!groupBy2 || fields.some((field) => field.key === groupBy2) && groupBy2 !== groupBy)
  const result = useQuery(api.opponentData.aggregate, resolved ? { workspaceId, groupBy, ...(groupBy2 ? { groupBy2 } : {}) } : 'skip')
  const setIncluded = useMutation(api.sourceGames.setIncluded).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sourceGames.listByWorkspace, { workspaceId })
    if (current) store.setQuery(api.sourceGames.listByWorkspace, { workspaceId },
      current.map((game) => game._id === args.sourceGameId ? { ...game, included: args.included } : game))
  })
  useEffect(() => {
    if (!fields) return
    if (!fields.some((field) => field.key === groupBy)) setGroupBy(DEFAULT_GROUP_BY)
    if (groupBy2 === groupBy || !fields.some((field) => field.key === groupBy2)) setGroupBy2('')
  }, [fields, groupBy, groupBy2])
  if (workspace === undefined || games === undefined || fields === undefined) return <div role="status" aria-label="Loading Opponent Data" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <Page width="max-w-[1100px]">
    <header className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">Opponent Data</h1><Meta>{games.filter((game) => game.included !== false).length} of {games.length} Source Games included</Meta></header>
    <fieldset className="grid gap-2"><legend className="mb-2 font-semibold">Games to Include</legend>
      {games.length === 0 ? <p>No Source Games yet. <Link className="underline" to={`/w/${workspaceId}/games`}>Add a Source Game</Link></p> : games.map((game) => <Checkbox key={game._id} checked={game.included !== false}
        label={<>{game.label} <Meta>{game.snapCount} Snaps</Meta></>}
        onChange={(event) => { void setIncluded({ sourceGameId: game._id, included: event.target.checked }).catch((error: unknown) => show({ message: `Could not change which games count. ${error instanceof Error ? error.message : String(error)}` })) }} />)}
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1"><label htmlFor={`${id}-first`}>Group By</label><Select id={`${id}-first`} value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>{fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</Select></div>
      <div className="space-y-1"><label htmlFor={`${id}-second`}>Second Group By</label><Select id={`${id}-second`} value={groupBy2} onChange={(event) => setGroupBy2(event.target.value)}><option value="">None</option>{fields.filter((field) => field.key !== groupBy).map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</Select></div>
    </div>
    {!resolved || result === null ? <p>Choose a Group By.</p> : result === undefined ? <div role="status" aria-label="Loading results" className="h-32 animate-pulse rounded bg-muted" /> : result.totalSnaps === 0 ? <p>No Snaps in the included Source Games. Include a game above or chart Snaps in the Play Log.</p> : <>
      <div className="overflow-x-auto rounded-xl border border-border"><Table>
        <caption className="sr-only">Snaps grouped by {result.groupLabels.join(' and ')}</caption>
        <TableHeader><TableRow>{result.groupLabels.map((label, index) => <TableHead key={index} scope="col">{label}</TableHead>)}{['Snaps', 'Frequency', 'Avg. Yards'].map((label) => <TableHead key={label} scope="col" className="text-right">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{result.rows.map((row) => <TableRow key={JSON.stringify(row.values)}>{row.values.map((value, index) => <TableCell key={index}>{value}</TableCell>)}<TableCell className="text-right font-mono">{row.snaps}</TableCell><TableCell className="text-right font-mono">{formatFrequency(row.frequency)}</TableCell><TableCell className="text-right font-mono">{formatAvgYards(row.avgYards)}</TableCell></TableRow>)}</TableBody>
      </Table></div>
      <Meta>{result.totalSnaps} Snaps in scope</Meta>
      {result.overlapping && <p className="text-sm text-muted-foreground">Multi-value fields count a Snap under each value, so frequencies can total more than 100%.</p>}
    </>}
  </Page>
}
