import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Bordered surface used for cards and row groups throughout the Film Room layout. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('rounded-xl border border-border bg-card', className)} {...props} />
}

/** Small uppercase section label. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLElement>): ReactNode {
  return <span className={cn('text-[11px] font-semibold tracking-[0.11em] uppercase text-muted-foreground', className)} {...props} />
}

/** Monospace secondary text: metadata, counts, hints. */
export function Meta({ className, ...props }: HTMLAttributes<HTMLElement>): ReactNode {
  return <span className={cn('font-mono text-[11px] text-muted-foreground', className)} {...props} />
}

/** Monospace tag chip. */
export function Chip({ className, ...props }: HTMLAttributes<HTMLElement>): ReactNode {
  return <span className={cn('rounded-md border border-border-strong bg-muted px-2 py-1 font-mono text-[11px] text-foreground/80', className)} {...props} />
}

/** Centered page column with the design's padding. */
export function Page({ className, width = 'max-w-3xl', ...props }: HTMLAttributes<HTMLElement> & { readonly width?: string }): ReactNode {
  return <section className="flex justify-center px-6 pt-8 pb-12">
    <div className={cn('grid w-full content-start gap-6', width, className)} {...props} />
  </section>
}
