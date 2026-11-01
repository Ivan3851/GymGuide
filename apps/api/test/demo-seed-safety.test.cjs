const assert = require('node:assert/strict')
const test = require('node:test')
const DemoSeedService = require('../api/services/DemoSeedService')

function createMemoryDatabase() {
  const records = new Map()
  const db = {
    records,
    collection(name) {
      if (!records.has(name)) records.set(name, new Map())
      const collectionRecords = records.get(name)
      return {
        async findOne(filter) {
          return [...collectionRecords.values()].find((record) =>
            Object.entries(filter).every(([key, value]) => {
              if (value && value.$ne !== undefined) return record[key] !== value.$ne
              return record[key] === value
            }),
          )
        },
        async createIndex() {},
        async updateOne(filter, update, options) {
          const existing = collectionRecords.get(filter._id)
          if (existing) return { matchedCount: 1, upsertedCount: 0 }
          if (!options?.upsert) return { matchedCount: 0, upsertedCount: 0 }
          collectionRecords.set(filter._id, structuredClone(update.$setOnInsert))
          return { matchedCount: 0, upsertedCount: 1 }
        },
      }
    },
  }
  return db
}

test('demo seed safety refuses the first non-demo record before writes', async () => {
  const checked = []
  const db = {
    collection(name) {
      return {
        async findOne() {
          checked.push(name)
          return name === 'exercises' ? { _id: 'member-content', isDemo: false } : null
        },
      }
    },
  }
  await assert.rejects(DemoSeedService.assertSeedTargetIsDemoOnly(db), /non-demo data/)
  assert.deepEqual(checked, ['gyms', 'muscleGroups', 'equipmentTypes', 'exercises'])
})

test('demo seed safety permits only demo-marked records', async () => {
  const db = {
    collection() {
      return {
        async findOne() {
          return null
        },
      }
    },
  }
  await assert.doesNotReject(DemoSeedService.assertSeedTargetIsDemoOnly(db))
})

test('repeated demo seed inserts missing records but preserves existing demo edits', async () => {
  const db = createMemoryDatabase()
  const sailsInstance = {
    hooks: { orm: { datastores: { default: { manager: { client: { db: () => db } } } } } },
  }
  const firstRun = await DemoSeedService.seed(sailsInstance, 'demo-gym-test')
  assert.ok(firstRun.exercises.inserted > 0)
  const exercise = db.records.get('exercises').get('machine-chest-press')
  exercise.name = 'Edited by staff'

  const secondRun = await DemoSeedService.seed(sailsInstance, 'demo-gym-test')

  assert.equal(secondRun.exercises.inserted, 0)
  assert.equal(db.records.get('exercises').get('machine-chest-press').name, 'Edited by staff')
})
