import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { QuickNotes } from '@/features/notes/quick-notes'

export function QuickNotesPage(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  return isConvexConfigured ? <QuickNotes workspaceId={workspaceId} sourceGameId={gameId} /> : <p className="p-6">Convex is not configured</p>
}
