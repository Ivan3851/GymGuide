const assert = require('node:assert/strict')
const test = require('node:test')
const FloorPlanService = require('../api/services/FloorPlanService')
const { exerciseLocationPlanData, memberEquipmentFilter } = FloorPlanService

function marker(id, matchesExercise = false) {
  return { gymEquipment: { id, displayName: id }, x: 0.5, y: 0.5, matchesExercise }
}

test('filters relevant floors and highlights matching units across supported equipment types', () => {
  const units = [{ id: 'press-a' }, { id: 'press-b' }, { id: 'cable-unit' }]
  const plans = [
    { id: 'ground', markers: [marker('press-a'), marker('lat-pulldown')] },
    { id: 'upper', markers: [marker('press-b'), marker('cable-unit')] },
    { id: 'studio', markers: [marker('cable-station')] },
  ]

  const result = exerciseLocationPlanData(units, plans)
  assert.equal(result.hasMappedEquipment, true)
  assert.deepEqual(
    result.floorPlans.map((floor) => floor.id),
    ['ground', 'upper'],
  )
  assert.deepEqual(
    result.floorPlans[0].markers.map((item) => item.matchesExercise),
    [true, false],
  )
  assert.deepEqual(
    result.floorPlans[1].markers.map((item) => item.matchesExercise),
    [true, true],
  )
})

test('exercise map matches every physical instance and keeps unavailable active units eligible', () => {
  const units = [{ id: 'press-a' }, { id: 'press-b' }]
  const plans = [
    { id: 'ground', markers: [marker('press-a'), marker('press-b'), marker('lat-pulldown')] },
  ]
  const result = exerciseLocationPlanData(units, plans)

  assert.deepEqual(
    result.floorPlans[0].markers.map((item) => item.matchesExercise),
    [true, true, false],
  )
  assert.deepEqual(memberEquipmentFilter('gym-1', true), {
    gymId: 'gym-1',
    isActive: { $ne: false },
    isDemo: { $ne: true },
  })
})

test('exercise location query includes all active instances of matching equipment types', async () => {
  const units = [
    {
      _id: 'press-a',
      equipmentTypeId: 'press-type',
      displayName: 'Press A',
      details: 'Legacy details',
      description: 'Legacy description',
      translations: { en: { displayName: 'Press A', details: 'Legacy translated details' } },
    },
    { _id: 'press-b', equipmentTypeId: 'press-type', displayName: 'Press B' },
  ]
  let unitFilter
  const db = {
    collection(name) {
      if (name === 'gymEquipment')
        return {
          find(filter) {
            unitFilter = filter
            return {
              sort() {
                return this
              },
              toArray: async () => units,
            }
          },
        }
      if (name === 'equipmentTypes')
        return { find: () => ({ toArray: async () => [{ _id: 'press-type', name: 'Press' }] }) }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }
  const sails = {
    hooks: { orm: { datastores: { default: { manager: { client: { db: () => db } } } } } },
  }
  const originalList = FloorPlanService.listMemberFloorPlans
  FloorPlanService.listMemberFloorPlans = async (_sails, _gymId, options) => {
    assert.equal(options.includeUnavailable, true)
    return [{ id: 'floor-1', markers: [marker('press-a'), marker('press-b')] }]
  }
  try {
    const result = await FloorPlanService.getExerciseLocations(sails, ['press-type'], 'gym-a')
    assert.equal(unitFilter.isAvailable, undefined)
    assert.deepEqual(unitFilter.isActive, { $ne: false })
    assert.deepEqual(
      result.equipmentUnits.map((unit) => unit.id),
      ['press-a', 'press-b'],
    )
    assert.equal(Object.hasOwn(result.equipmentUnits[0], 'details'), false)
    assert.equal(Object.hasOwn(result.equipmentUnits[0], 'description'), false)
    assert.equal(Object.hasOwn(result.equipmentUnits[0].translations.en, 'details'), false)
    assert.equal(units[0].details, 'Legacy details')
    assert.deepEqual(
      result.floorPlans[0].markers.map((item) => item.matchesExercise),
      [true, true],
    )
  } finally {
    FloorPlanService.listMemberFloorPlans = originalList
  }
})

test('returns an empty location list when the gym has no floor plans', () => {
  const result = exerciseLocationPlanData([], [])
  assert.equal(result.hasMappedEquipment, false)
  assert.deepEqual(result.floorPlans, [])
})

test('shows all floors without highlighting unrelated equipment when nothing is mapped', () => {
  const plans = [{ id: 'ground', markers: [marker('lat-pulldown')] }]
  const result = exerciseLocationPlanData([{ id: 'press-a' }], plans)
  assert.equal(result.hasMappedEquipment, false)
  assert.deepEqual(result.floorPlans, plans)
})
