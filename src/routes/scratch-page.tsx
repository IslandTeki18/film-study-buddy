import { useState, type ReactNode } from 'react'
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

export function ScratchPage(): ReactNode {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState('formations')
  const { show } = useToast()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">UI primitives</h1>

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
