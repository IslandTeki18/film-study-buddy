/** The one Coaching Template this build ships: defensive line charting. Every field is optional and editable. */
import type { TemplateFieldType } from './templateFields.ts'

export const DL_TEMPLATE_NAME = 'Defensive Line'

export interface StarterField {
  readonly name: string
  readonly type: TemplateFieldType
  readonly options: readonly string[]
}
export interface StarterSection {
  readonly name: string
  readonly fields: readonly StarterField[]
}
export interface StarterTemplate {
  readonly name: string
  readonly sections: readonly StarterSection[]
}

export const DL_TEMPLATE: StarterTemplate = {
  name: DL_TEMPLATE_NAME,
  sections: [
    { name: 'Pre-Snap', fields: [
      { name: 'OL Splits', type: 'select', options: ['Tight', 'Normal', 'Wide', 'Mixed'] },
      { name: 'OL Stance', type: 'select', options: ['Heavy', 'Light', 'Mixed', 'Two-Point'] },
      { name: 'Tipping Lineman', type: 'shortText', options: [] },
      { name: 'TE Alignment', type: 'select', options: ['None', 'Attached', 'Wing', 'Flexed', 'Off the Ball'] },
      { name: 'Back Alignment', type: 'select', options: ['Behind QB', 'Offset Strong', 'Offset Weak', 'Pistol', 'Empty'] },
    ] },
    { name: 'Run Game', fields: [
      { name: 'Blocking Scheme', type: 'select', options: ['Inside Zone', 'Outside Zone', 'Power', 'Counter', 'Trap', 'Duo', 'Iso', 'Wham', 'Pin and Pull', 'Draw', 'Other'] },
      { name: 'Point of Attack', type: 'select', options: ['A Gap', 'B Gap', 'C Gap', 'Edge'] },
      { name: 'Puller', type: 'select', options: ['None', 'Guard', 'Tackle', 'Tight End', 'Guard and Tackle', 'Center'] },
      { name: 'Double Team', type: 'checkbox', options: [] },
      { name: 'Unblocked Defender', type: 'shortText', options: [] },
      { name: 'Backside Action', type: 'select', options: ['Cutoff', 'Bootleg', 'Reverse', 'None'] },
      { name: 'Coaching Note', type: 'longText', options: [] },
    ] },
    { name: 'Pass Game', fields: [
      { name: 'Protection', type: 'select', options: ['Slide Left', 'Slide Right', 'Man', 'Half Slide', 'Max', 'Other'] },
      { name: 'QB Drop', type: 'select', options: ['Quick', '3-Step', '5-Step', 'Play Action', 'Screen'] },
      { name: 'Chip / Help', type: 'checkbox', options: [] },
      { name: 'Launch Point', type: 'select', options: ['Pocket', 'Rollout Left', 'Rollout Right', 'Bootleg', 'Quick Game'] },
      { name: 'Rush Opportunity', type: 'rating', options: [] },
      { name: 'Coaching Note', type: 'longText', options: [] },
    ] },
  ],
}
