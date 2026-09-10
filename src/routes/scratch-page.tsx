import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CORE_FIELDS } from '@convex/domain/coreFields.ts'
import { FIELD_ZONES } from '@convex/domain/fieldZone.ts'
import { FORMATIONS, MOTIONS, PLAY_CONCEPTS } from '@convex/domain/terminology.ts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useAutosave, useUndoableMutation } from '@/lib/db'

const AUTOSAVE_KEY = 'film-study-buddy:scratch:autosave'

function AutosaveDemo(): ReactNode {
  const [rejectSave, setRejectSave] = useState(false)
  const [slowSave, setSlowSave] = useState(false)
  const [saveLog, setSaveLog] = useState<readonly string[]>([])
  const [storedValue, setStoredValue] = useState(() => localStorage.getItem(AUTOSAVE_KEY) ?? '')
  const saveCount = useRef(0)
  const { draft, setDraft, flush, status } = useAutosave(storedValue, async (next) => {
    const saveNumber = ++saveCount.current
    setSaveLog((entries) => [...entries, `start ${saveNumber}: ${next}`])
    if (slowSave) await new Promise((resolve) => window.setTimeout(resolve, 600))
    if (rejectSave) {
      setSaveLog((entries) => [...entries, `error ${saveNumber}: ${next}`])
      throw new Error('Scratch autosave rejection')
    }
    localStorage.setItem(AUTOSAVE_KEY, next)
    setStoredValue(next)
    setSaveLog((entries) => [...entries, `finish ${saveNumber}: ${next}`])
  })
  function commitKey(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === 'Tab') flush()
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="text-sm">Autosave text</span>
        <Input id="scratch-autosave-input" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={flush} onKeyDown={commitKey} />
      </label>
      <p id="scratch-autosave-status" role="status" className="text-sm">Autosave status: {status}</p>
      <Button id="scratch-autosave-external" type="button" variant="outline" onClick={() => setStoredValue(`External ${Date.now()}`)}>
        Set external value
      </Button>
      <Checkbox id="scratch-autosave-reject" label="Reject autosave" checked={rejectSave} onChange={(event) => setRejectSave(event.target.checked)} />
      <Checkbox id="scratch-autosave-slow" label="Delay saves 600ms" checked={slowSave} onChange={(event) => setSlowSave(event.target.checked)} />
      <p id="scratch-autosave-save-count" className="text-sm">Save count: {saveCount.current}</p>
      <ol id="scratch-autosave-save-log" className="list-decimal pl-5 text-sm">
        {saveLog.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
      </ol>
    </div>
  )
}

function UndoDemo(): ReactNode {
  const [undoCount, setUndoCount] = useState(0)
  const [rejectUndo, setRejectUndo] = useState(false)
  const remove = useUndoableMutation(
    async () => 'scratch-batch',
    async () => {
      if (rejectUndo) throw new Error('Scratch undo rejection')
      setUndoCount((count) => count + 1)
    },
    () => 'Scratch item deleted',
  )
  return (
    <div className="space-y-2">
      <Button id="scratch-undo-trigger" onClick={() => void remove(undefined)}>Delete scratch item</Button>
      <p id="scratch-undo-count" className="text-sm">Undo count: {undoCount}</p>
      <Checkbox id="scratch-undo-reject" label="Reject undo" checked={rejectUndo} onChange={(event) => setRejectUndo(event.target.checked)} />
    </div>
  )
}

