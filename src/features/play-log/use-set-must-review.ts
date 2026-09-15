import { useMutation, type ReactMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

export function useSetMustReview(sourceGameId: Id<'sourceGames'>): ReactMutation<typeof api.snaps.setMustReview> {
  return useMutation(api.snaps.setMustReview).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    if (current) store.setQuery(api.snaps.listBySourceGame, query, current.map((item) => item._id === args.snapId ? { ...item, mustReview: args.mustReview } : item))
    const detail = store.getQuery(api.snaps.get, { snapId: args.snapId })
    if (detail) store.setQuery(api.snaps.get, { snapId: args.snapId }, { ...detail, mustReview: args.mustReview })
  })
}
