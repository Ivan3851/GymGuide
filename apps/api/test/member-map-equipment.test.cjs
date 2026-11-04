const test = require('node:test')
const assert = require('node:assert/strict')
const FloorPlanService = require('../api/services/FloorPlanService')
const { memberEquipmentFilter } = FloorPlanService

test('member map includes active unavailable equipment while normal floor-plan use remains available-only', () => {
  assert.deepEqual(memberEquipmentFilter('gym-a', true), {
    gymId: 'gym-a',
    isActive: { $ne: false },
    isDemo: { $ne: true },
  })
  assert.deepEqual(memberEquipmentFilter('gym-a', false), {
    gymId: 'gym-a',
    isActive: { $ne: false },
    isDemo: { $ne: true },
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

test('floor-plan marker responses omit legacy physical equipment descriptions', async () => {
  const plan = {
    _id: 'floor-a',
    gymId: 'gym-a',
    name: 'Main floor',
    imageMediaId: 'floor-image',
    isActive: true,
  }
  const unit = {
    _id: 'press-a',
    gymId: 'gym-a',
    equipmentTypeId: 'press-type',
    displayName: 'Chest press',
    details: 'Legacy details',
    description: 'Legacy description',
    translations: { en: { displayName: 'Chest press', details: 'Old translated details' } },
    isActive: true,
  }
  const db = {
    collection(name) {
      if (name === 'gymFloorPlans')
        return { find: () => ({ sort: () => ({ toArray: async () => [plan] }) }) }
      if (name === 'mediaAssets')
        return {
          findOne: async () => ({
            _id: 'floor-image',
            originalName: 'floor.png',
            mediaType: 'image',
            mimeType: 'image/png',
            size: 42,
          }),
        }
      if (name === 'floorPlanMarkers')
        return {
          find: () => ({
            toArray: async () => [
              {
                _id: 'floor-a--press-a',
                gymId: 'gym-a',
                floorPlanId: 'floor-a',
                gymEquipmentId: 'press-a',
                x: 0.5,
                y: 0.5,
              },
            ],
          }),
        }
      if (name === 'gymEquipment') return { find: () => ({ toArray: async () => [unit] }) }
      if (name === 'equipmentTypes')
        return {
          find: () => ({ toArray: async () => [{ _id: 'press-type', name: 'Press' }] }),
        }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }
  const sails = {
    hooks: {
      orm: { datastores: { default: { manager: { client: { db: () => db } } } } },
      config: { appPath: '' },
    },
  }
  const [result] = await FloorPlanService.listMemberFloorPlans(sails, 'gym-a')
  const equipment = result.markers[0].gymEquipment
  assert.equal(equipment.displayName, 'Chest press')
  assert.equal(Object.hasOwn(equipment, 'details'), false)
  assert.equal(Object.hasOwn(equipment, 'description'), false)
  assert.equal(Object.hasOwn(equipment.translations.en, 'details'), false)
  assert.equal(unit.details, 'Legacy details')
})
