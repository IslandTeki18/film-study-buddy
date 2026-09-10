import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: ReactNode
}

export function Checkbox({ className, label, ...props }: CheckboxProps): ReactNode {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className={cn('size-4 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        {...props}
      />
      {label}
    </label>
  )
}
