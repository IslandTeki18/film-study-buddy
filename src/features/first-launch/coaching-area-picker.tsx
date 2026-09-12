import { useId, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router'
import { api } from '@convex/_generated/api'
import { COACHING_AREAS, type CoachingArea } from '@convex/domain/starterTemplates'
import { Button } from '@/components/ui/button'

const groups = {
  Quarterbacks: 'Offense', 'Running Backs': 'Offense', 'Wide Receivers': 'Offense',
  'Tight Ends': 'Offense', 'Offensive Line': 'Offense', 'Offensive Coordinator': 'Offense',
  'Defensive Line': 'Defense', Linebackers: 'Defense', 'DB / Secondary': 'Defense',
  'Defensive Coordinator': 'Defense', 'Custom / General': 'Other',
} satisfies Record<CoachingArea, 'Offense' | 'Defense' | 'Other'>

export function CoachingAreaPicker(): ReactNode {
  const id = useId()
  const [area, setArea] = useState<CoachingArea | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const complete = useMutation(api.settings.completeFirstLaunch)
  const navigate = useNavigate()
  return <main className="mx-auto max-w-2xl space-y-6 p-6">
    <h1 className="text-2xl font-semibold">Choose your Coaching Area</h1>
    <form className="space-y-6" onSubmit={(event) => {
      event.preventDefault()
      if (!area || pending) return
      setPending(true)
      setError('')
      void complete({ coachingArea: area }).then(() => navigate('/', { replace: true }))
        .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
        .finally(() => setPending(false))
    }}>
      {(['Offense', 'Defense', 'Other'] as const).map((group) => <fieldset key={group} disabled={pending} className="space-y-2">
        <legend className="mb-2 font-semibold">{group}</legend>
        {COACHING_AREAS.filter((value) => groups[value] === group).map((value) => <label key={value} className="flex items-center gap-2" htmlFor={`${id}-${value}`}>
          <input id={`${id}-${value}`} type="radio" name={id} value={value} checked={area === value}
            onChange={() => setArea(value)} />
          {value}
        </label>)}
      </fieldset>)}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={!area || pending}>Continue</Button>
    </form>
  </main>
}
