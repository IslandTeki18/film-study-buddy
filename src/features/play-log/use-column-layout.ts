import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { reconcileView, type ColumnKey } from '@convex/domain/templateFields'
import { useToast } from '@/components/ui/toast'

export const COLUMN_MIN_WIDTH = 40
export interface ColumnLayout {
  readonly viewId: Id<'templateViews'> | null
  readonly visible: ColumnKey[]
  readonly order: ColumnKey[]
  readonly widths: Readonly<Record<string, number>>
}

export function useColumnLayout(sourceGameId: Id<'sourceGames'> | undefined, catalog: ColumnKey[]): {
  layout: ColumnLayout | undefined
  setVisible: (visible: ColumnKey[]) => void
  setOrder: (order: ColumnKey[]) => void
  setWidth: (key: ColumnKey, width: number) => void
} {
  const saved = useQuery(api.columnLayouts.get, sourceGameId ? { sourceGameId } : 'skip')
  const { show } = useToast()
  const save = useMutation(api.columnLayouts.save).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.columnLayouts.get, { sourceGameId: args.sourceGameId })
    store.setQuery(api.columnLayouts.get, { sourceGameId: args.sourceGameId }, {
      _id: current?._id ?? 'optimistic-layout' as Id<'columnLayouts'>,
      _creationTime: current?._creationTime ?? Date.now(), ...args,
    })
  })
  const reconciled = saved ? reconcileView({ visibleColumns: saved.visible, columnOrder: saved.order }, catalog) : null
  const layout: ColumnLayout | undefined = saved === undefined ? undefined : {
    viewId: saved?.viewId ?? null, visible: reconciled?.visibleColumns ?? catalog,
    order: reconciled?.columnOrder ?? catalog,
    widths: Object.fromEntries(Object.entries(saved?.widths ?? {}).filter(([key]) => catalog.includes(key as ColumnKey))),
  }
  function persist(patch: Partial<ColumnLayout>): void {
    if (!layout || !sourceGameId) return
    const next = { ...layout, ...patch }
    void save({ sourceGameId, ...(next.viewId ? { viewId: next.viewId } : {}),
      visible: next.order.filter((key) => next.visible.includes(key)), order: next.order, widths: { ...next.widths },
    }).catch((error: unknown) => show({ message: `Could not update layout. ${error instanceof Error ? error.message : String(error)}` }))
  }
  return { layout, setVisible: (visible) => persist({ visible }), setOrder: (order) => persist({ order }),
    setWidth: (key, width) => persist({ widths: { ...layout?.widths, [key]: Math.max(COLUMN_MIN_WIDTH, width) } }) }
}
