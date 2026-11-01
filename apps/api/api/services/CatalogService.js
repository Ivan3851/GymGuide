const ApiError = require('./ApiError')
const FloorPlanService = require('./FloorPlanService')

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,139}$/

function validateId(id, label) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw ApiError.badRequest(`The ${label} ID is invalid.`)
  }
}

function database(sailsInstance) {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore || !datastore.manager || !datastore.manager.client) {
    const error = new Error('The MongoDB connection is not ready.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}

function toPublic(document) {
  if (!document) return document
  const { _id, ...fields } = document
  return { ...fields, id: String(_id) }
}

function unique(values) {
  return [...new Set(values)]
}

async function findActiveExerciseMuscles(db, exerciseIds) {
  if (!exerciseIds.length) return []
  return db
    .collection('exerciseMuscles')
    .find({ exerciseId: { $in: exerciseIds } })
    .toArray()
}

async function muscleDetails(db, relations) {
  const muscleIds = unique(relations.map((relation) => relation.muscleGroupId))
  if (!muscleIds.length) return []

  const muscles = await db
    .collection('muscleGroups')
    .find({ _id: { $in: muscleIds }, isActive: true })
    .toArray()
  const byId = new Map(muscles.map((muscle) => [String(muscle._id), toPublic(muscle)]))

  return relations
    .map((relation) => {
      const muscle = byId.get(relation.muscleGroupId)
      return muscle ? { ...muscle, role: relation.role } : null
    })
    .filter(Boolean)
}

module.exports = {
  listMuscleGroups: async function listMuscleGroups(sailsInstance) {
    const db = database(sailsInstance)
    const records = await db
      .collection('muscleGroups')
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray()

    return records.map(toPublic)
  },

  getEquipmentForMuscleGroup: async function getEquipmentForMuscleGroup(
    sailsInstance,
    muscleGroupId,
    gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym',
  ) {
    validateId(muscleGroupId, 'muscle group')
    const db = database(sailsInstance)
    const muscleGroup = await db
      .collection('muscleGroups')
      .findOne({ _id: muscleGroupId, isActive: true })
    if (!muscleGroup) throw ApiError.notFound('Muscle group not found.')

    const exerciseMuscles = await db.collection('exerciseMuscles').find({ muscleGroupId }).toArray()
    const linkedExerciseIds = unique(exerciseMuscles.map((relation) => relation.exerciseId))
    const activeExercises = linkedExerciseIds.length
      ? await db
          .collection('exercises')
          .find({ _id: { $in: linkedExerciseIds }, isActive: true }, { projection: { _id: 1 } })
          .toArray()
      : []
    const exerciseIds = activeExercises.map((exercise) => String(exercise._id))
    const compatibility = exerciseIds.length
      ? await db
          .collection('exerciseEquipment')
          .find({ exerciseId: { $in: exerciseIds } })
          .toArray()
      : []
    const equipmentTypeIds = unique(compatibility.map((relation) => relation.equipmentTypeId))

    if (!equipmentTypeIds.length) {
      return { muscleGroup: toPublic(muscleGroup), equipment: [] }
    }

    const [types, inventory] = await Promise.all([
      db
        .collection('equipmentTypes')
        .find({ _id: { $in: equipmentTypeIds }, isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .toArray(),
      db
        .collection('gymEquipment')
        .find({
          gymId,
          equipmentTypeId: { $in: equipmentTypeIds },
          isAvailable: true,
          isActive: { $ne: false },
        })
        .sort({ displayName: 1 })
        .toArray(),
    ])

    const inventoryByType = new Map()
    for (const unit of inventory) {
      const units = inventoryByType.get(unit.equipmentTypeId) || []
      units.push(toPublic(unit))
      inventoryByType.set(unit.equipmentTypeId, units)
    }

    const equipment = types
      .map((type) => {
        const gymEquipment = inventoryByType.get(String(type._id)) || []
        return gymEquipment.length
          ? { ...toPublic(type), unitCount: gymEquipment.length, gymEquipment }
          : null
      })
      .filter(Boolean)

    return { muscleGroup: toPublic(muscleGroup), equipment }
  },

  getExercisesForEquipment: async function getExercisesForEquipment(
    sailsInstance,
    equipmentTypeId,
  ) {
    validateId(equipmentTypeId, 'equipment')
    const db = database(sailsInstance)
    const equipmentType = await db
      .collection('equipmentTypes')
      .findOne({ _id: equipmentTypeId, isActive: true })
    if (!equipmentType) throw ApiError.notFound('Equipment type not found.')

    const inventory = await db.collection('gymEquipment').findOne({
      gymId: process.env.GYMGUIDE_GYM_ID || 'demo-gym',
      equipmentTypeId,
      isAvailable: true,
      isActive: { $ne: false },
    })
    if (!inventory) throw ApiError.notFound('This equipment is not available at the demo gym.')

    const links = await db.collection('exerciseEquipment').find({ equipmentTypeId }).toArray()
    const exerciseIds = unique(links.map((link) => link.exerciseId))
    const exercises = exerciseIds.length
      ? await db
          .collection('exercises')
          .find({ _id: { $in: exerciseIds }, isActive: true })
          .sort({ sortOrder: 1, name: 1 })
          .toArray()
      : []
    const relations = await findActiveExerciseMuscles(
      db,
      exercises.map((exercise) => String(exercise._id)),
    )
    const musclesByExercise = new Map()
    for (const relation of relations) {
      const items = musclesByExercise.get(relation.exerciseId) || []
      items.push(relation)
      musclesByExercise.set(relation.exerciseId, items)
    }

    const exercisesWithMuscles = await Promise.all(
      exercises.map(async (exercise) => ({
        ...toPublic(exercise),
        muscles: await muscleDetails(db, musclesByExercise.get(String(exercise._id)) || []),
      })),
    )

    return { equipmentType: toPublic(equipmentType), exercises: exercisesWithMuscles }
  },

  getExerciseDetails: async function getExerciseDetails(sailsInstance, exerciseId) {
    validateId(exerciseId, 'exercise')
    const db = database(sailsInstance)
    const exercise = await db.collection('exercises').findOne({ _id: exerciseId, isActive: true })
    if (!exercise) throw ApiError.notFound('Exercise not found.')

    const [muscleRelations, equipmentRelations] = await Promise.all([
      db.collection('exerciseMuscles').find({ exerciseId }).toArray(),
      db.collection('exerciseEquipment').find({ exerciseId }).toArray(),
    ])
    const equipmentTypeIds = unique(equipmentRelations.map((relation) => relation.equipmentTypeId))
    const equipmentTypes = equipmentTypeIds.length
      ? await db
          .collection('equipmentTypes')
          .find({ _id: { $in: equipmentTypeIds }, isActive: true })
          .sort({ sortOrder: 1 })
          .toArray()
      : []

    const imageMediaIds = Array.isArray(exercise.imageMediaIds) ? exercise.imageMediaIds : []
    const mediaIds = unique([exercise.videoMediaId, ...imageMediaIds].filter(Boolean))
    const mediaRecords = mediaIds.length
      ? await db
          .collection('mediaAssets')
          .find({ _id: { $in: mediaIds }, status: 'ready' })
          .toArray()
      : []
    const mediaById = new Map(mediaRecords.map((asset) => [String(asset._id), asset]))
    const mediaService = require('./MediaService')
    const videoAsset = exercise.videoMediaId && mediaById.get(exercise.videoMediaId)
    const images = imageMediaIds
      .map((id) => mediaById.get(id))
      .filter((asset) => asset && asset.mediaType === 'image')
      .map(mediaService.publicAsset)

    const muscles = await muscleDetails(db, muscleRelations)
    const equipmentLocations = await FloorPlanService.getExerciseLocations(
      sailsInstance,
      equipmentTypes.map((type) => String(type._id)),
    )
    return {
      ...toPublic(exercise),
      muscles: {
        primary: muscles.filter((muscle) => muscle.role === 'primary'),
        secondary: muscles.filter((muscle) => muscle.role === 'secondary'),
      },
      equipmentTypes: equipmentTypes.map(toPublic),
      equipmentLocations,
      video:
        videoAsset && videoAsset.mediaType === 'video'
          ? { ...mediaService.publicAsset(videoAsset), status: 'available' }
          : { id: null, contentUrl: null, status: 'placeholder' },
      images,
    }
  },

  getExerciseVariations: async function getExerciseVariations(sailsInstance, exerciseId) {
    validateId(exerciseId, 'exercise')
    const db = database(sailsInstance)
    const exercise = await db
      .collection('exercises')
      .findOne({ _id: exerciseId, isActive: true }, { projection: { _id: 1 } })
    if (!exercise) throw ApiError.notFound('Exercise not found.')

    const variations = await db
      .collection('exerciseVariations')
      .find({ exerciseId, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray()
    return variations.map(toPublic)
  },
}
