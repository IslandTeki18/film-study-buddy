import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { isConvexConfigured } from '@/convex-client'
import { CoachingAreaPicker } from '@/features/first-launch/coaching-area-picker'

export function WelcomePage(): ReactNode {
  return isConvexConfigured ? <WelcomeGate /> : <Navigate to="/" replace />
}

function WelcomeGate(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  if (settings === undefined) return <div role="status" aria-label="Loading settings" className="m-6 h-24 animate-pulse rounded bg-muted" />
  if (settings?.firstLaunchCompletedAt !== undefined) return <Navigate to="/" replace />
  return <CoachingAreaPicker />
}
