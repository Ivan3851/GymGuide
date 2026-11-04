const assert = require('node:assert/strict')
const test = require('node:test')
const CatalogService = require('../api/services/CatalogService')

function matches(record, filter) {
  return Object.entries(filter || {}).every(([key, expected]) => {
    if (key === '$or') return expected.some((condition) => matches(record, condition))
    const actual = record[key]
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$in' in expected) return expected.$in.includes(actual)
      if ('$ne' in expected) return actual !== expected.$ne
      if ('$exists' in expected) return key in record === expected.$exists
    }
    return actual === expected
  })
}

function makeSails(collections) {
  const db = {
    collection(name) {
      const records = collections[name] || []
      return {
        findOne: async (filter) => records.find((record) => matches(record, filter)) || null,
        find(filter) {
          let result = records.filter((record) => matches(record, filter))
          const cursor = {
            sort(sortSpec) {
              const entries = Object.entries(sortSpec)
              result = [...result].sort((a, b) => {
                for (const [key, direction] of entries) {
                  const compare = String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
                  if (compare) return compare * direction
                }
                return 0
              })
              return cursor
            },
            toArray: async () => result,
          }
          return cursor
        },
      }
    },
  }
  return {
    hooks: { orm: { datastores: { default: { manager: { client: { db: () => db } } } } } },
  }
}

const groups = [
  { _id: 'chest', name: 'Chest', isActive: true, sortOrder: 1 },
  { _id: 'upper-chest', name: 'Upper chest', parentId: 'chest', isActive: true, sortOrder: 2 },
  { _id: 'back', name: 'Back', isActive: true, sortOrder: 3 },
  { _id: 'old-demo', name: 'Demo', isActive: true, isDemo: true, sortOrder: 4 },
]

function fixture() {
  return makeSails({
    muscleGroups: groups,
    exercises: [
      { _id: 'press', name: 'Press', isActive: true, sortOrder: 1 },
      { _id: 'incline', name: 'Incline press', isActive: true, sortOrder: 2 },
      { _id: 'row', name: 'Row', isActive: true, sortOrder: 3 },
      { _id: 'sample', name: 'Sample', isActive: true, isDemo: true, sortOrder: 4 },
    ],
    exerciseMuscles: [
      { exerciseId: 'press', muscleGroupId: 'chest', role: 'primary' },
      { exerciseId: 'press', muscleGroupId: 'back', role: 'secondary' },
      { exerciseId: 'incline', muscleGroupId: 'upper-chest', role: 'primary' },
      { exerciseId: 'row', muscleGroupId: 'back', role: 'primary' },
      { exerciseId: 'sample', muscleGroupId: 'chest', role: 'primary' },
    ],
    exerciseEquipment: [
      { exerciseId: 'press', equipmentTypeId: 'press-type' },
      { exerciseId: 'incline', equipmentTypeId: 'press-type' },
      { exerciseId: 'row', equipmentTypeId: 'press-type' },
    ],
    equipmentTypes: [{ _id: 'press-type', name: 'Press machine', isActive: true }],
    gymEquipment: [
      {
        _id: 'press-machine',
        gymId: 'gym-1',
        equipmentTypeId: 'press-type',
        displayName: 'Press machine A',
        isAvailable: true,
        isActive: true,
      },
      {
        _id: 'press-machine-default-gym',
        gymId: 'demo-gym',
        equipmentTypeId: 'press-type',
        displayName: 'Press machine B',
        isAvailable: true,
        isActive: true,
      },
    ],
  })
}

