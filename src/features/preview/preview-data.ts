/**
 * Static sample data lifted from the Film Room design. These screens (Charting, Player notes,
 * Tendencies, Reports) have no backend yet (TASKS.md phases 5, 7, 9, 10). Everything here is
 * UI-only and is labelled "preview data" on screen. Delete this module when the real queries land.
 */

export type Mode = 'off' | 'def'
export type Field = 'dd' | 'zone' | 'pers' | 'form' | 'motion' | 'call' | 'result'

export interface GroupDef { readonly field: Field; readonly name: string; readonly editable: boolean }
export interface Play {
  readonly n: number; readonly dd: string; readonly zone: string; readonly pers: string; readonly form: string
  readonly motion: string; readonly call: string; readonly result: string; readonly gain: number; readonly review: boolean
  readonly fresh?: boolean
}

export const DD_TAGS = ['1st & 10', '2nd & short', '2nd & long', '3rd & short', '3rd & med', '3rd & long', '4th down']
export const ZONE_TAGS = ['Own 10', 'Own 20-40', 'Midfield', 'Opp 40-20', 'Red zone', 'Goal line']
const RESULT_TAGS = ['Gain', 'Explosive', 'Loss', 'TD', 'Incomplete', 'Sack', 'Penalty', 'Turnover']

export const TAGS: Record<Mode, Record<Field, readonly string[]>> = {
  off: {
    dd: DD_TAGS, zone: ZONE_TAGS, result: RESULT_TAGS,
    pers: ['10', '11', '12', '20', '21', '22'],
    form: ['Gun Spread', 'Gun Trips', 'Gun Empty', 'Pistol Ace', 'Under Center', 'Wing-T'],
    motion: ['None', 'Jet', 'Orbit', 'Shift', 'Tap'],
    call: ['Inside Zone', 'Outside Zone', 'Power', 'Counter', 'RPO Glance', 'Quick Hitch', 'PA Post', 'Screen', 'Draw', 'Sprint Out'],
  },
  def: {
    dd: DD_TAGS, zone: ZONE_TAGS, result: RESULT_TAGS,
    pers: ['4-2-5', 'Bear', '3-4 Odd', 'Tite', 'Bandit'],
    form: ['Cover 1', 'Cover 2', 'Cover 3', 'Quarters', 'Cover 0', '2-Man'],
    motion: ['Static', 'Late rotate', 'Walk-up', 'Sugar', 'Creep'],
    call: ['None', 'Edge', 'A-gap', 'Sim', 'Fire zone', 'Corner', 'Safety'],
  },
}

export const GROUPS: Record<Mode, readonly GroupDef[]> = {
  off: [
    { field: 'dd', name: 'Down & distance', editable: false }, { field: 'zone', name: 'Field zone', editable: false },
    { field: 'pers', name: 'Personnel', editable: true }, { field: 'form', name: 'Formation', editable: true },
    { field: 'motion', name: 'Motion / shift', editable: false }, { field: 'call', name: 'Concept', editable: true },
    { field: 'result', name: 'Result', editable: false },
  ],
  def: [
    { field: 'dd', name: 'Down & distance', editable: false }, { field: 'zone', name: 'Field zone', editable: false },
    { field: 'pers', name: 'Front', editable: true }, { field: 'form', name: 'Coverage', editable: true },
    { field: 'motion', name: 'Pre-snap look', editable: false }, { field: 'call', name: 'Pressure', editable: true },
    { field: 'result', name: 'Result', editable: false },
  ],
}

export const TAG_SUB: Record<string, string> = {
  '1st & 10': 'base down', '2nd & short': '1–4 to go', '2nd & long': '7+ to go', '3rd & short': '1–3 to go',
  '3rd & med': '4–7 to go', '3rd & long': '8+ to go', '4th down': 'any distance',
  'Own 10': 'backed up', 'Own 20-40': 'own side', Midfield: '40 to 40', 'Opp 40-20': 'fringe', 'Red zone': 'inside 20', 'Goal line': 'inside 5',
  '10': '1 back, 0 TE', '11': '1 back, 1 TE', '12': '1 back, 2 TE', '20': '2 back, 0 TE', '21': '2 back, 1 TE', '22': '2 back, 2 TE',
}

