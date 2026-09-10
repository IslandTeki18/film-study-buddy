import type { ReactNode } from 'react'
import { useParams } from 'react-router'

export function RoutePlaceholder({ title }: { readonly title: string }): ReactNode {
  const params = useParams()
  return (
    <section className="mx-auto max-w-3xl space-y-3 p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {Object.keys(params).length > 0 && <pre className="text-sm text-muted-foreground">{JSON.stringify(params, null, 2)}</pre>}
    </section>
  )
}
