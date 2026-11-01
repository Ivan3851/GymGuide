const test = require('node:test')
const assert = require('node:assert/strict')
const { memberEquipmentFilter } = require('../api/services/FloorPlanService')

test('member map includes active unavailable equipment while normal floor-plan use remains available-only', () => {
  assert.deepEqual(memberEquipmentFilter('gym-a', true), {
    gymId: 'gym-a',
    isActive: { $ne: false },
  })
  assert.deepEqual(memberEquipmentFilter('gym-a', false), {
    gymId: 'gym-a',
    isActive: { $ne: false },
    isAvailable: true,
  })
})
