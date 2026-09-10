import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'w-full rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: { size: { default: 'h-9', sm: 'h-8' } },
    defaultVariants: { size: 'default' },
  },
)

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof inputVariants>

export function Input({ className, size, ...props }: InputProps): ReactNode {
  return <input className={cn(inputVariants({ size }), className)} {...props} />
}