function deepHierarchyFixture() {
  return makeSails({
    muscleGroups: [
      { _id: 'root', isActive: true, sortOrder: 0 },
      { _id: 'child', parentId: 'root', isActive: true, sortOrder: 0 },
      { _id: 'middle', parentId: 'child', isActive: true, sortOrder: 0 },
      { _id: 'leaf', parentId: 'middle', isActive: true, sortOrder: 0 },
      { _id: 'back', isActive: true, sortOrder: 1 },
    ],
    exercises: [
      { _id: 'root-exercise', isActive: true, sortOrder: 0 },
      { _id: 'child-exercise', isActive: true, sortOrder: 0 },
      { _id: 'middle-exercise', isActive: true, sortOrder: 0 },
      { _id: 'leaf-exercise', isActive: true, sortOrder: 0 },
      { _id: 'secondary-exercise', isActive: true, sortOrder: 0 },
    ],
    exerciseMuscles: [
      { exerciseId: 'root-exercise', muscleGroupId: 'root', role: 'primary' },
      { exerciseId: 'child-exercise', muscleGroupId: 'child', role: 'primary' },
      { exerciseId: 'middle-exercise', muscleGroupId: 'middle', role: 'primary' },
      { exerciseId: 'leaf-exercise', muscleGroupId: 'leaf', role: 'primary' },
      { exerciseId: 'secondary-exercise', muscleGroupId: 'back', role: 'primary' },
      { exerciseId: 'secondary-exercise', muscleGroupId: 'leaf', role: 'secondary' },
    ],
    exerciseEquipment: [
      { exerciseId: 'root-exercise', equipmentTypeId: 'root-machine' },
      { exerciseId: 'child-exercise', equipmentTypeId: 'child-machine' },
      { exerciseId: 'middle-exercise', equipmentTypeId: 'middle-machine' },
      { exerciseId: 'leaf-exercise', equipmentTypeId: 'leaf-machine' },
      { exerciseId: 'secondary-exercise', equipmentTypeId: 'leaf-machine' },
      { exerciseId: 'secondary-exercise', equipmentTypeId: 'secondary-only-machine' },
    ],
    equipmentTypes: ['root', 'child', 'middle', 'leaf', 'secondary-only'].map((id, index) => ({
      _id: `${id}-machine`,
      name: `${id} machine`,
      isActive: true,
      sortOrder: index,
    })),
    gymEquipment: ['root', 'child', 'middle', 'leaf', 'secondary-only'].map((id) => ({
      _id: `${id}-unit`,
      gymId: 'demo-gym',
      equipmentTypeId: `${id}-machine`,
      displayName: `${id} unit`,
      ...(id === 'root'
        ? {
            details: 'Legacy details',
            description: 'Legacy description',
            translations: { en: { displayName: 'Root unit', details: 'Translated details' } },
          }
        : {}),
      isAvailable: true,
      isActive: true,
    })),
  })
}

test('member home returns active top-level muscles only and keeps existing parentless groups', async () => {
  const result = await CatalogService.listMuscleGroups(fixture())
  assert.deepEqual(
    result.map((group) => group.id),
    ['chest', 'back'],
  )
})

test('directory attaches primary muscles, groups descendants under roots, and omits demo fixtures', async () => {
  const result = await CatalogService.getExerciseDirectory(fixture())
  assert.deepEqual(
    result.topLevelMuscleGroups.map((group) => group.id),
    ['chest', 'back'],
  )
  assert.deepEqual(
    result.exercises.map((exercise) => exercise.id),
    ['press', 'incline', 'row'],
  )
  assert.equal(result.exercises[1].primaryMuscleGroup.id, 'upper-chest')
  assert.equal(result.exercises[1].primaryGroupRootId, 'chest')
})

test('selecting a parent returns compatible equipment used by descendant exercises', async () => {
  const result = await CatalogService.getEquipmentForMuscleGroup(fixture(), 'chest', 'gym-1')
  assert.deepEqual(
    result.equipment.map((type) => type.id),
    ['press-type'],
  )
  assert.equal(result.equipment[0].gymEquipment[0].id, 'press-machine')
})

test('equipment browsing from a parent muscle includes descendant primary exercises only', async () => {
  const result = await CatalogService.getExercisesForEquipment(fixture(), 'press-type', 'chest')
  assert.deepEqual(
    result.exercises.map((exercise) => exercise.id),
    ['press', 'incline'],
  )
})

test('parent-child-grandchild browsing follows primary groups and strips legacy unit descriptions', async () => {
  const sails = deepHierarchyFixture()
  const equipment = await CatalogService.getEquipmentForMuscleGroup(sails, 'root', 'demo-gym')
  assert.deepEqual(
    equipment.equipment.map((type) => type.id),
    ['root-machine', 'child-machine', 'middle-machine', 'leaf-machine'],
  )
  assert.equal(new Set(equipment.equipment.map((type) => type.id)).size, 4)
  assert.deepEqual(
    (await CatalogService.getEquipmentForMuscleGroup(sails, 'child', 'demo-gym')).equipment.map(
      (type) => type.id,
    ),
    ['child-machine', 'middle-machine', 'leaf-machine'],
  )
  assert.deepEqual(
    (await CatalogService.getEquipmentForMuscleGroup(sails, 'middle', 'demo-gym')).equipment.map(
      (type) => type.id,
    ),
    ['middle-machine', 'leaf-machine'],
  )
  const rootUnit = equipment.equipment[0].gymEquipment[0]
  assert.equal(Object.hasOwn(rootUnit, 'details'), false)
  assert.equal(Object.hasOwn(rootUnit, 'description'), false)
  assert.equal(Object.hasOwn(rootUnit.translations.en, 'details'), false)

  const leafMachineExercises = await CatalogService.getExercisesForEquipment(
    sails,
    'leaf-machine',
    'root',
  )
  assert.deepEqual(
    leafMachineExercises.exercises.map((exercise) => exercise.id),
    ['leaf-exercise'],
  )
})
