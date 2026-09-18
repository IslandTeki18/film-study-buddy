import { useEffect, useState, type ReactNode } from 'react'
import { useConvexConnectionState } from 'convex/react'
import { Button } from '@/components/ui/button'

export function ConnectionBanner(): ReactNode {
  const { isWebSocketConnected, hasInflightRequests } = useConvexConnectionState()
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (isWebSocketConnected) { setShow(false); return }
    const timer = window.setTimeout(() => setShow(true), 3000)
    return () => window.clearTimeout(timer)
  }, [isWebSocketConnected])
  if (!show) return null
  return <div role="status" className="flex flex-wrap items-center gap-3 border-b border-warm bg-warm/10 px-4 py-2 text-sm">
    <span>Not connected to Convex. Data on screen may be out of date, and changes will not reach the database until the connection returns.</span>
    <Button variant="outline" size="sm" disabled={hasInflightRequests} onClick={() => window.location.reload()}>Retry</Button>
    {hasInflightRequests && <span>Waiting to send pending changes</span>}
  </div>
}
