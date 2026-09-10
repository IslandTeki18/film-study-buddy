import type { HTMLAttributes, ReactNode } from 'react'

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  readonly content: string
}

// ponytail: native title is enough until a custom visual tooltip is a demonstrated need.
export function Tooltip({ content, children, ...props }: TooltipProps): ReactNode {
  return <span title={content} {...props}>{children}</span>
}