type Row = readonly [number, string, string, string, string, string, string, string, number, number]
const toPlay = ([n, dd, zone, pers, form, motion, call, result, gain, review]: Row): Play =>
  ({ n, dd, zone, pers, form, motion, call, result, gain, review: review === 1 })

export const PLAYS: Record<Mode, readonly Play[]> = {
  off: ([
    [1, '1st & 10', 'Own 20-40', '11', 'Gun Trips', 'Jet', 'Outside Zone', 'Gain', 6, 0],
    [2, '2nd & short', 'Own 20-40', '11', 'Gun Trips', 'None', 'Quick Hitch', 'Gain', 5, 0],
    [3, '1st & 10', 'Midfield', '11', 'Gun Spread', 'None', 'Inside Zone', 'Gain', 3, 0],
    [4, '2nd & long', 'Midfield', '10', 'Gun Empty', 'None', 'Sprint Out', 'Incomplete', 0, 1],
    [5, '3rd & med', 'Midfield', '10', 'Gun Empty', 'None', 'Quick Hitch', 'Gain', 9, 0],
    [6, '1st & 10', 'Opp 40-20', '11', 'Gun Trips', 'Jet', 'Power', 'Gain', 8, 0],
    [7, '2nd & short', 'Opp 40-20', '12', 'Pistol Ace', 'Shift', 'Counter', 'Gain', 4, 0],
    [8, '1st & 10', 'Red zone', '12', 'Pistol Ace', 'None', 'Inside Zone', 'Gain', 2, 0],
    [9, '2nd & long', 'Red zone', '11', 'Gun Spread', 'Orbit', 'PA Post', 'TD', 18, 1],
    [10, '1st & 10', 'Own 20-40', '11', 'Gun Trips', 'Jet', 'Outside Zone', 'Explosive', 22, 1],
    [11, '1st & 10', 'Opp 40-20', '11', 'Gun Spread', 'None', 'RPO Glance', 'Gain', 7, 0],
    [12, '2nd & short', 'Opp 40-20', '11', 'Gun Trips', 'Jet', 'Inside Zone', 'Gain', 3, 0],
    [13, '3rd & long', 'Opp 40-20', '10', 'Gun Empty', 'None', 'Sprint Out', 'Gain', 12, 1],
    [14, '1st & 10', 'Own 10', '12', 'Under Center', 'None', 'Inside Zone', 'Gain', 4, 0],
    [15, '2nd & long', 'Own 10', '11', 'Gun Spread', 'None', 'Screen', 'Loss', -2, 0],
    [16, '3rd & med', 'Own 20-40', '10', 'Gun Empty', 'None', 'Quick Hitch', 'Gain', 11, 0],
    [17, '1st & 10', 'Midfield', '11', 'Gun Trips', 'Jet', 'Power', 'Gain', 5, 0],
    [18, '2nd & short', 'Midfield', '11', 'Gun Trips', 'Tap', 'Outside Zone', 'Gain', 6, 0],
    [19, '3rd & short', 'Opp 40-20', '21', 'Wing-T', 'Shift', 'Counter', 'Gain', 2, 0],
    [20, '1st & 10', 'Red zone', '12', 'Pistol Ace', 'None', 'Power', 'Gain', 3, 1],
    [21, '2nd & short', 'Red zone', '22', 'Wing-T', 'None', 'Counter', 'TD', 6, 0],
    [22, '3rd & long', 'Midfield', '10', 'Gun Empty', 'None', 'Draw', 'Loss', -1, 0],
    [23, '1st & 10', 'Own 20-40', '11', 'Gun Spread', 'None', 'RPO Glance', 'Gain', 9, 0],
    [24, '3rd & med', 'Red zone', '11', 'Gun Spread', 'Orbit', 'PA Post', 'Incomplete', 0, 1],
  ] as const).map(toPlay),
  def: ([
    [1, '1st & 10', 'Own 20-40', '4-2-5', 'Cover 3', 'Static', 'None', 'Gain', 5, 0],
    [2, '2nd & short', 'Own 20-40', 'Bear', 'Cover 1', 'Walk-up', 'Edge', 'Loss', -1, 1],
    [3, '3rd & med', 'Own 20-40', '4-2-5', 'Cover 2', 'Late rotate', 'Sim', 'Incomplete', 0, 0],
    [4, '1st & 10', 'Midfield', '4-2-5', 'Quarters', 'Static', 'None', 'Gain', 4, 0],
    [5, '2nd & long', 'Midfield', '4-2-5', 'Cover 3', 'Late rotate', 'Fire zone', 'Gain', 3, 0],
    [6, '3rd & long', 'Midfield', 'Bandit', '2-Man', 'Sugar', 'A-gap', 'Sack', -7, 1],
    [7, '1st & 10', 'Opp 40-20', 'Tite', 'Quarters', 'Static', 'None', 'Gain', 2, 0],
    [8, '2nd & short', 'Opp 40-20', 'Bear', 'Cover 1', 'Walk-up', 'Edge', 'Gain', 3, 0],
    [9, '3rd & short', 'Opp 40-20', 'Bear', 'Cover 0', 'Sugar', 'A-gap', 'Incomplete', 0, 1],
    [10, '1st & 10', 'Red zone', 'Tite', 'Cover 1', 'Creep', 'None', 'Gain', 1, 0],
    [11, '2nd & long', 'Red zone', '4-2-5', 'Cover 3', 'Static', 'Corner', 'Explosive', 19, 1],
    [12, '3rd & med', 'Red zone', 'Bandit', 'Cover 0', 'Sugar', 'Safety', 'TD', 14, 1],
    [13, '1st & 10', 'Own 10', '4-2-5', 'Cover 3', 'Static', 'None', 'Gain', 6, 0],
    [14, '3rd & long', 'Own 10', 'Bandit', '2-Man', 'Sugar', 'Sim', 'Sack', -5, 0],
    [15, '2nd & short', 'Midfield', 'Bear', 'Cover 1', 'Walk-up', 'Edge', 'Gain', 2, 0],
    [16, '3rd & med', 'Opp 40-20', '4-2-5', 'Cover 2', 'Late rotate', 'Fire zone', 'Gain', 8, 0],
  ] as const).map(toPlay),
}

