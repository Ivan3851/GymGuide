import assert from 'node:assert/strict'
import test from 'node:test'
import { isBackendRecovery } from './api-health-state.js'

test('initial successful API check is not treated as backend recovery', () => {
  assert.equal(isBackendRecovery(undefined, true, false), false)
})

test('API health changing from unavailable to available triggers recovery', () => {
  assert.equal(isBackendRecovery(false, true, true), true)
})

test('continued failure or continued availability does not trigger recovery', () => {
  assert.equal(isBackendRecovery(false, false, true), false)
  assert.equal(isBackendRecovery(true, true, true), false)
})
