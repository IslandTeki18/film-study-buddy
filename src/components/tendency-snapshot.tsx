import type { ReactNode } from 'react'
import { formatAvgYards, formatFrequency } from '@convex/domain/aggregate'
import { Meta } from '@/components/ui/panel'

export function TendencySnapshot({ snapshot }: {
  readonly snapshot: { readonly groupBy: string; readonly groupBy2?: string; readonly rows: readonly { values: readonly string[]; snaps: number; frequency: number; avgYards: number | null }[] }
}): ReactNode {
  return <div className="space-y-2">{snapshot.rows.map((row, index) => <dl key={index} className="flex flex-wrap gap-x-5 gap-y-2">
    {[[snapshot.groupBy, row.values[0]], ...(snapshot.groupBy2 ? [[snapshot.groupBy2, row.values[1]]] : []), ['Snaps', row.snaps], ['Frequency', formatFrequency(row.frequency)], ['Avg. Yards', formatAvgYards(row.avgYards)]].map(([label, value], index) => <div key={index}><dt><Meta>{label}</Meta></dt><dd className="text-sm">{value}</dd></div>)}
  </dl>)}</div>
}
