import { useId, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  readonly value: string
  readonly label: ReactNode
  readonly content: ReactNode
  readonly disabled?: boolean
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly items: readonly TabItem[]
  readonly label: string
}

export function Tabs({ value, onValueChange, items, label, className, ...props }: TabsProps): ReactNode {
  const baseId = `tabs-${useId().replaceAll(':', '')}`

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    const enabled = items.filter((item) => !item.disabled)
    const current = enabled.findIndex((item) => item.value === value)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
      : event.key === 'ArrowRight' ? (current + 1) % enabled.length
      : (current - 1 + enabled.length) % enabled.length
    const item = enabled[next]
    if (!item) return
    event.preventDefault()
    onValueChange(item.value)
    document.getElementById(`${baseId}-tab-${item.value}`)?.focus()
  }

  return (
    <div className={className} {...props}>
      <div role="tablist" aria-label={label} className="flex border-b border-border" onKeyDown={onKeyDown}>
        {items.map((item) => (
          <button
            key={item.value}
            id={`${baseId}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={item.value === value}
            aria-controls={`${baseId}-panel-${item.value}`}
            tabIndex={item.value === value ? 0 : -1}
            disabled={item.disabled}
            className={cn('px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', item.value === value && 'border-b-2 border-primary font-medium')}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          id={`${baseId}-panel-${item.value}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.value}`}
          tabIndex={0}
          hidden={item.value !== value}
          className="p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.value === value ? item.content : null}
        </div>
      ))}
    </div>
  )
}
