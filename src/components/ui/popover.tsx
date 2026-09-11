import { useId, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/utils'

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  readonly trigger: ReactNode
  readonly triggerProps?: Omit<ButtonProps, 'children' | 'popoverTarget'>
  readonly contentRef?: Ref<HTMLDivElement>
}

export function Popover({ trigger, triggerProps, contentRef, id: suppliedId, className, children, ...props }: PopoverProps): ReactNode {
  const generatedId = `popover-${useId().replaceAll(':', '')}`
  const id = suppliedId ?? generatedId
  return (
    <>
      <Button type="button" variant="outline" popoverTarget={id} {...triggerProps}>{trigger}</Button>
      <div
        ref={contentRef}
        id={id}
        popover="auto"
        className={cn(
          'fixed inset-auto m-0 [position-area:bottom_span-left] [position-try-fallbacks:flip-block,flip-inline,flip-block_flip-inline]',
          'rounded-md border border-border bg-background p-4 text-sm text-foreground shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
}
