const assert = require('node:assert/strict')
const test = require('node:test')
const { exerciseIdsForPrimaryDescendants } = require('../api/services/PrimaryMuscleFilter')

test('equipment browsing includes exercises whose primary muscle is a selected group or descendant once', () => {
  const result = exerciseIdsForPrimaryDescendants(
    ['press', 'fly', 'row', 'press'],
    [
      { exerciseId: 'press', muscleGroupId: 'upper-chest', role: 'primary' },
      { exerciseId: 'press', muscleGroupId: 'triceps', role: 'secondary' },
      { exerciseId: 'fly', muscleGroupId: 'chest', role: 'primary' },
      { exerciseId: 'row', muscleGroupId: 'back', role: 'primary' },
    ],
    new Set(['chest', 'upper-chest']),
  )
  assert.deepEqual(result, ['press', 'fly'])
})
