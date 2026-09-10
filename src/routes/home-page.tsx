import type { ReactNode } from 'react'

export function HomePage(): ReactNode {
  return (
    <section className="mx-auto max-w-2xl space-y-3 p-8">
      <h1 className="text-2xl font-semibold">Film Room</h1>
      <p className="text-muted-foreground text-sm">
        Film study workspaces are not part of this build. Theme settings are available in the
        sidebar and under Settings.
      </p>
    </section>
  )
}
