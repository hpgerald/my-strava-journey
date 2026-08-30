import test from 'node:test'
import assert from 'node:assert/strict'
import { num } from '../src/lib/csv.js'

test('num parses valid numeric values and rejects missing or invalid values', () => {
  assert.equal(num('1,234.5'), 1234.5)
  assert.equal(num(''), null)
  assert.equal(num('not a number'), null)
})
