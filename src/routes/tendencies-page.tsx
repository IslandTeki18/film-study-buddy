import type { ReactNode } from 'react'
import { TendenciesPreview } from '@/features/preview/tendencies-preview'
// ponytail: static preview until Phase 9 (Tendencies) lands; swap for the real screen there.
export function TendenciesPage(): ReactNode { return <TendenciesPreview /> }
