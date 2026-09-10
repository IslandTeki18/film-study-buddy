/** Assumed buckets: Short ≤3, Medium ≤6, Long >6; first down is unsplit, zero is Short. */
// ponytail: shell boundary checks only; add node --test coverage before Phase 6.
export const DOWN_DISTANCE_SITUATIONS = [
  '1st Down', '2nd & Short', '2nd & Medium', '2nd & Long',
  '3rd & Short', '3rd & Medium', '3rd & Long',
  '4th & Short', '4th & Medium', '4th & Long',
] as const
export type DownDistanceSituation = (typeof DOWN_DISTANCE_SITUATIONS)[number]

export const DISTANCE_BUCKETS = [
  { label: 'Short', max: 3 },
  { label: 'Medium', max: 6 },
  { label: 'Long', max: Infinity },
] as const

export function downDistanceSituationOf(
  down: number | undefined,
  distance: number | undefined,
): DownDistanceSituation | null {
  if (down === undefined || distance === undefined || !Number.isInteger(down) ||
    down < 1 || down > 4 || !Number.isFinite(distance) || distance < 0) return null
  if (down === 1) return '1st Down'
  const bucket = DISTANCE_BUCKETS.find(({ max }) => distance <= max)
  const ordinal = down === 2 ? '2nd' : down === 3 ? '3rd' : '4th'
  return DOWN_DISTANCE_SITUATIONS.find((value) => value === `${ordinal} & ${bucket?.label}`) ?? null
}
