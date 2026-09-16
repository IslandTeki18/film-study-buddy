import { CORE_FIELDS, type CoreFieldKey } from './coreFields.ts'
import { NAME_MAX_LENGTH } from './names.ts'

export const REPORT_INTENTS = ['coach', 'player'] as const
export type ReportIntent = (typeof REPORT_INTENTS)[number]
export const REPORT_INTENT_LABEL: Record<ReportIntent, string> = { coach: 'Coach Report', player: 'Player Report' }

export function playerReportName(name: string): string {
  return `${name.slice(0, NAME_MAX_LENGTH - ' (Player)'.length)} (Player)`
}

export type BlockType = 'heading' | 'text' | 'dataTable' | 'tendency' | 'diagram' | 'selectedPlays' | 'quickNotes'
export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  heading: 'Heading', text: 'Text / Coach Notes', dataTable: 'Opponent Data Table', tendency: 'Tendency / Alert',
  diagram: 'Play Diagram', selectedPlays: 'Selected Plays', quickNotes: 'Quick Notes',
}
export const HEADING_MAX_LENGTH = 120
export const TEXT_BLOCK_MAX_LENGTH = 10000
export const CAPTION_MAX_LENGTH = 200
export const TABLE_TITLE_MAX_LENGTH = 120
export const SELECTED_PLAYS_MAX_SNAPS = 200
export const SELECTED_PLAYS_MAX_COLUMNS = 20
export const QUICK_NOTES_BLOCK_MAX_NOTES = 200
export const REPORT_BLOCKS_MAX_BYTES = 800_000
export const DEFAULT_SELECTED_PLAY_CORE_KEYS: readonly CoreFieldKey[] = ['clipNumber', 'down', 'distance', 'formation', 'playConcept', 'direction', 'yards']
export const CLIP_REFERENCE_LABEL = CORE_FIELDS.find((field) => field.key === 'clipNumber')!.label

export function visibleSelectedPlayFields(fields: readonly string[], showClipReferences: boolean): string[] {
  return fields.filter((field) => showClipReferences || field !== CLIP_REFERENCE_LABEL)
}

export function uniqueLabels(labels: readonly string[]): string[] {
  const used = new Set<string>()
  return labels.map((label) => {
    let candidate = label
    let suffix = 2
    while (used.has(candidate)) candidate = `${label} (${suffix++})`
    used.add(candidate)
    return candidate
  })
}

export function pdfFileName({ opponentName, week, reportName }: { opponentName: string; week: number; reportName: string }): string {
  const name = `${opponentName} Week ${week} - ${reportName}`.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120).trim()
  return `${name || 'Report'}.pdf`
}
