import type { ReactNode } from 'react'
import { isConvexConfigured } from '@/convex-client'
import { HudlImport } from '@/features/import/hudl-import'

export function HudlImportPage(): ReactNode {
  return isConvexConfigured ? <HudlImport /> : <p className="p-6">Convex is not configured</p>
}
