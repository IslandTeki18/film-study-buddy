import type { AuthConfig } from 'convex/server'

// Clerk issues the JWT (template named `convex`). Empty until CLERK_JWT_ISSUER_DOMAIN is set on the
// deployment, so pushes keep working before Clerk is configured.
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN

export default {
  providers: domain ? [{ domain, applicationID: 'convex' }] : [],
} satisfies AuthConfig
