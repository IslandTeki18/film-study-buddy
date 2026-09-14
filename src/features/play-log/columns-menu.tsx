import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover } from '@/components/ui/popover'
import type { ColumnKey } from '@convex/domain/templateFields'
import type { PlayLogColumn } from './columns'
import type { ColumnLayout } from './use-column-layout'

export function ColumnsMenu({ columns, layout, onChange }: {
  readonly columns: readonly PlayLogColumn[]; readonly layout: ColumnLayout
  readonly onChange: (visible: ColumnKey[]) => void
}): ReactNode {
  return <Popover trigger="Columns" className="max-h-96 overflow-auto">
    <div className="flex flex-col gap-2">{layout.order.map((key) => <Checkbox key={key}
      label={columns.find((column) => column.key === key)?.label ?? key}
      checked={layout.visible.includes(key)} disabled={layout.visible.length === 1 && layout.visible.includes(key)}
      onChange={(event) => onChange(event.target.checked ? [...layout.visible, key] : layout.visible.filter((item) => item !== key))} />)}</div>
  </Popover>
}