const RUN_CALLS = ['Inside Zone', 'Outside Zone', 'Power', 'Counter', 'Draw']
/** "A" is the warm split of each bar: run (offense) or pressure (defense). */
export const isA = (mode: Mode, play: Play): boolean => mode === 'off' ? RUN_CALLS.includes(play.call) : play.call !== 'None'
export const SPLIT_LABELS: Record<Mode, readonly [string, string]> = { off: ['Run', 'Pass'], def: ['Pressure', 'Base'] }

export const HEAD_LABELS: Record<Mode, readonly string[]> = {
  off: ['#', '★', 'Dn & Dist', 'Zone', 'Pers', 'Formation', 'Concept', 'Result'],
  def: ['#', '★', 'Dn & Dist', 'Zone', 'Front', 'Coverage', 'Pressure', 'Result'],
}

export interface Tell { readonly tag: string; readonly stat: string; readonly text: string; readonly answer: string }
export const TELLS: Record<Mode, readonly Tell[]> = {
  off: [
    { tag: 'Motion', stat: '9 of 10', text: 'Jet motion has been a run to the motion side on all but one snap.', answer: 'Fit it in walk-through: force player squeezes, alley player triggers.' },
    { tag: 'Personnel', stat: '6 of 6', text: '12 personnel in the red zone has produced a gap-scheme run — Power or Counter.', answer: 'Scout team needs a Pistol Ace card with a pulling guard.' },
    { tag: 'Situation', stat: '4 of 5', text: '3rd & 7+ from Empty is Sprint Out to the field.', answer: 'Rush plan: contain to the field, spot-drop the boundary hook.' },
    { tag: 'Explosives', stat: '2 of 2', text: 'Both explosives came from Trips with motion on 1st down.', answer: 'First-down alignment discipline is the correction of the week.' },
  ],
  def: [
    { tag: 'Pressure', stat: '5 of 5', text: 'Sugar look on 3rd & long has meant A-gap or a sim — never base.', answer: 'Carry the check: slide protection away, back on the mug.' },
    { tag: 'Coverage', stat: '4 of 4', text: 'Walk-up safety on 2nd & short is Cover 1 with a boundary edge blitz.', answer: 'Tag the quick out to the walk-up side.' },
    { tag: 'Red zone', stat: '3 of 4', text: 'Inside the 20 they go single-high or zero and dare you to throw it.', answer: 'Red-zone period: rep the fade and the pick concept.' },
    { tag: 'Front', stat: '5 of 5', text: 'Bear front shows only with a tight end attached.', answer: 'Base run plan needs an answer for a 0-technique nose.' },
  ],
}

