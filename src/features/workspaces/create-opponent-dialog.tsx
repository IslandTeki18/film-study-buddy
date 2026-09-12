import { useEffect, useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate } from 'react-router'
import { api } from '@convex/_generated/api'
import { normalizeName } from '@convex/domain/names'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function CreateOpponentDialog({ seasonId }: { readonly seasonId: string }): ReactNode {
  const seasons = useQuery(api.seasons.list, {})
  const season = seasons?.find((item) => item._id === seasonId)
  const create = useMutation(api.workspaces.create)
  const navigate = useNavigate()
  useEffect(() => () => {
    requestAnimationFrame(() => {
      const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
        .find((item) => item.getAttribute('href') === `#/seasons/${seasonId}/new`)
      link?.focus()
    })
  }, [seasonId])
  const id = useId()
  const [opponentName, setOpponentName] = useState('')
  const [week, setWeek] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [yourTeam, setYourTeam] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const normalized = normalizeName(opponentName)
  const number = Number(week)
  const valid = normalized !== null && week !== '' && Number.isInteger(number) && number >= 0 && number <= 52
  const close = (): void => { void navigate(`/seasons/${seasonId}`, { replace: true }) }
  return <Dialog open={!!season} onOpenChange={(open) => { if (!open) close() }} aria-label="New Opponent">
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (!season || !valid || normalized === null || pending) return
      setPending(true)
      setError('')
      void create({
        seasonId: season._id, opponentName: normalized, week: number,
        ...(gameDate ? { gameDate } : {}), ...(yourTeam ? { yourTeam } : {}), ...(notes ? { notes } : {}),
      }).then((workspaceId) => navigate(`/w/${workspaceId}`))
        .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
        .finally(() => setPending(false))
    }}>
      <h2 className="text-lg font-semibold">New Opponent</h2>
      <label className="block space-y-1" htmlFor={`${id}-opponent`}><span>Opponent Name</span>
        <Input id={`${id}-opponent`} required autoFocus value={opponentName} disabled={pending} onChange={(event) => setOpponentName(event.target.value)} />
      </label>
      <label className="block space-y-1" htmlFor={`${id}-week`}><span>Week</span>
        <Input id={`${id}-week`} required type="number" min="0" max="52" step="1" value={week} disabled={pending} onChange={(event) => setWeek(event.target.value)} />
      </label>
      <label className="block space-y-1" htmlFor={`${id}-date`}><span>Game Date</span>
        <Input id={`${id}-date`} type="date" value={gameDate} disabled={pending} onChange={(event) => setGameDate(event.target.value)} />
      </label>
      <label className="block space-y-1" htmlFor={`${id}-team`}><span>Your Team</span>
        <Input id={`${id}-team`} value={yourTeam} disabled={pending} onChange={(event) => setYourTeam(event.target.value)} />
      </label>
      <label className="block space-y-1" htmlFor={`${id}-notes`}><span>Notes</span>
        <Textarea id={`${id}-notes`} value={notes} disabled={pending} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
        <Button type="submit" disabled={!valid || pending}>Create</Button>
      </div>
    </form>
  </Dialog>
}
