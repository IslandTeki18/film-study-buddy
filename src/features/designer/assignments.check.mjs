// Run: node src/features/designer/assignments.check.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('./play-designer.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('play-designer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = new Set(['setPlayers', 'patch', 'strip', 'setHideOther', 'stamp'])
const functions = []
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(ast))
  ts.forEachChild(node, visit)
}
visit(ast)
assert.equal(functions.length, names.size)
const code = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const stampMan = new Function('draftRef', 'selected', 'setDraft', 'setPicking', 'otherSide', 'toPx', `${code}\nreturn () => stamp('Man')`)
for (const hiddenSide of [undefined, 'offense']) {
  const defender = { id: 'D', side: 'defense', x: 0.5, y: 0.4, job: 'Zone', zone: { x: 0.5, y: 0.2, rx: 0.1, ry: 0.1 }, route: [0.5, 0.3], coversId: 'O' }
  const draft = { players: [defender, { id: 'O', side: 'offense', x: 0.5, y: 0.6 }], shapes: [], note: 'Keep this', ...(hiddenSide ? { hiddenSide } : {}) }
  let saved
  let picking
  stampMan({ current: draft }, defender, (next) => { saved = next }, (id) => { picking = id }, 'offense', (player) => player)()
  assert.equal(saved.players[0].job, 'Man')
  for (const key of ['route', 'zone', 'coversId']) assert.equal(saved.players[0][key], undefined)
  assert.equal(saved.hiddenSide, undefined)
  assert.equal(saved.note, 'Keep this')
  assert.deepEqual(saved.players[1], draft.players[1])
  assert.equal(picking, 'D')
  assert.equal(defender.job, 'Zone')
}
console.log('PASS: choosing Man clears prior assignments and reveals offense in the same draft update')
