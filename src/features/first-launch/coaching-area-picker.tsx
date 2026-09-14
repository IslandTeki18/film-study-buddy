import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router'
import { api } from '@convex/_generated/api'
import { COACHING_AREAS, type CoachingArea } from '@convex/domain/starterTemplates'
import { Brand } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'
import { cn } from '@/lib/utils'

const groups = {
  Quarterbacks: 'Offense', 'Running Backs': 'Offense', 'Wide Receivers': 'Offense',
  'Tight Ends': 'Offense', 'Offensive Line': 'Offense', 'Offensive Coordinator': 'Offense',
  'Defensive Line': 'Defense', Linebackers: 'Defense', 'DB / Secondary': 'Defense',
  'Defensive Coordinator': 'Defense', 'Custom / General': 'Other',
} satisfies Record<CoachingArea, 'Offense' | 'Defense' | 'Other'>

const templateBlurb = {
  Quarterbacks: 'QB read & coverage template', 'Running Backs': 'Front & fit template',
  'Wide Receivers': 'Coverage & leverage template', 'Tight Ends': 'Front, coverage & block template',
  'Offensive Line': 'Front, pressure & movement template', 'Offensive Coordinator': 'Full defensive scout template',
  'Defensive Line': 'Formation & run scheme template', Linebackers: 'Formation, motion & run/pass template',
  'DB / Secondary': 'Formation, split & route template', 'Defensive Coordinator': 'Full offensive scout template',
  'Custom / General': 'Blank template — build your own fields',
} satisfies Record<CoachingArea, string>

export function CoachingAreaPicker(): ReactNode {
  const [area, setArea] = useState<CoachingArea | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const complete = useMutation(api.settings.completeFirstLaunch)
  const navigate = useNavigate()
  return <main className="flex min-h-screen items-center justify-center px-6 py-10">
    <form className="w-full max-w-3xl" onSubmit={(event) => {
      event.preventDefault()
      if (!area || pending) return
      setPending(true)
      setError('')
      void complete({ coachingArea: area }).then(() => navigate('/', { replace: true }))
        .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
        .finally(() => setPending(false))
    }}>
      <div className="mb-6 flex items-center gap-3">
        <Brand size="lg" />
        <Meta className="tracking-[0.14em] uppercase">Film Room · first launch</Meta>
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">What do you coach?</h1>
      <p className="mb-6 max-w-[52ch] text-sm text-muted-foreground">
        This installs a starter charting template built for your room. You can change every part of it later.
      </p>
      {(['Offense', 'Defense', 'Other'] as const).map((group) => <fieldset key={group} disabled={pending} className="mb-5">
        <legend className="mb-2 font-mono text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground">{group}</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-2">
          {COACHING_AREAS.filter((value) => groups[value] === group).map((value) => {
            const selected = area === value
            return <label key={value} className={cn(
              'flex cursor-pointer flex-col gap-1 rounded-[10px] border px-3.5 py-3 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-border-strong')}>
              <input type="radio" name="coaching-area" value={value} checked={selected} onChange={() => setArea(value)} className="sr-only" />
              <span className="text-sm font-semibold">{value}</span>
              <span className={cn('font-mono text-[10.5px] leading-snug', selected ? 'text-brand' : 'text-muted-foreground')}>{templateBlurb[value]}</span>
            </label>
          })}
        </div>
      </fieldset>)}
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" variant={area ? 'default' : 'outline'} className="h-11 px-5 text-sm" disabled={!area || pending}>
          {area ? `Install ${area} template` : 'Pick a coaching area'}
        </Button>
        <Meta>{area ? 'Editable later under Coaching templates.' : 'One choice, and you are in.'}</Meta>
      </div>
    </form>
  </main>
}
