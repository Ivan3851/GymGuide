const assert = require('node:assert/strict')
const test = require('node:test')
const { provision } = require('../api/services/AdminProvisioningService')

function makeDb(existing = null) {
  const writes = []
  return {
    writes,
    collection() {
      return {
        async findOne() {
          return existing
        },
        async insertOne(document) {
          writes.push({ operation: 'insert', document })
          return { acknowledged: true }
        },
        async updateOne(filter, update) {
          writes.push({ operation: 'update', filter, update })
          return { matchedCount: 1 }
        },
      }
    },
  }
}

test('new admin provisioning inserts a password hash without upserting', async () => {
  const db = makeDb()
  const result = await provision(db, {
    username: 'staff.one',
    email: null,
    passwordHash: 'bcrypt-hash',
    gymId: 'gym-a',
  })
  assert.equal(result.action, 'created')
  assert.equal(db.writes[0].operation, 'insert')
  assert.equal(db.writes[0].document.passwordHash, 'bcrypt-hash')
})

test('existing admin provisioning refuses changes unless explicitly requested', async () => {
  const existing = {
    _id: 'admin-staff',
    username: 'staff.one',
    role: 'gym-staff',
    gymId: 'gym-original',
    isActive: false,
  }
  const db = makeDb(existing)
  await assert.rejects(
    provision(db, {
      username: existing.username,
      passwordHash: 'new-hash',
      gymId: 'gym-other',
    }),
    /Refusing to replace/,
  )
  assert.deepEqual(db.writes, [])
})

test('explicit admin reset changes only password/email fields', async () => {
  const existing = {
    _id: 'admin-staff',
    username: 'staff.one',
    role: 'gym-staff',
    gymId: 'gym-original',
    isActive: false,
  }
  const db = makeDb(existing)
  const result = await provision(db, {
    username: existing.username,
    email: 'staff@example.invalid',
    passwordHash: 'new-hash',
    gymId: 'gym-other',
    resetExisting: true,
  })
  assert.equal(result.action, 'reset')
  assert.deepEqual(db.writes[0].update.$set, {
    passwordHash: 'new-hash',
    email: 'staff@example.invalid',
    updatedAt: db.writes[0].update.$set.updatedAt,
  })
  assert.equal(existing.role, 'gym-staff')
  assert.equal(existing.gymId, 'gym-original')
  assert.equal(existing.isActive, false)
})
