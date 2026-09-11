/** Eleven editable starting points; all fields are optional and do not carry forward. */
import type { TemplateFieldType } from './templateFields.ts'

export const COACHING_AREAS = [
  'Quarterbacks',
  'Running Backs',
  'Wide Receivers',
  'Tight Ends',
  'Offensive Line',
  'Offensive Coordinator',
  'Defensive Line',
  'Linebackers',
  'DB / Secondary',
  'Defensive Coordinator',
  'Custom / General',
] as const
export type CoachingArea = (typeof COACHING_AREAS)[number]

export function isCoachingArea(value: unknown): value is CoachingArea {
  return COACHING_AREAS.some((area) => area === value)
}

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
  readonly coachingArea: CoachingArea
  readonly name: string
  readonly sections: readonly StarterSection[]
}

const COVERAGE_SHELLS = ['Cover 0', 'Cover 1', 'Cover 2', 'Cover 3', 'Cover 4', 'Cover 6', 'Other']
const FRONTS = ['Even', 'Odd', 'Bear', 'Other']
const DEFENDERS = ['Mike', 'Will', 'Sam', 'Nickel', 'Corner', 'Safety']

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    coachingArea: 'Quarterbacks', name: 'Quarterbacks',
    sections: [
      { name: 'Coverage', fields: [
        { name: 'Coverage Shell', type: 'select', options: COVERAGE_SHELLS },
        { name: 'Rotation', type: 'select', options: ['None', 'Weak', 'Strong', 'Late'] },
        { name: 'Coverage Note', type: 'shortText', options: [] },
      ] },
      { name: 'Pressure', fields: [
        { name: 'Pressure', type: 'checkbox', options: [] },
        { name: 'Rushers', type: 'number', options: [] },
        { name: 'Pressure Source', type: 'multiSelect', options: DEFENDERS },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Running Backs', name: 'Running Backs',
    sections: [
      { name: 'Run Fits', fields: [
        { name: 'Front', type: 'select', options: FRONTS },
        { name: 'Box Count', type: 'number', options: [] },
        { name: 'Unblocked Defender', type: 'shortText', options: [] },
        { name: 'Fit Grade', type: 'rating', options: [] },
      ] },
      { name: 'Pass Protection', fields: [
        { name: 'Pickup Required', type: 'checkbox', options: [] },
        { name: 'Rusher Source', type: 'multiSelect', options: DEFENDERS },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Wide Receivers', name: 'Wide Receivers',
    sections: [
      { name: 'Coverage', fields: [
        { name: 'Coverage Shell', type: 'select', options: COVERAGE_SHELLS },
        { name: 'Corner Technique', type: 'select', options: ['Press', 'Off', 'Bail', 'Squat'] },
        { name: 'Leverage', type: 'select', options: ['Inside', 'Outside', 'Head Up'] },
      ] },
      { name: 'Routes', fields: [
        { name: 'Route Concept', type: 'tags', options: [] },
        { name: 'Targeted', type: 'checkbox', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Tight Ends', name: 'Tight Ends',
    sections: [
      { name: 'Run Blocking', fields: [
        { name: 'Assignment', type: 'select', options: ['Base', 'Down', 'Reach', 'Arc', 'Kick', 'Combo'] },
        { name: 'Defender Alignment', type: 'shortText', options: [] },
      ] },
      { name: 'Pass Game', fields: [
        { name: 'Release', type: 'select', options: ['Free', 'Chipped', 'Held'] },
        { name: 'Coverage Defender', type: 'select', options: ['Linebacker', 'Safety', 'Nickel', 'Corner', 'Zone'] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Offensive Line', name: 'Offensive Line',
    sections: [
      { name: 'Front', fields: [
        { name: 'Front', type: 'select', options: FRONTS },
        { name: 'Stunt', type: 'select', options: ['None', 'TE Twist', 'ET Twist', 'Game', 'Other'] },
        { name: 'Blitz', type: 'checkbox', options: [] },
      ] },
      { name: 'Technique', fields: [
        { name: 'Defender Technique', type: 'tags', options: [] },
        { name: 'Protection Issue', type: 'shortText', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Offensive Coordinator', name: 'Offensive Coordinator',
    sections: [
      { name: 'Defensive Structure', fields: [
        { name: 'Front', type: 'select', options: FRONTS },
        { name: 'Coverage Shell', type: 'select', options: COVERAGE_SHELLS },
        { name: 'Pressure', type: 'checkbox', options: [] },
      ] },
      { name: 'Game Plan', fields: [
        { name: 'Personnel Adjustment', type: 'shortText', options: [] },
        { name: 'Candidate Concept', type: 'tags', options: [] },
        { name: 'Priority', type: 'rating', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Defensive Line', name: 'Defensive Line',
    sections: [
      { name: 'Run Game', fields: [
        { name: 'Blocking Scheme', type: 'select', options: ['Inside Zone', 'Outside Zone', 'Power', 'Counter', 'Trap', 'Duo', 'Iso', 'Other'] },
        { name: 'Puller', type: 'select', options: ['None', 'Guard', 'Tackle', 'Tight End', 'Guard and Tackle'] },
        { name: 'Double Team', type: 'checkbox', options: [] },
        { name: 'Backside Action', type: 'select', options: ['Cutoff', 'Bootleg', 'Reverse', 'None'] },
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
      { name: 'Pass Game', fields: [
        { name: 'Protection', type: 'select', options: ['Slide Left', 'Slide Right', 'Man', 'Half Slide', 'Max', 'Other'] },
        { name: 'Chip / Help', type: 'checkbox', options: [] },
        { name: 'Launch Point', type: 'select', options: ['Pocket', 'Rollout Left', 'Rollout Right', 'Bootleg', 'Quick Game'] },
        { name: 'Rush Opportunity', type: 'rating', options: [] },
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Linebackers', name: 'Linebackers',
    sections: [
      { name: 'Run Keys', fields: [
        { name: 'Guard Read', type: 'select', options: ['Base', 'Pull', 'Pass Set', 'Down'] },
        { name: 'Back Action', type: 'select', options: ['Downhill', 'Lateral', 'Counter Step', 'Pass Set'] },
        { name: 'Scheme Family', type: 'select', options: ['Zone', 'Gap', 'Other'] },
      ] },
      { name: 'Pass Drops', fields: [
        { name: 'Route Threat', type: 'tags', options: [] },
        { name: 'Drop Assignment', type: 'shortText', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'DB / Secondary', name: 'DB / Secondary',
    sections: [
      { name: 'Formation Read', fields: [
        { name: 'Receiver Split', type: 'select', options: ['Tight', 'Normal', 'Wide'] },
        { name: 'Receivers', type: 'number', options: [] },
        { name: 'Stack or Bunch', type: 'checkbox', options: [] },
      ] },
      { name: 'Routes', fields: [
        { name: 'Route Combination', type: 'tags', options: [] },
        { name: 'Deep Shot', type: 'checkbox', options: [] },
        { name: 'Target Receiver', type: 'shortText', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Defensive Coordinator', name: 'Defensive Coordinator',
    sections: [
      { name: 'Offensive Tendency', fields: [
        { name: 'Tempo', type: 'select', options: ['Huddle', 'No Huddle', 'Check With Me'] },
        { name: 'Motion Purpose', type: 'select', options: ['Eye Candy', 'Formation Change', 'Run Action', 'Pass Action'] },
        { name: 'Key Player', type: 'shortText', options: [] },
      ] },
      { name: 'Call Planning', fields: [
        { name: 'Answer Call', type: 'shortText', options: [] },
        { name: 'Priority', type: 'rating', options: [] },
        { name: 'Call Tags', type: 'tags', options: [] },
      ] },
      { name: 'Notes', fields: [
        { name: 'Coaching Note', type: 'longText', options: [] },
      ] },
    ],
  },
  {
    coachingArea: 'Custom / General', name: 'Custom / General',
    sections: [
      { name: 'General', fields: [
        { name: 'Observation', type: 'longText', options: [] },
        { name: 'Tags', type: 'tags', options: [] },
      ] },
    ],
  },
]

export function getStarterTemplate(area: CoachingArea): StarterTemplate {
  const template = STARTER_TEMPLATES.find((template) => template.coachingArea === area)
  if (!template) throw new Error(`Unknown Coaching Area: ${area}`)
  return template
}
