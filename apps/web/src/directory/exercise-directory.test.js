import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExerciseDirectoryGroups, descendantIds } from './exercise-directory.js'

const groups = [
  { id: 'chest', sortOrder: 1 },
  { id: 'upper-chest', parentId: 'chest', sortOrder: 2 },
  { id: 'back', sortOrder: 3 },
]
const exercises = [
  { id: 'press', primaryMuscleGroup: { id: 'chest' }, primaryGroupRootId: 'chest' },
  {
    id: 'incline-press',
    primaryMuscleGroup: { id: 'upper-chest' },
    primaryGroupRootId: 'chest',
  },
  { id: 'row', primaryMuscleGroup: { id: 'back' }, primaryGroupRootId: 'back' },
  { id: 'legacy', primaryMuscleGroup: null, primaryGroupRootId: null },
]
const directoryData = {
  muscleGroups: groups,
  topLevelMuscleGroups: [groups[0], groups[2]],
  exercises,
}

test('All groups include every exercise and group child-primary exercises under their root', () => {
  const result = buildExerciseDirectoryGroups(directoryData)
  assert.deepEqual(
    result.map(({ muscleGroup, exercises: entries }) => [
      muscleGroup?.id || 'unassigned',
      entries.map((entry) => entry.id),
    ]),
    [
      ['chest', ['press', 'incline-press']],
      ['back', ['row']],
      ['unassigned', ['legacy']],
    ],
  )
})

test('filtering by a parent includes direct and descendant primary targets only', () => {
  const result = buildExerciseDirectoryGroups(directoryData, 'chest')
  assert.deepEqual(
    result.flatMap((group) => group.exercises.map((entry) => entry.id)),
    ['press', 'incline-press'],
  )
})

test('secondary muscle data cannot affect grouping or the parent filter', () => {
  const withSecondary = {
    ...directoryData,
    exercises: [
      { ...exercises[2], secondaryMuscleGroupIds: ['chest'] },
      { ...exercises[0], secondaryMuscleGroupIds: ['back'] },
    ],
  }
  assert.deepEqual(
    buildExerciseDirectoryGroups(withSecondary, 'chest').flatMap((group) =>
      group.exercises.map((entry) => entry.id),
    ),
    ['press'],
  )
})

test('parent descendant filtering supports nested groups', () => {
  const nested = [...groups, { id: 'inner-upper-chest', parentId: 'upper-chest' }]
  assert.deepEqual(
    [...descendantIds(nested, 'chest')],
    ['chest', 'upper-chest', 'inner-upper-chest'],
  )
})