export interface Player {
  readonly no: string; readonly pos: string; readonly meta: string; readonly grade: 'A' | 'B' | 'C'
  readonly traits: readonly string[]; readonly note: string; readonly tell: string; readonly assign: string; readonly clips: string
}
export interface PlayerGroup { readonly abbr: string; readonly name: string; readonly summary: string; readonly players: readonly Player[] }
export const PLAYERS: Record<Mode, readonly PlayerGroup[]> = {
  off: [
    { abbr: 'QB', name: 'Quarterback', summary: 'One real thrower, one wildcat package.', players: [
      { no: '7', pos: 'QB — Deshawn Pryor', meta: 'Jr · 6\'1" · 185 · 214 snaps', grade: 'A', traits: ['Live arm', 'Runs when flushed', 'Left-hash thrower'], note: 'Sets the whole offense. Comfortable throwing on the move to his right; resets his feet late when he has to come back to the left.', tell: 'Locks the glance read on 1st down — 8 of 11 RPOs went to the slot.', assign: 'NB has the glance, FS caps it', clips: '11 clips' },
      { no: '22', pos: 'QB — wildcat package', meta: 'Sr · RB body · 9 snaps', grade: 'C', traits: ['Short yardage only', 'Never throws'], note: 'Direct snap in short yardage and goal line. Nine snaps, nine runs.', tell: 'Enters only on 3rd/4th & 2 or less.', assign: 'Front spills, LBs fill downhill', clips: '4 clips' },
    ] },
    { abbr: 'RB', name: 'Backs', summary: 'Clear starter, change-of-pace on 3rd down.', players: [
      { no: '4', pos: 'RB — Marcus Vale', meta: 'Sr · 5\'10" · 195 · 168 snaps', grade: 'A', traits: ['One-cut', 'Patient', 'Breaks arm tackles'], note: 'Every explosive run on the tape is his. Presses the front side of zone, cuts back hard when the backside end chases.', tell: 'Aligns two yards deeper on true run downs.', assign: 'Backside end stays home', clips: '18 clips' },
      { no: '25', pos: 'RB — Ty Okafor', meta: 'So · 5\'8" · 175 · 41 snaps', grade: 'B', traits: ['Screen back', 'Good hands'], note: 'Comes in on 3rd down. Almost always a route or a screen — three carries across four games of tape.', tell: 'His entry has meant pass on 12 of 14 snaps.', assign: 'Mike matches the check-down', clips: '7 clips' },
    ] },
    { abbr: 'WR', name: 'Receivers & tight ends', summary: 'Everything funnels through 11; the TE is the red-zone answer.', players: [
      { no: '11', pos: 'WR — Jalen Ruiz', meta: 'Sr · 6\'0" · 180 · 201 snaps', grade: 'A', traits: ['Jet man', 'Vertical speed', 'Weak run blocker'], note: 'The jet motion player and the deep threat. When he motions and does not get the ball, the run is going to his side.', tell: 'Aligns outside on every explosive pass — never in the slot for the post.', assign: 'CB1 travels, no free release', clips: '24 clips' },
      { no: '84', pos: 'TE — Cole Braddock', meta: 'Jr · 6\'3" · 215 · 122 snaps', grade: 'B', traits: ['Attached blocker', 'Red-zone target'], note: 'His alignment declares the strength. Attached on all heavy looks; flexes only in the red zone.', tell: 'Flexed alignment inside the 20 has been a pass 6 of 7 times.', assign: 'Sam walls him, safety over the top', clips: '13 clips' },
      { no: '3', pos: 'WR — Ely Marsh', meta: 'So · 5\'11" · 170 · 96 snaps', grade: 'C', traits: ['Hitch and go', 'Blocks well'], note: 'Complementary. Runs the same three routes: hitch, out, and the occasional go off the hitch look.', tell: 'Only runs vertical after two hitches in the same series.', assign: 'CB2 squats, no cushion', clips: '6 clips' },
    ] },
    { abbr: 'OL', name: 'Offensive line', summary: 'Right side is the weak point on gap scheme.', players: [
      { no: '72', pos: 'LT — Sam Iverson', meta: 'Sr · 6\'4" · 275 · 214 snaps', grade: 'A', traits: ['Anchors well', 'Slow to climb'], note: 'Best lineman on the tape. Struggles reaching the second level on outside zone away from him.', tell: 'His pull declares Counter — he pulls on every one.', assign: 'Do not attack head-up, work his edge', clips: '9 clips' },
      { no: '66', pos: 'RG — Deon Hall', meta: 'Jr · 6\'0" · 250 · 214 snaps', grade: 'C', traits: ['Pulls on Power', 'Late hands'], note: 'The pull key. High pad level and late hands in protection — both sacks came over him.', tell: 'Sets deeper pre-snap on pass.', assign: 'A-gap pressure targets him', clips: '12 clips' },
    ] },
  ],
  def: [
    { abbr: 'DL', name: 'Defensive line', summary: 'One disruptor, and a nose who can be moved.', players: [
      { no: '55', pos: 'DE — Andre Coles', meta: 'Sr · 6\'2" · 230 · 198 snaps', grade: 'A', traits: ['Speed rush', 'Chases zone', 'Wide alignment'], note: 'Their best player. Rushes upfield hard and gets washed on outside zone away from him — that is our run answer.', tell: 'Widens his alignment when he is coming on the edge blitz.', assign: 'Chip with the back on 3rd down', clips: '21 clips' },
      { no: '90', pos: 'NT — Bo Reddick', meta: 'Jr · 6\'0" · 290 · 141 snaps', grade: 'B', traits: ['0-technique', 'Two-gap', 'Tires late'], note: 'Only shows in Bear front. Holds up early, gives ground by the fourth quarter.', tell: 'His presence means Bear front — 5 of 5.', assign: 'Double him with center and guard', clips: '10 clips' },
      { no: '44', pos: 'DE — Trey Nolan', meta: 'So · 6\'1" · 215 · 88 snaps', grade: 'C', traits: ['Rotational', 'Bull rush only'], note: 'Rotational rusher with one move. Vulnerable to a quick set.', tell: 'Comes in for Coles on early downs only.', assign: 'RT one-on-one, no help needed', clips: '5 clips' },
    ] },
    { abbr: 'LB', name: 'Linebackers', summary: 'The mug look is where the pressure comes from.', players: [
      { no: '32', pos: 'MLB — Kade Whitmer', meta: 'Sr · 6\'0" · 210 · 201 snaps', grade: 'A', traits: ['Green dot', 'Fast trigger', 'Guessable'], note: 'Makes the calls and triggers downhill on any run key. Over-pursues play action.', tell: 'When he mugs the A-gap on 3rd & long he comes 5 of 5.', assign: 'Center IDs him, slide away', clips: '19 clips' },
      { no: '9', pos: 'WLB — Rome Alston', meta: 'Jr · 5\'11" · 200 · 174 snaps', grade: 'B', traits: ['Covers the back', 'Late hook drop'], note: 'Carries the back in man. Slow to the hook on late-rotate Cover 3 — the window behind him is open.', tell: 'Sugars with Whitmer but usually drops.', assign: 'Sit the dig behind him', clips: '11 clips' },
    ] },
    { abbr: 'DB', name: 'Secondary', summary: 'One corner to avoid, one to attack, one aggressive safety.', players: [
      { no: '1', pos: 'CB — Xavier Poole', meta: 'Sr · 6\'0" · 180 · 204 snaps', grade: 'A', traits: ['Travels', 'Press man', 'No help needed'], note: 'Their best defender in coverage. Presses at the line and stays on top.', tell: 'Never plays the boundary in Cover 0 — always the field.', assign: 'Do not throw his way in man', clips: '15 clips' },
      { no: '24', pos: 'CB — Micah Lund', meta: 'So · 5\'9" · 165 · 152 snaps', grade: 'C', traits: ['Grabby', 'Loses the fade'], note: 'The soft spot. Turns his hips late and gets handsy at the top of the route.', tell: 'Both explosives against them came on his side.', assign: 'Attack him with the fade and the out', clips: '9 clips' },
      { no: '18', pos: 'SS — Bryce Nailor', meta: 'Sr · 6\'1" · 195 · 199 snaps', grade: 'B', traits: ['Walks up', 'Blitzes', 'Bites on run'], note: 'Aggressive downhill player. His walk-up alignment declares the coverage before the snap.', tell: 'Walk-up on 2nd & short is Cover 1 with an edge blitz — 4 of 4.', assign: 'Play-action him, throw behind', clips: '14 clips' },
    ] },
  ],
}

