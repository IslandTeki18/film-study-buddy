import type { ReactNode } from 'react'
import { ChartingPreview } from '@/features/preview/charting-preview'
// ponytail: static preview until Phase 9 (Opponent Data) lands; swap for the real screen there.
export function OpponentDataPage(): ReactNode { return <ChartingPreview /> }
