import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, type DialogProps } from './dialog'

/** A modal Dialog pinned to the right edge of the window. */
export function Sheet({ className, ...props }: DialogProps): ReactNode {
  return <Dialog className={cn('m-0 ml-auto h-dvh max-h-none w-[min(960px,100vw)] max-w-none overflow-y-auto rounded-none rounded-l-xl p-0', className)} {...props} />
}