export interface Card { readonly title: string; readonly meta: string; readonly notes: ReadonlyArray<readonly [string, string]>; readonly players: keyof typeof FORMS }
export const CARDS: Record<Mode, readonly Card[]> = {
  off: [
    { title: 'Gun Trips — Jet Outside Zone', meta: '11 pers · field hash', notes: [['Key', 'Motion man to the trips side, ball to motion'], ['Look for', 'Backside guard climbs to the LB'], ['Rep it', 'Team run, both hashes']], players: 'trips' },
    { title: 'Pistol Ace — Counter', meta: '12 pers · red zone', notes: [['Key', 'Guard and tight end pull'], ['Look for', 'Back cuts off the second puller'], ['Rep it', 'Red-zone period']], players: 'ace' },
    { title: 'Gun Empty — Sprint Out', meta: '10 pers · 3rd & 7+', notes: [['Key', 'QB moves to the field on the snap'], ['Look for', 'Two-man flood, back-shoulder throw'], ['Rep it', '3rd-down period']], players: 'empty' },
    { title: 'Gun Spread — RPO Glance', meta: '11 pers · 1st down', notes: [['Key', 'Read is the overhang to the slot side'], ['Look for', 'Glance behind the LB drop'], ['Rep it', 'Pass skel']], players: 'spread' },
    { title: 'Wing-T — Counter', meta: '21/22 pers · short yardage', notes: [['Key', 'Double team plus wing kick'], ['Look for', 'Nothing pretty, four hard yards'], ['Rep it', 'Short-yardage period']], players: 'wing' },
    { title: 'Gun Trips — PA Post', meta: '11 pers · after a run drive', notes: [['Key', 'Same jet action as the run'], ['Look for', 'Post behind the single-high safety'], ['Rep it', 'Team period, script it once']], players: 'trips' },
  ],
  def: [
    { title: 'Bandit — Sugar A-gap', meta: '3rd & long', notes: [['Key', 'Both LBs mugged over the guards'], ['Look for', 'One drops, one comes'], ['Rep it', '3rd-down protection period']], players: 'empty' },
    { title: 'Bear — Cover 1 Edge', meta: '2nd & short', notes: [['Key', 'Walk-up safety to the boundary'], ['Look for', 'Man across, no help'], ['Rep it', 'Team run + quick game']], players: 'ace' },
    { title: '4-2-5 — Late rotate Cover 3', meta: '1st & 10', notes: [['Key', 'Two-high shows, rotates at the snap'], ['Look for', 'Field safety spinning down'], ['Rep it', 'Pass skel, first-down calls']], players: 'spread' },
    { title: 'Tite — Quarters', meta: 'Opp 40 to red zone', notes: [['Key', '4i-0-4i, no inside run lane'], ['Look for', 'Outside-zone and perimeter answers'], ['Rep it', 'Team run']], players: 'trips' },
    { title: 'Bandit — 2-Man Sim', meta: '3rd & long, backed up', notes: [['Key', 'Four rush, two drop from the front'], ['Look for', 'Free defender on the back side'], ['Rep it', 'Protection walk-through']], players: 'empty' },
    { title: 'Bear — Cover 0', meta: 'Short yardage / goal line', notes: [['Key', 'Everybody covered, everybody rushed'], ['Look for', 'One-on-one on the outside'], ['Rep it', 'Goal-line period']], players: 'wing' },
  ],
}

