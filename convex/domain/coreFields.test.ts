import assert from 'node:assert/strict'
import test from 'node:test'
import { CORE_FIELDS, ODK_VALUES } from './coreFields.ts'

test('registers ODK after Clock as a fixed select', () => {
  const clockIndex = CORE_FIELDS.findIndex(({ key }) => key === 'clock')
  const odk = CORE_FIELDS[clockIndex + 1]

  assert.equal(odk?.key, 'odk')
  assert.deepEqual(odk?.input, { kind: 'select', options: ODK_VALUES })
})
