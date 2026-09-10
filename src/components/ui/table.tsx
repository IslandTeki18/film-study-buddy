import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

export type TableProps = TableHTMLAttributes<HTMLTableElement>
export function Table({ className, ...props }: TableProps): ReactNode {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />
}

export type TableSectionProps = HTMLAttributes<HTMLTableSectionElement>
export function TableHeader({ className, ...props }: TableSectionProps): ReactNode {
  return <thead className={cn('bg-muted text-left', className)} {...props} />
}
export function TableBody({ className, ...props }: TableSectionProps): ReactNode {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>
export function TableRow({ className, ...props }: TableRowProps): ReactNode {
  return <tr className={cn('border-b border-border hover:bg-muted/50', className)} {...props} />
}

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>
export function TableHead({ className, ...props }: TableHeadProps): ReactNode {
  return <th className={cn('h-8 px-2 font-medium', className)} {...props} />
}

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>
export function TableCell({ className, ...props }: TableCellProps): ReactNode {
  return <td className={cn('px-2 py-1.5', className)} {...props} />
}