/** [x%, y%, 's' square | 'c' circle] */
export const FORMS = {
  trips: [[16, 62, 's'], [26, 62, 's'], [36, 62, 's'], [46, 62, 's'], [56, 62, 's'], [68, 46, 'c'], [78, 46, 'c'], [88, 46, 'c'], [36, 82, 'c'], [26, 40, 'c']],
  ace: [[30, 62, 's'], [38, 62, 's'], [46, 62, 's'], [54, 62, 's'], [62, 62, 's'], [70, 62, 's'], [46, 78, 'c'], [46, 90, 'c'], [16, 48, 'c'], [84, 48, 'c']],
  empty: [[30, 62, 's'], [38, 62, 's'], [46, 62, 's'], [54, 62, 's'], [62, 62, 's'], [46, 80, 'c'], [12, 46, 'c'], [22, 40, 'c'], [76, 46, 'c'], [88, 40, 'c']],
  spread: [[30, 62, 's'], [38, 62, 's'], [46, 62, 's'], [54, 62, 's'], [62, 62, 's'], [46, 80, 'c'], [58, 84, 'c'], [14, 46, 'c'], [26, 40, 'c'], [84, 46, 'c']],
  wing: [[30, 62, 's'], [38, 62, 's'], [46, 62, 's'], [54, 62, 's'], [62, 62, 's'], [70, 54, 'c'], [46, 76, 'c'], [34, 86, 'c'], [58, 86, 'c'], [22, 50, 'c']],
} as const satisfies Record<string, ReadonlyArray<readonly [number, number, 's' | 'c']>>

