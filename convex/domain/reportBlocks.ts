import { NAME_MAX_LENGTH } from './names.ts'

export const REPORT_INTENTS = ['coach', 'player'] as const
export type ReportIntent = (typeof REPORT_INTENTS)[number]
export const REPORT_INTENT_LABEL: Record<ReportIntent, string> = { coach: 'Coach Report', player: 'Player Report' }

export function playerReportName(name: string): string {
  return `${name.slice(0, NAME_MAX_LENGTH - ' (Player)'.length)} (Player)`
}
