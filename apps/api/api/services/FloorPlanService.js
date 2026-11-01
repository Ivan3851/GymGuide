const ApiError = require('./ApiError')
const MediaService = require('./MediaService')

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,139}$/

function memberEquipmentFilter(gymId, includeUnavailable) {
  return {
    gymId,
    isActive: { $ne: false },
    ...(includeUnavailable ? {} : { isAvailable: true }),
  }
}

function database(sailsInstance) {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore || !datastore.manager || !datastore.manager.client) {
    const error = new Error('MongoDB is not connected.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}

function toPublic(document) {
  const { _id, ...rest } = document
  return { ...rest, id: String(_id) }
}

async function markersForPlan(db, floorPlan, includeArchived = false, includeUnavailable = false) {
  const markerRecords = await db
    .collection('floorPlanMarkers')
    .find({ floorPlanId: String(floorPlan._id), gymId: floorPlan.gymId })
    .toArray()
  if (!markerRecords.length) return []
  const equipmentIds = markerRecords.map((marker) => marker.gymEquipmentId)
  const units = await db
    .collection('gymEquipment')
    .find({
      _id: { $in: equipmentIds },
      gymId: floorPlan.gymId,
      ...(includeArchived ? {} : memberEquipmentFilter(floorPlan.gymId, includeUnavailable)),
    })
    .toArray()
  const typesById = new Map()
  const typeIds = [...new Set(units.map((unit) => unit.equipmentTypeId))]
  if (typeIds.length) {
    const types = await db
      .collection('equipmentTypes')
      .find({ _id: { $in: typeIds }, ...(includeArchived ? {} : { isActive: true }) })
      .toArray()
    for (const type of types) typesById.set(String(type._id), type)
  }
  const unitsById = new Map(units.map((unit) => [String(unit._id), unit]))
  return markerRecords.flatMap((marker) => {
    const unit = unitsById.get(marker.gymEquipmentId)
    const equipmentType = unit && typesById.get(unit.equipmentTypeId)
    if (!unit || !equipmentType) return []
    return [
      {
        id: String(marker._id),
        x: marker.x,
        y: marker.y,
        gymEquipment: {
          id: String(unit._id),
          displayName: unit.displayName,
          details: unit.details || '',
          isDemo: unit.isDemo === true,
          equipmentTypeId: unit.equipmentTypeId,
          equipmentTypeName: equipmentType.name,
          equipmentType: toPublic(equipmentType),
        },
      },
    ]
  })
}

async function floorPlanDetails(
  db,
  plan,
  { includeUnavailable = false, includeMissingImages = false } = {},
) {
  const imageRecord = await db.collection('mediaAssets').findOne({
    _id: plan.imageMediaId,
    status: 'ready',
    mediaType: 'image',
  })
  if (!imageRecord && !includeMissingImages) return null
  return {
    ...toPublic(plan),
    image: imageRecord ? MediaService.publicAsset(imageRecord) : null,
    markers: await markersForPlan(db, plan, false, includeUnavailable),
  }
}

function exerciseLocationPlanData(equipmentUnits, plans) {
  const unitIds = new Set(equipmentUnits.map((unit) => String(unit.id)))
  const relevantPlans = plans
    .map((plan) => ({
      ...plan,
      markers: plan.markers.map((marker) => ({
        ...marker,
        matchesExercise: unitIds.has(String(marker.gymEquipment.id)),
      })),
    }))
    .filter((plan) => plan.markers.some((marker) => marker.matchesExercise))
  return {
    equipmentUnits,
    floorPlans: relevantPlans.length ? relevantPlans : plans,
    hasMappedEquipment: relevantPlans.length > 0,
  }
}

module.exports = {
  exerciseLocationPlanData,
  memberEquipmentFilter,
  listMemberFloorPlans: async function listMemberFloorPlans(
    sailsInstance,
    gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym',
    options = {},
  ) {
    const db = database(sailsInstance)
    const plans = await db
      .collection('gymFloorPlans')
      .find({ gymId, isActive: true })
      .sort({ sortOrder: 1, floorLabel: 1, name: 1 })
      .toArray()
    const results = await Promise.all(plans.map((plan) => floorPlanDetails(db, plan, options)))
    return results.filter(Boolean)
  },

  getMemberFloorPlan: async function getMemberFloorPlan(
    sailsInstance,
    id,
    gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym',
  ) {
    if (!ID_PATTERN.test(id || '')) throw ApiError.badRequest('The floor plan ID is invalid.')
    const db = database(sailsInstance)
    const plan = await db.collection('gymFloorPlans').findOne({ _id: id, gymId, isActive: true })
    if (!plan) throw ApiError.notFound('Floor plan not found.')
    const data = await floorPlanDetails(db, plan)
    if (!data) throw ApiError.notFound('Floor plan image is unavailable.')
    return data
  },

  getExerciseLocations: async function getExerciseLocations(
    sailsInstance,
    equipmentTypeIds,
    gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym',
  ) {
    const db = database(sailsInstance)
    const typeIds = [...new Set(equipmentTypeIds)]
    const [units, plans] = await Promise.all([
      typeIds.length
        ? db
            .collection('gymEquipment')
            .find({
              gymId,
              equipmentTypeId: { $in: typeIds },
              isActive: { $ne: false },
              isAvailable: true,
            })
            .sort({ displayName: 1 })
            .toArray()
        : [],
      this.listMemberFloorPlans(sailsInstance, gymId),
    ])
    const activeTypes = typeIds.length
      ? await db
          .collection('equipmentTypes')
          .find({ _id: { $in: typeIds }, isActive: true })
          .toArray()
      : []
    const typesById = new Map(activeTypes.map((type) => [String(type._id), type]))
    const equipmentUnits = units
      .filter((unit) => typesById.has(unit.equipmentTypeId))
      .map((unit) => ({
        id: String(unit._id),
        displayName: unit.displayName,
        details: unit.details || '',
        isDemo: unit.isDemo === true,
        equipmentTypeId: unit.equipmentTypeId,
        equipmentTypeName: typesById.get(unit.equipmentTypeId).name,
        equipmentType: toPublic(typesById.get(unit.equipmentTypeId)),
      }))
    return exerciseLocationPlanData(equipmentUnits, plans)
  },

  listAdminMarkers: async function listAdminMarkers(sailsInstance, floorPlanId, user) {
    if (!ID_PATTERN.test(floorPlanId || ''))
      throw ApiError.badRequest('The floor plan ID is invalid.')
    const db = database(sailsInstance)
    const plan = await db
      .collection('gymFloorPlans')
      .findOne({ _id: floorPlanId, gymId: user.gymId })
    if (!plan) throw ApiError.notFound('Floor plan not found.')
    return markersForPlan(db, plan, true)
  },

  saveMarker: async function saveMarker(
    sailsInstance,
    floorPlanId,
    equipmentId,
    coordinates,
    user,
  ) {
    if (!ID_PATTERN.test(floorPlanId || '') || !ID_PATTERN.test(equipmentId || ''))
      throw ApiError.badRequest('The floor plan or equipment ID is invalid.')
    if (
      !coordinates ||
      !Number.isFinite(coordinates.x) ||
      !Number.isFinite(coordinates.y) ||
      coordinates.x < 0 ||
      coordinates.x > 1 ||
      coordinates.y < 0 ||
      coordinates.y > 1
    )
      throw ApiError.badRequest('Marker positions must be normalized coordinates between 0 and 1.')
    const db = database(sailsInstance)
    const plan = await db
      .collection('gymFloorPlans')
      .findOne({ _id: floorPlanId, gymId: user.gymId, isActive: true })
    if (!plan) throw ApiError.notFound('An active floor plan was not found.')
    const unit = await db
      .collection('gymEquipment')
      .findOne({ _id: equipmentId, gymId: user.gymId, isActive: { $ne: false } })
    if (!unit) throw ApiError.badRequest('Select active equipment belonging to this gym.')
    const type = await db
      .collection('equipmentTypes')
      .findOne({ _id: unit.equipmentTypeId, isActive: true })
    if (!type) throw ApiError.badRequest('The equipment type is archived.')

    const id = `${floorPlanId}--${equipmentId}`
    const now = Date.now()
    await db.collection('floorPlanMarkers').updateOne(
      { _id: id },
      {
        $set: {
          gymId: user.gymId,
          floorPlanId,
          gymEquipmentId: equipmentId,
          x: coordinates.x,
          y: coordinates.y,
          updatedAt: now,
        },
        $setOnInsert: { _id: id, createdAt: now },
      },
      { upsert: true },
    )
    return { id, floorPlanId, gymEquipmentId: equipmentId, x: coordinates.x, y: coordinates.y }
  },

  deleteMarker: async function deleteMarker(sailsInstance, floorPlanId, equipmentId, user) {
    if (!ID_PATTERN.test(floorPlanId || '') || !ID_PATTERN.test(equipmentId || ''))
      throw ApiError.badRequest('The floor plan or equipment ID is invalid.')
    const db = database(sailsInstance)
    const result = await db.collection('floorPlanMarkers').deleteOne({
      _id: `${floorPlanId}--${equipmentId}`,
      floorPlanId,
      gymId: user.gymId,
      gymEquipmentId: equipmentId,
    })
    if (!result.deletedCount) throw ApiError.notFound('Equipment marker not found.')
    return { floorPlanId, gymEquipmentId: equipmentId, deleted: true }
  },
}
