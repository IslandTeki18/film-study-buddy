import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { groupsForSide, PLAYER_NAME_MAX_LENGTH, PLAYER_POSITION_MAX_LENGTH, type PositionGroupKey } from '@convex/domain/opponentPlayers'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { Mode } from '../preview/preview-data'

export function AddPlayerDialog({ workspaceId, mode, onOpenChange }: {
  readonly workspaceId: Id<'workspaces'>; readonly mode: Mode; readonly onOpenChange: (open: boolean) => void
}): ReactNode {
  const groups = groupsForSide(mode === 'off' ? 'offense' : 'defense')
  const [jersey, setJersey] = useState('')
  const [position, setPosition] = useState('')
  const [group, setGroup] = useState<PositionGroupKey>(groups[0]!.key)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const create = useMutation(api.opponentPlayers.create)
  const { show } = useToast()
  return <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }} aria-label="Add player"
    onCancel={(event) => { if (pending) event.preventDefault() }}>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !jersey.trim() || !position.trim()) return
      setPending(true); setError('')
      void create({ workspaceId, jersey, position, group, name }).then(() => {
        onOpenChange(false); show({ message: `Added #${jersey.trim()} ${position.trim()}` })
      }).catch((error: unknown) => {
        const message = `Could not add player. ${error instanceof Error ? error.message : String(error)}`
        setError(message); show({ message })
      }).finally(() => setPending(false))
    }}>
      <h2 className="text-lg font-semibold">Add player</h2>
      <fieldset disabled={pending} className="space-y-3">
        <label className="block space-y-1"><span>Jersey #</span><Input autoFocus inputMode="numeric" maxLength={2} value={jersey} onChange={(event) => setJersey(event.target.value)} /></label>
        <label className="block space-y-1"><span>Position</span><Input maxLength={PLAYER_POSITION_MAX_LENGTH} value={position} onChange={(event) => setPosition(event.target.value)} /></label>
        <label className="block space-y-1"><span>Group</span><Select value={group} onChange={(event) => setGroup(event.target.value as PositionGroupKey)}>
          {groups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
        </Select></label>
        <label className="block space-y-1"><span>Name (optional)</span><Input maxLength={PLAYER_NAME_MAX_LENGTH} value={name} onChange={(event) => setName(event.target.value)} /></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={pending || !jersey.trim() || !position.trim()}>Save</Button></div>
    </form>
  </Dialog>
}