export function ScratchPage(): ReactNode {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState('formations')
  const [autosaveMounted, setAutosaveMounted] = useState(true)
  const { show } = useToast()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">UI primitives</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Route checklist</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['First Launch Setup', '/welcome'], ['Home', '/'], ['Season View', '/seasons/x'],
            ['Create Opponent', '/seasons/x/new'], ['Weekly Opponent Overview', '/w/x'],
            ['Source Games List', '/w/x/games'], ['Add Source Game', '/w/x/games/new'],
            ['Hudl CSV Import / Mapping', '/w/x/games/y/import'],
            ['Hudl Import Preview', '/w/x/games/y/import?step=preview'],
            ['Play Log', '/w/x/games/y'], ['Play Detail', '/w/x/games/y/snap/z'],
            ['Quick Notes', '/w/x/games/y/notes'], ['Must Review Queue', '/w/x/games/y/review'],
            ['Play Diagram Gallery', '/w/x/games/y/diagrams'],
            ['Play Designer', '/w/x/games/y/diagrams/z'], ['Opponent Data', '/w/x/data'],
            ['Tendencies / Alerts', '/w/x/tendencies'], ['Report List', '/w/x/reports'],
            ['Report Builder', '/w/x/reports/z'], ['Report Preview', '/w/x/reports/z/preview'],
            ['Coaching Templates', '/templates'], ['Template Builder', '/templates/z'],
            ['Settings', '/settings'], ['Archived Opponents', '/archive'],
          ] as const).map(([label, path]) => <Link key={label} className="text-sm underline" to={path}>{label}</Link>)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Input, select, checkbox, and textarea</h2>
        <label className="block space-y-1"><span className="text-sm">Opponent</span><Input placeholder="Opponent name" /></label>
        <label className="block space-y-1"><span className="text-sm">Play type</span><Select defaultValue="Run"><option>Run</option><option>Pass</option></Select></label>
        <Checkbox label="Must review" />
        <label className="block space-y-1"><span className="text-sm">Notes</span><Textarea placeholder="Coaching notes" /></label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dialog</h2>
        <Button id="scratch-dialog-trigger" onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} aria-labelledby="scratch-dialog-title">
          <h3 id="scratch-dialog-title" className="text-lg font-semibold">Confirm review</h3>
          <p className="my-4 text-sm text-muted-foreground">Native dialog focus and Escape behavior.</p>
          <Button onClick={() => setDialogOpen(false)}>Close dialog</Button>
        </Dialog>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dropdown menu</h2>
        <DropdownMenu
          label="Open menu"
          triggerProps={{ id: 'scratch-menu-trigger' }}
          items={[
            { label: 'Mark reviewed', onSelect: () => undefined },
            { label: 'Duplicate snap', onSelect: () => undefined },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Popover</h2>
        <Popover trigger="Open popover" triggerProps={{ id: 'scratch-popover-trigger' }}>
          A compact cell note belongs here.
        </Popover>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Toast</h2>
        <Button id="scratch-toast-trigger" onClick={() => show({ message: 'Snap deleted', action: { label: 'Undo', onAction: () => undefined } })}>
          Show toast
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Autosave and undo</h2>
        <Button id="scratch-autosave-mount-toggle" variant="outline" onClick={() => setAutosaveMounted((mounted) => !mounted)}>
          {autosaveMounted ? 'Unmount autosave field' : 'Mount autosave field'}
        </Button>
        {autosaveMounted && <AutosaveDemo />}
        <UndoDemo />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tooltip</h2>
        <Tooltip content="Native tooltip text"><Button variant="outline">Hover for title</Button></Tooltip>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tabs and terminology</h2>
        <Tabs
          value={tab}
          onValueChange={setTab}
          label="Terminology lists"
          items={[
            { value: 'formations', label: 'Formations', content: FORMATIONS.join(', ') },
            { value: 'motions', label: 'Motions', content: MOTIONS.join(', ') },
            { value: 'play-concepts', label: 'Play Concepts', content: PLAY_CONCEPTS.join(', ') },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Table: Core field registry and Field Zone aliases</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Label</TableHead><TableHead>Input</TableHead></TableRow></TableHeader>
            <TableBody>
              {CORE_FIELDS.map((field) => <TableRow key={field.key}><TableCell>{field.key}</TableCell><TableCell>{field.label}</TableCell><TableCell>{field.input.kind}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm"><strong>Field Zones:</strong> {FIELD_ZONES.join(', ')}</p>
      </section>
    </div>
  )
}
