import type { ReactNode } from 'react'
import { ReportsPreview } from '@/features/preview/reports-preview'
// ponytail: static preview until Phase 10 (Reports) lands; swap for the real screen there.
export function ReportListPage(): ReactNode { return <ReportsPreview /> }
