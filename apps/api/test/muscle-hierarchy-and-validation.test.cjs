const assert = require('node:assert/strict')
const test = require('node:test')
const AdminService = require('../api/services/AdminService')
const Hierarchy = require('../api/services/MuscleGroupHierarchy')

test('parentless muscle groups remain valid and descendants resolve through multiple levels', () => {
  const groups = [
    { id: 'chest' },
    { id: 'upper-chest', parentId: 'chest' },
    { id: 'upper-inner', parentId: 'upper-chest' },
    { id: 'back' },
  ]
  const byId = new Map(groups.map((group) => [group.id, group]))

  assert.deepEqual(
    [...Hierarchy.descendantsOf(groups, 'chest')],
    ['chest', 'upper-chest', 'upper-inner'],
  )
  assert.equal(Hierarchy.rootIdFor(byId, 'upper-inner'), 'chest')
  assert.equal(Hierarchy.rootIdFor(byId, 'back'), 'back')
})

function muscleDb(records) {
  const byId = new Map(records.map((record) => [record._id, record]))
  return {
    collection(name) {
      assert.equal(name, 'muscleGroups')
      return { findOne: async ({ _id }) => byId.get(_id) || null }
    },
  }
}

test('muscle parent can be omitted or assigned to an active existing group', async () => {
  const db = muscleDb([{ _id: 'chest', isActive: true }])
  const omitted = {}
  await AdminService.validateMuscleGroupParent(db, 'upper-chest', omitted)
  const child = { parentId: 'chest' }
  await AdminService.validateMuscleGroupParent(db, 'upper-chest', child)
  assert.equal(child.parentId, 'chest')
  const removed = { parentId: '' }
  await AdminService.validateMuscleGroupParent(db, 'upper-chest', removed)
  assert.equal(removed.parentId, null)
})

test('muscle parent validation rejects self-parenting, invalid references, and cycles', async () => {
  const db = muscleDb([
    { _id: 'chest', isActive: true },
    { _id: 'upper-chest', parentId: 'chest', isActive: true },
    { _id: 'middle-chest', parentId: 'upper-chest', isActive: true },
  ])
  await assert.rejects(
    AdminService.validateMuscleGroupParent(db, 'chest', { parentId: 'chest' }),
    /cannot be its own parent/,
  )
  await assert.rejects(
    AdminService.validateMuscleGroupParent(db, 'upper-chest', { parentId: 'missing' }),
    /active parent/,
  )
  await assert.rejects(
    AdminService.validateMuscleGroupParent(db, 'chest', { parentId: 'middle-chest' }),
    /circular/,
  )
})

test('exercise muscle validation rejects primary/secondary overlap and duplicate secondary groups', () => {
  assert.throws(
    () => AdminService.validateExerciseMuscleSelection(['chest'], ['chest']),
    /primary muscle group cannot also be selected/,
  )
  assert.throws(
    () => AdminService.validateExerciseMuscleSelection(['chest'], ['back', 'back']),
    /must not contain duplicates/,
  )
  assert.deepEqual(AdminService.validateExerciseMuscleSelection(['chest'], ['back']), [
    { muscleGroupId: 'chest', role: 'primary' },
    { muscleGroupId: 'back', role: 'secondary' },
  ])
})
