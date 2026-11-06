import type { ReactNode } from 'react'
import { Authenticated, AuthLoading, Unauthenticated, type ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, SignIn, useAuth } from '@clerk/electron/react'

/**
 * Clerk identity for Convex. Children render only after Convex has accepted the Clerk token, so no
 * app query runs signed out.
 */
export function AccountGate({ publishableKey, client, children }: {
  readonly publishableKey: string
  readonly client: ConvexReactClient
  readonly children: ReactNode
}): ReactNode {
  return <ClerkProvider publishableKey={publishableKey}>
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <AuthLoading><div role="status" aria-label="Checking sign-in" className="m-6 h-32 animate-pulse rounded bg-muted" /></AuthLoading>
      <Unauthenticated>
        <main className="grid min-h-screen place-items-center bg-background p-6"><SignIn /></main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </ConvexProviderWithClerk>
  </ClerkProvider>
}
