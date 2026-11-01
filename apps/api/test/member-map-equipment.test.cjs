const test = require('node:test')
const assert = require('node:assert/strict')
const FloorPlanService = require('../api/services/FloorPlanService')
const { memberEquipmentFilter } = FloorPlanService

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

test('map request can retain active floor plans whose uploaded image is unavailable', async () => {
  const plan = {
    _id: 'floor-a',
    gymId: 'gym-a',
    name: 'Main floor',
    imageMediaId: 'missing-image',
  }
  const db = {
    collection(name) {
      if (name === 'gymFloorPlans')
        return {
          find: () => ({
            sort: () => ({ toArray: async () => [plan] }),
          }),
        }
      if (name === 'mediaAssets') return { findOne: async () => null }
      if (name === 'floorPlanMarkers') return { find: () => ({ toArray: async () => [] }) }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }
  const sails = {
    hooks: {
      orm: {
        datastores: {
          default: {
            manager: {
              client: { db: () => db },
            },
          },
        },
      },
    },
  }
  const plans = await FloorPlanService.listMemberFloorPlans(sails, 'gym-a', {
    includeMissingImages: true,
  })
  assert.equal(plans.length, 1)
  assert.equal(plans[0].image, null)
  assert.deepEqual(plans[0].markers, [])
})
