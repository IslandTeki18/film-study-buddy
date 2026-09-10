import { cronJobs, makeFunctionReference } from 'convex/server'

const crons = cronJobs()

const purgeExpired = makeFunctionReference<'mutation', {}, null>(
  'deletions:purgeExpired',
)

// 08:00 UTC is the fixed V1 maintenance window.
crons.daily('purge expired soft deletes', { hourUTC: 8, minuteUTC: 0 }, purgeExpired, {})

export default crons
