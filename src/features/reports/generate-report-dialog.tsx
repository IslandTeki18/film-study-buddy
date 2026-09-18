import { useState, type ReactNode } from 'react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AI_FOCUS_MAX_LENGTH, AI_GENERATED_REPORT_DEFAULT_NAME } from '@convex/domain/aiReport'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { REPORT_INTENTS, REPORT_INTENT_LABEL, type ReportIntent } from '@convex/domain/reportBlocks'
import { COACHING_AREAS, isCoachingArea, type CoachingArea } from '@convex/domain/starterTemplates'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function GenerateReportDialog({ workspaceId, onClose, onGenerated }: {
  readonly workspaceId: Id<'workspaces'>
  readonly onClose: () => void
  readonly onGenerated: (reportId: Id<'reports'>, skipped: number) => void
}): ReactNode {
  const generate = useAction(api.aiReportsNode.generate)
  const settings = useQuery(api.settings.get, {})
  const [name, setName] = useState(AI_GENERATED_REPORT_DEFAULT_NAME)
  const [intent, setIntent] = useState<ReportIntent>('coach')
  const [chosenCoachType, setCoachType] = useState<CoachingArea>()
  const coachType = chosenCoachType ?? (isCoachingArea(settings?.coachingArea) ? settings.coachingArea : 'Custom / General')
  const [focus, setFocus] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }} onCancel={(event) => { if (pending) event.preventDefault() }}
    aria-label="Generate with AI" className="max-h-[85vh] w-[min(90vw,560px)] max-w-none overflow-y-auto">
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (pending || !name.trim()) return
      setPending(true); setError('')
      void generate({ workspaceId, name, intent, coachType, ...(focus.trim() ? { focus: focus.trim() } : {}) })
        .then(({ reportId, skipped }) => onGenerated(reportId, skipped))
        .catch((error: unknown) => setError(error instanceof ConvexError && typeof error.data === 'string' ? error.data : error instanceof Error ? error.message : String(error)))
        .finally(() => setPending(false))
    }}>
      <h2 className="text-lg font-semibold">Generate with AI</h2>
      <fieldset disabled={pending} className="space-y-4">
        <label className="block">Report name<Input required value={name} maxLength={NAME_MAX_LENGTH} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block">Report intent<Select value={intent} onChange={(event) => setIntent(event.target.value as ReportIntent)}>
          {REPORT_INTENTS.map((value) => <option key={value} value={value}>{REPORT_INTENT_LABEL[value]}</option>)}
        </Select></label>
        <label className="block">Who is watching this film?<Select value={coachType} onChange={(event) => { if (isCoachingArea(event.target.value)) setCoachType(event.target.value) }}>
          {COACHING_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
        </Select></label>
        <label className="block">Focus (optional)<Textarea value={focus} maxLength={AI_FOCUS_MAX_LENGTH} placeholder="Anything the Report should emphasize" onChange={(event) => setFocus(event.target.value)} /></label>
      </fieldset>
      {pending && <p role="status">Building the Report… this can take a minute.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !name.trim()}>Generate</Button></div>
    </form>
  </Dialog>
}
