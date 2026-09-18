import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { inDialog, isShortcut, LOCAL_KEYS, SHORTCUTS } from '@/lib/shortcuts'

export function ShortcutHelp(): ReactNode {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = (): void => setOpen(true)
    function onKey(event: KeyboardEvent): void {
      if (!event.defaultPrevented && !inDialog(event.target) && isShortcut(event, 'showHelp')) {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener('shortcut-help:open', show)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('shortcut-help:open', show)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
  return <Dialog open={open} onOpenChange={setOpen} aria-labelledby="shortcut-help-title" className="max-h-[80vh] overflow-y-auto">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id="shortcut-help-title" className="text-lg font-semibold">Keyboard shortcuts</h2>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
    </div>
    {(['Global', 'Play Log', 'Play Detail', 'Focused Review Mode'] as const).map((context) => {
      const rows = [...Object.values(SHORTCUTS), ...LOCAL_KEYS].filter((row) => row.context === context)
      return <section key={context} className="mb-4">
        <h3 className="mb-2 font-semibold">{context}</h3>
        <table className="w-full text-left text-sm"><thead><tr><th scope="col" className="pr-4">Key</th><th scope="col">Action</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t border-border">
            <td className="py-1 pr-4 align-top"><kbd>{row.label}</kbd></td><td className="py-1">{row.description}</td>
          </tr>)}</tbody>
        </table>
      </section>
    })}
  </Dialog>
}
