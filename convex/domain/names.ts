export const NAME_MAX_LENGTH = 80

export function normalizeName(value: string): string | null {
  const name = value.trim()
  return name.length > 0 && name.length <= NAME_MAX_LENGTH ? name : null
}
