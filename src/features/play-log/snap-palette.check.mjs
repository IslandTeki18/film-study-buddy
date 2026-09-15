// Run: node src/features/play-log/snap-palette.check.mjs
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const root = fileURLToPath(new URL('../../..', import.meta.url))
const server = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': `${root}/src`, '@convex': `${root}/convex` } }, esbuild: { jsx: 'automatic' } })
try {
  const { SnapPalette } = await server.ssrLoadModule('/src/features/play-log/snap-palette.tsx')
  const { FieldEditor } = await server.ssrLoadModule('/src/features/play-log/cell-editors.tsx')
  const { CORE_FIELDS } = await server.ssrLoadModule('/convex/domain/coreFields.ts')
  const noop = () => {}
  const render = (columns, draft = {}, saving = false) => renderToStaticMarkup(createElement(SnapPalette, {
    columns, draft, saving, terminology: [], nextSnapNumber: 7, mustReview: false,
    onDraftChange: noop, onMustReviewChange: noop, onSave: noop, onClear: noop,
    onAddTerminology: async () => {}, onAddFieldOption: async () => {},
  }))
  for (const field of CORE_FIELDS) {
    const markup = render([{ kind: 'core', key: `core:${field.key}`, label: field.label, field }])
    assert.ok(markup.includes(field.label))
    assert.match(markup, /Snap 07/)
    assert.match(markup, /disabled=""[^>]*>Save snap/)
    if (field.key === 'quarter') assert.match(markup, /max="9"/)
    if (field.key === 'yardLine') assert.match(markup, /aria-label="Yard Line side"/)
  }
  for (const [type, value, text] of [['checkbox', false, 'No'], ['number', 0, '0'], ['multiSelect', ['A'], 'A']]) {
    const column = { kind: 'template', key: 'field:test', label: 'Test', field: { _id: 'test', type, options: ['A', 'B'] } }
    const markup = render([column], { 'field:test': value })
    assert.ok(markup.includes(text))
    assert.match(markup, /1 of 1 fields/)
    assert.doesNotMatch(markup, /disabled=""[^>]*>Save snap/)
    assert.match(render([column], { 'field:test': value }, true), /disabled=""[^>]*>Save snap/)
  }
  assert.match(render([]), /0 of 0 fields/)
  const formation = CORE_FIELDS.find((field) => field.key === 'formation')
  const quarter = CORE_FIELDS.find((field) => field.key === 'quarter')
  const fieldEditor = (column, value) => renderToStaticMarkup(createElement(FieldEditor, {
    column: { kind: 'core', key: `core:${column.key}`, label: column.label, field: column }, value, terminology: [], onSave: async () => {},
  }))
  assert.match(fieldEditor(formation, '11'), /<option value="11" selected="">11<\/option>/)
  assert.match(fieldEditor(quarter, 9), /type="number"[^>]*max="9"/)
  const legacyMulti = { kind: 'template', key: 'field:legacy', label: 'Legacy', field: { _id: 'legacy', type: 'multiSelect', options: ['A'] } }
  assert.match(renderToStaticMarkup(createElement(FieldEditor, { column: legacyMulti, value: ['Retired'], terminology: [], onSave: async () => {} })), /<option value="Retired" selected="">Retired<\/option>/)
  console.log('SnapPalette SSR checks passed (all core controls, false/zero/multi values, saving and empty states).')
} finally { await server.close() }
