import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Segmented control shared by mode, layout and sub-tab pickers. */
export function Segmented<T extends string>({ label, value, options, onChange, accent = false }: {
  readonly label: string; readonly value: T; readonly options: ReadonlyArray<readonly [T, string]>
  readonly onChange: (value: T) => void; readonly accent?: boolean
}): ReactNode {
  return <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-lg border border-border-strong bg-accent p-[3px]">
    {options.map(([id, text], index) => <button key={id} type="button" role="radio" aria-checked={value === id} tabIndex={value === id ? 0 : -1} onClick={() => onChange(id)}
      onKeyDown={(event) => {
        const last = options.length - 1
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
          : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % options.length
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + last) % options.length : -1
        if (next < 0) return
        event.preventDefault()
        onChange(options[next]![0])
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
      }}
      className={cn('rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        value === id ? (accent ? 'bg-primary text-primary-foreground' : 'bg-border-strong text-foreground') : 'text-muted-foreground hover:text-foreground')}>
      {text}
    </button>)}
  </div>
}
