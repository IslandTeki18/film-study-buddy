import { useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import type { ButtonProps } from './button'
import { Popover } from './popover'
import { cn } from '@/lib/utils'

export interface DropdownMenuItem {
  readonly label: string
  readonly onSelect: () => void
  readonly disabled?: boolean
}

export interface DropdownMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly label: ReactNode
  readonly items: readonly DropdownMenuItem[]
  readonly triggerProps?: Omit<ButtonProps, 'children'>
}

export function DropdownMenu({ label, items, triggerProps, className, ...props }: DropdownMenuProps): ReactNode {
  const menuRef = useRef<HTMLDivElement>(null)
  const { onKeyDown: suppliedOnKeyDown, onToggle: suppliedOnToggle, ...menuProps } = props

  function focusItem(index: number): void {
    const enabled = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
    enabled.at(index)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const enabled = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement)
    const destination = event.key === 'ArrowDown' ? (index + 1) % enabled.length
      : event.key === 'ArrowUp' ? (index - 1 + enabled.length) % enabled.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : null
    if (destination !== null && enabled.length > 0) {
      event.preventDefault()
      enabled[destination]?.focus()
    }
    if (event.key === 'Escape') menuRef.current?.hidePopover()
  }

  return (
    <Popover
      trigger={label}
      triggerProps={{ 'aria-haspopup': 'menu', ...triggerProps }}
      contentRef={menuRef}
      role="menu"
      aria-label={typeof label === 'string' ? label : 'Actions'}
      className={cn('m-0 min-w-40 p-1', className)}
      onToggle={(event) => {
        suppliedOnToggle?.(event)
        if (!event.defaultPrevented && (event.nativeEvent as ToggleEvent).newState === 'open') focusItem(0)
      }}
      onKeyDown={(event) => {
        suppliedOnKeyDown?.(event)
        if (!event.defaultPrevented) onKeyDown(event)
      }}
      {...menuProps}
    >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus:bg-accent disabled:opacity-50"
            onClick={() => {
              item.onSelect()
              menuRef.current?.hidePopover()
            }}
          >
            {item.label}
          </button>
        ))}
    </Popover>
  )
}
