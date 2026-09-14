import assert from 'node:assert/strict'
import test from 'node:test'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { CORE_FIELDS } from '../../../convex/domain/coreFields.ts'
import type { PlayLogColumn } from './columns'
import { carryForwardDraft, groupKind, hasAnyValue, toCreateArgs } from './palette-model.ts'

test('palette groups, normalizes, and carries only configured values', () => {
  const core: Extract<PlayLogColumn, { kind: 'core' }>[] = CORE_FIELDS.map((field) => ({ key: `core:${field.key}`, kind: 'core', label: field.label, field }))
  const field: Doc<'templateFields'> = {
    _id: 'grade' as Id<'templateFields'>, _creationTime: 0,
    templateId: 'template' as Id<'templates'>, sectionId: 'section' as Id<'templateSections'>,
    name: 'Grade', type: 'rating', options: ['A', 'B'], required: false, carryForward: true, order: 0,
  }
  const template: PlayLogColumn = { key: 'field:grade', kind: 'template', label: 'Grade', field }
  const columns = [...core, template]
  for (const column of core) {
    const group = groupKind(column, [{ list: 'formations', value: 'AAA' }, { list: 'formations', value: 'Shotgun' }])
    if (column.field.key === 'formation') {
      assert.equal(group.kind, 'tags')
      if (group.kind === 'tags') {
        assert.equal(group.tags[0], 'AAA')
        assert.equal(group.tags.filter((tag) => tag === 'Shotgun').length, 1)
      }
    } else if (column.field.key === 'down' || column.field.key === 'quarter') {
      assert.deepEqual(group, { kind: 'tags', tags: ['1', '2', '3', '4'], multi: false })
    } else assert.equal(group.kind, column.field.input.kind === 'select' || column.field.input.kind === 'terminology' ? 'tags' : 'input')
  }
  for (const type of ['shortText', 'longText', 'number', 'checkbox', 'select', 'multiSelect', 'rating', 'tags'] as const) {
    const group = groupKind({ ...template, field: { ...field, type } }, [])
    assert.equal(group.kind, ['checkbox', 'select', 'multiSelect', 'rating'].includes(type) ? 'tags' : 'input')
    if (group.kind === 'tags') {
      assert.equal(group.multi, type === 'multiSelect')
      assert.deepEqual(group.tags, type === 'checkbox' ? ['Yes', 'No'] : type === 'rating' ? ['1', '2', '3', '4', '5'] : field.options)
    }
  }
  const saved = toCreateArgs({ 'core:quarter': '9', 'core:yards': 0, 'core:formation': ' Shotgun ', 'core:clock': ' ', 'core:yardLine': { side: 'opp', yard: 22 }, 'field:grade': 4 }, columns)
  assert.deepEqual(saved, { core: { quarter: 9, yards: 0, formation: 'Shotgun', yardLine: { side: 'opp', yard: 22 } }, analysis: { grade: 4 } })
  assert.deepEqual(carryForwardDraft({ core: { formation: 'Shotgun', down: 2 }, analysis: { grade: 4 } }, columns), { 'core:formation': 'Shotgun', 'field:grade': 4 })
  assert.deepEqual(carryForwardDraft({ core: {}, analysis: { grade: 4 } }, [...core, { ...template, field: { ...field, carryForward: false } }]), {})
  assert.deepEqual(toCreateArgs({ 'field:grade': [] }, [{ ...template, field: { ...field, type: 'tags' } }]), { core: {}, analysis: {} })
  assert.throws(() => toCreateArgs({ 'core:down': 5 }, columns), { message: 'Down must be a whole number between 1 and 4' })
  assert.throws(() => toCreateArgs({ 'field:grade': '4' }, columns), { message: 'Invalid Rating / Grade value' })
  assert.equal(hasAnyValue({ 'core:clock': ' ', 'field:grade': [], 'core:yardLine': { side: 'own', yard: 0 } }), false)
  for (const value of [0, false, ['A'], 'X', { side: 'mid', yard: 50 }]) assert.equal(hasAnyValue({ 'field:grade': value }), true)
  assert.deepEqual(toCreateArgs({}, columns), { core: {}, analysis: {} })
})
