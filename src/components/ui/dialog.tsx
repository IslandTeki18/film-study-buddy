import { useEffect, useRef, type DialogHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open'> {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function Dialog({ open, onOpenChange, onClose, className, children, ...props }: DialogProps): ReactNode {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cn(
        'm-auto max-w-lg rounded-lg border border-border bg-background p-6 text-foreground shadow-xl backdrop:bg-foreground/40',
        className,
      )}
      {...props}
      onClose={(event) => {
        onOpenChange(false)
        onClose?.(event)
      }}
    >
      {children}
    </dialog>
  )
}