export interface Report { readonly name: string; readonly who: string; readonly on: boolean; readonly status: 'Ready' | 'Needs review' | 'Draft' | 'Not started' }
export const REPORTS: readonly Report[] = [
  { name: 'Tendency sheet', who: 'Head coach · Monday', on: true, status: 'Ready' },
  { name: 'Situational call sheet', who: 'Coordinators · Tuesday', on: true, status: 'Ready' },
  { name: 'Position report cards', who: 'Position coaches · Tuesday', on: true, status: 'Needs review' },
  { name: 'Scout-team card packet', who: 'Scout coach · Wednesday', on: true, status: 'Draft' },
  { name: 'One-page game plan', who: 'Full staff · Thursday', on: false, status: 'Not started' },
  { name: 'Film clip playlist', who: 'Players · Wednesday', on: false, status: 'Not started' },
]

export const CORRECTIONS: Record<Mode, ReadonlyArray<{ who: string; what: string; src: string }>> = {
  off: [
    { who: 'OLB', what: 'Squeeze the motion man instead of chasing — cost us the 22-yard explosive.', src: 'Snap 10 · Trips Jet' },
    { who: 'FS', what: 'Late trigger on 12 personnel in the red zone.', src: 'Snap 20 · Pistol Ace' },
    { who: 'DE', what: 'Contain on sprint out to the field, no upfield chase.', src: 'Snap 13 · Empty' },
    { who: 'NB', what: 'Match the glance route behind the LB drop.', src: 'Snap 11 · Spread RPO' },
  ],
  def: [
    { who: 'RB', what: 'Set to the mugged LB on 3rd & long — do not scan away.', src: 'Snap 6 · Bandit Sugar' },
    { who: 'LT', what: 'Two-way go against the 4i on Tite front.', src: 'Snap 7 · Tite' },
    { who: 'QB', what: 'Alert the quick out when the safety walks up.', src: 'Snap 8 · Bear Cover 1' },
    { who: 'WR', what: 'Win outside vs Cover 0 in the red zone.', src: 'Snap 12 · Bandit zero' },
  ],
}

/** Formation (or coverage) frequency, most charted first. */
export function categoryRows(plays: readonly Play[]): ReadonlyArray<{ name: string; count: number; pct: number; avg: string; width: number }> {
  const counts = new Map<string, { n: number; y: number }>()
  for (const play of plays) {
    const entry = counts.get(play.form) ?? { n: 0, y: 0 }
    counts.set(play.form, { n: entry.n + 1, y: entry.y + play.gain })
  }
  const max = Math.max(1, ...[...counts.values()].map((entry) => entry.n))
  return [...counts].sort((a, b) => b[1].n - a[1].n).map(([name, { n, y }]) => ({
    name, count: n, pct: Math.round((n / plays.length) * 100), avg: `${(y / n).toFixed(1)} yds`, width: Math.round((n / max) * 100),
  }))
}
