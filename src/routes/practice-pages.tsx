import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { ScoutCardsPrint } from '@/features/practice/scout-cards-print'
import { ScriptEditor } from '@/features/practice/script-editor'
import { ScriptList } from '@/features/practice/script-list'
import { ScriptPrint } from '@/features/practice/script-print'

const NOT_CONFIGURED = <p className="p-6">Convex is not configured</p>
export function PracticeListPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <ScriptList workspaceId={workspaceId} /> : NOT_CONFIGURED
}
export function PracticeEditorPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScriptEditor workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
export function PracticePrintPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScriptPrint workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
export function ScoutCardsPage(): ReactNode {
  const { workspaceId = '', scriptId = '' } = useParams()
  return isConvexConfigured ? <ScoutCardsPrint workspaceId={workspaceId} scriptId={scriptId} /> : NOT_CONFIGURED
}
