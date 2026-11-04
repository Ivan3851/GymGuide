import assert from 'node:assert/strict'
import test from 'node:test'
import { selectPrimaryMuscle } from './exercise-muscle-selection.js'

test('changing primary removes it from secondary selections and deduplicates values', () => {
  assert.deepEqual(selectPrimaryMuscle('chest', ['chest', 'back', 'back']), {
    primaryIds: ['chest'],
    secondaryIds: ['back'],
  })
})

test('clearing primary preserves only unique secondary groups', () => {
  assert.deepEqual(selectPrimaryMuscle('', ['back', 'back']), {
    primaryIds: [],
    secondaryIds: ['back'],
  })
})
