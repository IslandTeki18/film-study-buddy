import { useEffect, useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate, useSearchParams } from 'react-router'
import { api } from '@convex/_generated/api'
import { normalizeName } from '@convex/domain/names'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function AddSourceGameDialog({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const templates = useQuery(api.templates.list, {})
  const create = useMutation(api.sourceGames.create)
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const intent = search.get('intent')
  const path = `/w/${workspaceId}/games`
  useEffect(() => () => {
    requestAnimationFrame(() => {
      const href = `#${path}/new${intent === 'import' || intent === 'manual' ? `?intent=${intent}` : ''}`
      const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
        .find((item) => item.getAttribute('href') === href)
      link?.focus()
    })
  }, [path, intent])
  const id = useId()
  const [label, setLabel] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const templateId = selected ?? (templates?.length === 1 ? templates[0]?._id ?? '' : '')
  const template = templates?.find((item) => item._id === templateId)
  const normalized = normalizeName(label)
  const close = (): void => { void navigate(path, { replace: true }) }
  async function submit(importCsv: boolean): Promise<void> {
    if (!workspace || !template || normalized === null || pending) return
    setPending(true)
    setError('')
    try {
      const gameId = await create({ workspaceId: workspace._id, label: normalized, templateId: template._id })
      await navigate(`${path}/${gameId}${importCsv ? '/import' : ''}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally { setPending(false) }
  }
  return <Dialog open={!!workspace && templates !== undefined} onOpenChange={(open) => { if (!open) close() }} aria-label="Add Source Game">
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      const submitter = (event.nativeEvent as SubmitEvent).submitter
      void submit(!(submitter instanceof HTMLButtonElement) || submitter.value !== 'manual')
    }}>
      <h2 className="text-lg font-semibold">Add Source Game</h2>
      <label className="block space-y-1" htmlFor={`${id}-label`}><span>Label</span>
        <Input id={`${id}-label`} required value={label} disabled={pending} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <label className="block space-y-1" htmlFor={`${id}-template`}><span>Coaching Template</span>
        <Select id={`${id}-template`} required value={templateId} disabled={pending} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a Coaching Template</option>
          {templates?.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </Select>
      </label>
      {templates?.length === 0 && <p className="text-sm text-muted-foreground">Create a Coaching Template before adding a Source Game.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
        <Button type="submit" value="import" autoFocus={intent !== 'manual'} disabled={pending || normalized === null || !template}>Import Hudl CSV</Button>
        <Button type="submit" value="manual" variant="outline" autoFocus={intent === 'manual'} disabled={pending || normalized === null || !template}>Create Manually</Button>
      </div>
    </form>
  </Dialog>
}
