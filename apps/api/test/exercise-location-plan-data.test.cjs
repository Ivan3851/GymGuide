const assert = require('node:assert/strict')
const test = require('node:test')
const { exerciseLocationPlanData } = require('../api/services/FloorPlanService')

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
