const demoCatalog = require('../data/demo-catalog')
const databaseIndexes = require('./DatabaseIndexes')

function assertUniqueSlugs(items, collectionName) {
  const slugs = items.map((item) => item.slug)
  if (new Set(slugs).size !== slugs.length) {
    throw new Error(`Demo seed contains duplicate slugs in ${collectionName}.`)
  }
}

function validateDemoCatalog() {
  const muscleSlugs = new Set(demoCatalog.muscleGroups.map((item) => item.slug))
  const equipmentSlugs = new Set(demoCatalog.equipmentTypes.map((item) => item.slug))
  const exerciseSlugs = new Set(demoCatalog.exercises.map((item) => item.slug))

  assertUniqueSlugs(demoCatalog.muscleGroups, 'muscleGroups')
  assertUniqueSlugs(demoCatalog.equipmentTypes, 'equipmentTypes')
  assertUniqueSlugs(demoCatalog.exercises, 'exercises')
  assertUniqueSlugs(demoCatalog.variations, 'exerciseVariations')
  assertUniqueSlugs(demoCatalog.gymEquipment, 'gymEquipment')

  for (const exercise of demoCatalog.exercises) {
    for (const muscle of exercise.muscles) {
      if (!muscleSlugs.has(muscle.slug)) {
        throw new Error(`Unknown muscle group "${muscle.slug}" in ${exercise.slug}.`)
      }
    }
    for (const equipmentSlug of exercise.equipmentTypeSlugs) {
      if (!equipmentSlugs.has(equipmentSlug)) {
        throw new Error(`Unknown equipment type "${equipmentSlug}" in ${exercise.slug}.`)
      }
    }
  }

  for (const variation of demoCatalog.variations) {
    if (!exerciseSlugs.has(variation.exerciseSlug)) {
      throw new Error(`Unknown parent exercise "${variation.exerciseSlug}" in ${variation.slug}.`)
    }
  }

  for (const equipment of demoCatalog.gymEquipment) {
    if (!equipmentSlugs.has(equipment.equipmentTypeSlug)) {
      throw new Error(
        `Unknown equipment type "${equipment.equipmentTypeSlug}" in ${equipment.slug}.`,
      )
    }
  }
}

async function upsertBySlug(collection, record) {
  const now = Date.now()
  const { slug } = record

  return collection.updateOne(
    { _id: slug },
    {
      $setOnInsert: {
        ...record,
        _id: slug,
        slug,
        isDemo: true,
        seedSource: 'phase-2-demo',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  )
}

async function upsertRelation(collection, id, fields) {
  const now = Date.now()
  return collection.updateOne(
    { _id: id },
    {
      $setOnInsert: {
        ...fields,
        _id: id,
        isDemo: true,
        seedSource: 'phase-2-demo',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  )
}

function relationId(...parts) {
  return parts.join('--')
}

const seedCollections = [
  'gyms',
  'muscleGroups',
  'equipmentTypes',
  'exercises',
  'exerciseVariations',
  'exerciseMuscles',
  'exerciseEquipment',
  'gymEquipment',
]

async function assertSeedTargetIsDemoOnly(db) {
  for (const collectionName of seedCollections) {
    const existingRecord = await db.collection(collectionName).findOne({ isDemo: { $ne: true } })
    if (existingRecord) {
      throw new Error(
        `Demo seed stopped because ${collectionName} contains non-demo data. Choose an empty demo database; existing records were not changed.`,
      )
    }
  }
}

module.exports = {
  validateDemoCatalog,
  assertSeedTargetIsDemoOnly,

  seed: async function seed(sailsInstance, gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym') {
    validateDemoCatalog()
    const db = sailsInstance.hooks.orm.datastores.default.manager.client.db()
    await assertSeedTargetIsDemoOnly(db)
    await databaseIndexes.ensure(sailsInstance)
    const counts = {}
    const upsertMany = async (collectionName, records) => {
      let inserted = 0
      for (const record of records) {
        const result = await upsertBySlug(db.collection(collectionName), record)
        inserted += result.upsertedCount
      }
      counts[collectionName] = { total: records.length, inserted }
    }

    await upsertMany('gyms', [{ slug: gymId, name: 'GymGuide Demo Gym', status: 'active' }])
    await upsertMany(
      'muscleGroups',
      demoCatalog.muscleGroups.map((item) => ({ ...item, isActive: true })),
    )
    await upsertMany(
      'equipmentTypes',
      demoCatalog.equipmentTypes.map((item) => ({ ...item, isActive: true })),
    )

    const exercises = demoCatalog.exercises.map((item) => {
      const exercise = { ...item }
      delete exercise.equipmentTypeSlugs
      delete exercise.muscles
      return { ...exercise, isActive: true, videoMediaId: null }
    })
    await upsertMany('exercises', exercises)

    const variations = demoCatalog.variations.map((item) => {
      const { exerciseSlug, ...variation } = item
      return { ...variation, exerciseId: exerciseSlug, isActive: true }
    })
    await upsertMany('exerciseVariations', variations)

    const exerciseMuscles = demoCatalog.exercises.flatMap((exercise) =>
      exercise.muscles.map((muscle) => ({
        id: relationId(exercise.slug, muscle.slug, muscle.role),
        exerciseId: exercise.slug,
        muscleGroupId: muscle.slug,
        role: muscle.role,
      })),
    )
    let insertedMuscles = 0
    for (const relation of exerciseMuscles) {
      const { id, ...fields } = relation
      const result = await upsertRelation(db.collection('exerciseMuscles'), id, fields)
      insertedMuscles += result.upsertedCount
    }
    counts.exerciseMuscles = { total: exerciseMuscles.length, inserted: insertedMuscles }

    const exerciseEquipment = demoCatalog.exercises.flatMap((exercise) =>
      exercise.equipmentTypeSlugs.map((equipmentTypeId) => ({
        id: relationId(exercise.slug, equipmentTypeId),
        exerciseId: exercise.slug,
        equipmentTypeId,
      })),
    )
    let insertedEquipmentLinks = 0
    for (const relation of exerciseEquipment) {
      const { id, ...fields } = relation
      const result = await upsertRelation(db.collection('exerciseEquipment'), id, fields)
      insertedEquipmentLinks += result.upsertedCount
    }
    counts.exerciseEquipment = { total: exerciseEquipment.length, inserted: insertedEquipmentLinks }

    const inventory = demoCatalog.gymEquipment.map((item) => ({
      slug: item.slug,
      gymId,
      equipmentTypeId: item.equipmentTypeSlug,
      displayName: item.displayName,
      isAvailable: item.isAvailable,
    }))
    await upsertMany('gymEquipment', inventory)

    return counts
  },
}
