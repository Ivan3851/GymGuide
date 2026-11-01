const assert = require('node:assert/strict')
const test = require('node:test')
const KioskSettingsService = require('../api/services/KioskSettingsService')

function createDatabase(gym = { _id: 'demo-gym', status: 'active', settings: {} }) {
  const record = structuredClone(gym)
  const collection = {
    async findOne(filter) {
      return filter._id === record._id && filter.status === record.status
        ? structuredClone(record)
        : null
    },
    async updateOne(filter, update) {
      if (filter._id !== record._id || filter.status !== record.status) return { matchedCount: 0 }
      const path = 'settings.memberInactivityTimeoutSeconds'
      const existsCondition = filter[path]?.$exists
      const exists = Number.isInteger(record.settings?.memberInactivityTimeoutSeconds)
      if (existsCondition === false && exists) return { matchedCount: 0 }
      record.settings ||= {}
      if (Object.hasOwn(update.$set, path))
        record.settings.memberInactivityTimeoutSeconds = update.$set[path]
      return { matchedCount: 1 }
    },
  }
  const sailsInstance = {
    hooks: {
      orm: {
        datastores: {
          default: { manager: { client: { db: () => ({ collection: () => collection }) } } },
        },
      },
    },
  }
  return { record, sailsInstance }
}

test('missing gym setting defaults to 60 seconds and is saved in the gym record', async () => {
  const { record, sailsInstance } = createDatabase()
  const result = await KioskSettingsService.get(sailsInstance)
  assert.deepEqual(result, { memberInactivityTimeoutSeconds: 60 })
  assert.equal(record.settings.memberInactivityTimeoutSeconds, 60)
})

test('admin can save an integer timeout within the allowed bounds', async () => {
  const { record, sailsInstance } = createDatabase()
  const result = await KioskSettingsService.update(
    sailsInstance,
    { memberInactivityTimeoutSeconds: 120 },
    { gymId: 'demo-gym' },
  )
  assert.deepEqual(result, { memberInactivityTimeoutSeconds: 120 })
  assert.equal(record.settings.memberInactivityTimeoutSeconds, 120)
})

test('admin cannot save an out-of-range or fractional timeout', async () => {
  const { record, sailsInstance } = createDatabase()
  for (const value of [14, 601, 60.5, '60']) {
    await assert.rejects(
      KioskSettingsService.update(
        sailsInstance,
        { memberInactivityTimeoutSeconds: value },
        { gymId: 'demo-gym' },
      ),
      (error) => error.status === 400,
    )
  }
  assert.equal(record.settings.memberInactivityTimeoutSeconds, undefined)
})
