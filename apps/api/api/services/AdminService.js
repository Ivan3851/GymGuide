const crypto = require('crypto')
const ApiError = require('./ApiError')
const mediaReferenceLock = require('./MediaReferenceLock')
const BilingualContent = require('./BilingualContent')
const MuscleGroupHierarchy = require('./MuscleGroupHierarchy')

const resources = {
  'muscle-groups': {
    collection: 'muscleGroups',
    fields: ['slug', 'name', 'description', 'translations', 'sortOrder', 'parentId'],
    required: ['name', 'description'],
    label: 'muscle group',
  },
  'equipment-types': {
    collection: 'equipmentTypes',
    fields: ['slug', 'name', 'description', 'translations', 'sortOrder'],
    required: ['name', 'description'],
    label: 'equipment type',
  },
  'gym-equipment': {
    collection: 'gymEquipment',
    fields: ['equipmentTypeId', 'displayName', 'translations', 'isAvailable'],
    required: ['equipmentTypeId', 'displayName'],
    label: 'gym equipment',
  },
  exercises: {
    collection: 'exercises',
    fields: [
      'slug',
      'name',
      'summary',
      'instructions',
      'benefits',
      'tips',
      'commonMistakes',
      'translations',
      'videoMediaId',
      'imageMediaIds',
      'sortOrder',
    ],
    required: ['name'],
    label: 'exercise',
  },
  variations: {
    collection: 'exerciseVariations',
    fields: [
      'slug',
      'exerciseId',
      'name',
      'description',
      'instructions',
      'translations',
      'sortOrder',
    ],
    required: ['exerciseId', 'name', 'description'],
    label: 'exercise variation',
  },
  'floor-plans': {
    collection: 'gymFloorPlans',
    fields: ['name', 'translations', 'imageMediaId', 'sortOrder'],
    required: ['name', 'imageMediaId'],
    label: 'floor plan',
  },
}
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,139}$/

const dbFor = (sailsInstance) => {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore || !datastore.manager || !datastore.manager.client) {
    const error = new Error('MongoDB is not connected.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}
const publicRecord = (doc) => {
  const { _id, ...rest } = doc
  delete rest.passwordHash
  return { ...rest, id: String(_id) }
}
const publicGymEquipment = (doc) => {
  const result = publicRecord(doc)
  delete result.details
  delete result.description
  if (result.translations) {
    result.translations = Object.fromEntries(
      Object.entries(result.translations).map(([language, content]) => {
        const safeContent = { ...(content || {}) }
        delete safeContent.details
        delete safeContent.description
        return [language, safeContent]
      }),
    )
  }
  return result
}
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
function createContentSlug(input, resource, fallbackName) {
  const slug = slugify(input.slug || input.translations?.en?.name || fallbackName)
  return slug || `${resource}-${crypto.randomUUID()}`
}
function definition(resource) {
  const item = resources[resource]
  if (!item) throw ApiError.notFound('Admin resource not found.')
  return item
}
function validateId(id, label) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id))
    throw ApiError.badRequest(`The ${label} ID is invalid.`)
}

async function validateMuscleGroupParent(db, id, data) {
  if (!Object.hasOwn(data, 'parentId')) return
  if (data.parentId === '' || data.parentId === null) {
    data.parentId = null
    return
  }
  const parentId = data.parentId
  if (typeof parentId !== 'string' || !ID_PATTERN.test(parentId))
    throw ApiError.badRequest('Select a valid parent muscle group or leave it empty.')
  if (id && parentId === id) throw ApiError.badRequest('A muscle group cannot be its own parent.')

  const visited = new Set()
  let cursorId = parentId
  while (cursorId) {
    if (id && cursorId === id)
      throw ApiError.badRequest('This parent assignment would create a circular muscle hierarchy.')
    if (visited.has(cursorId))
      throw ApiError.badRequest('The selected parent belongs to a circular muscle hierarchy.')
    visited.add(cursorId)
    const parent = await db.collection('muscleGroups').findOne({
      _id: cursorId,
      isActive: true,
      isDemo: { $ne: true },
    })
    if (!parent) throw ApiError.badRequest('Select an active parent muscle group.')
    cursorId = MuscleGroupHierarchy.parentOf(parent)
  }
}

function validateExerciseMuscleSelection(primaryIds, secondaryIds) {
  if (
    !Array.isArray(primaryIds) ||
    !Array.isArray(secondaryIds) ||
    primaryIds.some((value) => typeof value !== 'string') ||
    secondaryIds.some((value) => typeof value !== 'string') ||
    primaryIds.length !== 1
  )
    throw ApiError.badRequest('Select exactly one primary muscle and unique secondary muscles.')
  if (new Set(secondaryIds).size !== secondaryIds.length)
    throw ApiError.badRequest('Secondary muscle groups must not contain duplicates.')
  if (secondaryIds.includes(primaryIds[0]))
    throw ApiError.badRequest(
      'The primary muscle group cannot also be selected as a secondary muscle group.',
    )
  return [
    ...primaryIds.map((muscleGroupId) => ({ muscleGroupId, role: 'primary' })),
    ...secondaryIds.map((muscleGroupId) => ({ muscleGroupId, role: 'secondary' })),
  ]
}
function validateText(value, label, maximum, required = true) {
  if (
    (required && (typeof value !== 'string' || !value.trim())) ||
    (value !== undefined && (typeof value !== 'string' || value.length > maximum))
  )
    throw ApiError.badRequest(
      `${label} is required and must be no longer than ${maximum} characters.`,
    )
}
function validateList(value, label, required = true) {
  if (
    (required && !Array.isArray(value)) ||
    (value !== undefined &&
      (!Array.isArray(value) ||
        value.length > 50 ||
        value.some((entry) => typeof entry !== 'string' || !entry.trim() || entry.length > 1000)))
  )
    throw ApiError.badRequest(`${label} must be a list of up to 50 text entries.`)
}
function validateOrder(value) {
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 100000))
    throw ApiError.badRequest('Sort order must be a non-negative whole number.')
}

async function validateReferences(db, resource, data, user) {
  if (resource === 'gym-equipment') {
    const type = await db
      .collection('equipmentTypes')
      .findOne({ _id: data.equipmentTypeId, isActive: true, isDemo: { $ne: true } })
    const gym = await db.collection('gyms').findOne({ _id: user.gymId, status: 'active' })
    if (!type || !gym)
      throw ApiError.badRequest('Select an active equipment type for the active gym.')
    data.gymId = user.gymId
  }
  if (
    resource === 'variations' &&
    !(await db.collection('exercises').findOne({
      _id: data.exerciseId,
      isActive: true,
      isDemo: { $ne: true },
    }))
  )
    throw ApiError.badRequest('Select an active parent exercise.')
  if (resource === 'floor-plans') {
    const gym = await db.collection('gyms').findOne({ _id: user.gymId, status: 'active' })
    if (!gym) throw ApiError.badRequest('The active gym could not be found.')
    const image = await db.collection('mediaAssets').findOne({
      _id: data.imageMediaId,
      mediaType: 'image',
      status: 'ready',
      isDemo: { $ne: true },
    })
    if (!image) throw ApiError.badRequest('Select an uploaded image for this floor plan.')
    data.gymId = user.gymId
  }
}

async function validateExerciseMedia(db, data, id) {
  if (!id && data.videoMediaId === undefined) data.videoMediaId = null
  if (!id && data.imageMediaIds === undefined) data.imageMediaIds = []
  if (data.videoMediaId === '') data.videoMediaId = null
  if (data.videoMediaId !== undefined && data.videoMediaId !== null) {
    const video = await db.collection('mediaAssets').findOne({
      _id: data.videoMediaId,
      mediaType: 'video',
      status: 'ready',
      isDemo: { $ne: true },
    })
    if (!video) throw ApiError.badRequest('Select an uploaded MP4 video.')
  }
  if (data.imageMediaIds !== undefined) {
    const ids = data.imageMediaIds
    if (
      !Array.isArray(ids) ||
      ids.length > 10 ||
      ids.some((value) => typeof value !== 'string') ||
      new Set(ids).size !== ids.length
    ) {
      throw ApiError.badRequest('Select up to 10 unique exercise images.')
    }
    if (
      ids.length &&
      (await db.collection('mediaAssets').countDocuments({
        _id: { $in: ids },
        mediaType: 'image',
        status: 'ready',
        isDemo: { $ne: true },
      })) !== ids.length
    )
      throw ApiError.badRequest('Every selected exercise image must be available.')
  } else if (!id) {
    data.imageMediaIds = []
  }
}

async function withExerciseRelationships(db, exercise) {
  const [muscles, equipment] = await Promise.all([
    db
      .collection('exerciseMuscles')
      .find({ exerciseId: String(exercise._id) })
      .toArray(),
    db
      .collection('exerciseEquipment')
      .find({ exerciseId: String(exercise._id) })
      .toArray(),
  ])
  return {
    ...publicRecord(exercise),
    primaryMuscleGroupIds: muscles
      .filter((item) => item.role === 'primary')
      .map((item) => item.muscleGroupId),
    secondaryMuscleGroupIds: muscles
      .filter((item) => item.role === 'secondary')
      .map((item) => item.muscleGroupId),
    equipmentTypeIds: equipment.map((item) => item.equipmentTypeId),
  }
}

module.exports = {
  resources,
  validateMuscleGroupParent,
  validateExerciseMuscleSelection,
  dashboard: async function dashboard(sailsInstance, gymId) {
    const db = dbFor(sailsInstance)
    const [muscleGroups, equipmentTypes, gymEquipment, exercises, variations] = await Promise.all([
      db.collection('muscleGroups').countDocuments({ isActive: true, isDemo: { $ne: true } }),
      db.collection('equipmentTypes').countDocuments({ isActive: true, isDemo: { $ne: true } }),
      db
        .collection('gymEquipment')
        .countDocuments({ gymId, isActive: { $ne: false }, isDemo: { $ne: true } }),
      db.collection('exercises').countDocuments({ isActive: true, isDemo: { $ne: true } }),
      db.collection('exerciseVariations').countDocuments({ isActive: true, isDemo: { $ne: true } }),
    ])
    return { muscleGroups, equipmentTypes, gymEquipment, exercises, variations }
  },
  list: async function list(sailsInstance, resource, user, includeArchived) {
    const item = definition(resource)
    const db = dbFor(sailsInstance)
    const filter = {
      isDemo: { $ne: true },
      ...(includeArchived ? {} : { isActive: { $ne: false } }),
    }
    if (resource === 'gym-equipment' || resource === 'floor-plans') filter.gymId = user.gymId
    const records = await db
      .collection(item.collection)
      .find(filter)
      .sort({ sortOrder: 1, name: 1, displayName: 1 })
      .toArray()
    if (resource === 'exercises')
      return Promise.all(records.map((record) => withExerciseRelationships(db, record)))
    if (resource === 'floor-plans')
      return records.map((record) => {
        const result = publicRecord(record)
        delete result.floorLabel
        return result
      })
    return records.map(resource === 'gym-equipment' ? publicGymEquipment : publicRecord)
  },
  save: async function save(sailsInstance, resource, id, input, user) {
    const item = definition(resource)
    const db = dbFor(sailsInstance)
    if (id) validateId(id, item.label)
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw ApiError.badRequest('A JSON object is required.')
    const data = {}
    for (const field of item.fields) if (Object.hasOwn(input, field)) data[field] = input[field]
    const existing = id
      ? await db.collection(item.collection).findOne({
          _id: id,
          ...(['gym-equipment', 'floor-plans'].includes(resource) ? { gymId: user.gymId } : {}),
        })
      : null
    if (id && !existing) throw ApiError.notFound(`${item.label} not found.`)
    let localized = BilingualContent.normalizeForStorage(
      resource,
      data.translations,
      data,
      existing,
    )
    if (!localized && existing?.translations && BilingualContent.schemas[resource]) {
      const legacyTranslations = {
        'mk-MK': {},
        en: {},
      }
      for (const field of Object.keys(BilingualContent.schemas[resource])) {
        for (const language of ['mk-MK', 'en']) {
          if (Object.hasOwn(existing.translations[language] || {}, field))
            legacyTranslations[language][field] = existing.translations[language][field]
        }
        if (Object.hasOwn(data, field)) {
          legacyTranslations['mk-MK'][field] = data[field]
          legacyTranslations.en[field] = data[field]
        }
      }
      localized = BilingualContent.normalizeForStorage(resource, legacyTranslations, data, existing)
    }
    if (localized)
      Object.assign(data, localized.canonical, { translations: localized.translations })
    if (resource === 'gym-equipment' && existing?.translations && data.translations) {
      for (const language of ['mk-MK', 'en']) {
        for (const field of ['details', 'description']) {
          const legacyValue = existing.translations[language]?.[field]
          if (legacyValue !== undefined) data.translations[language][field] = legacyValue
        }
      }
    }
    for (const field of item.required)
      if (id && !Object.hasOwn(data, field)) continue
      else
        validateText(
          data[field],
          field,
          field === 'summary' ? 700 : field === 'description' ? 1000 : 200,
          true,
        )
    if (resource !== 'gym-equipment' && resource !== 'variations') {
      if (data.sortOrder === undefined && !id) data.sortOrder = 0
      validateOrder(data.sortOrder)
      if (!id) data.slug = createContentSlug(input, resource, data.name)
      if (
        data.slug !== undefined &&
        (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) || data.slug.length > 120)
      )
        throw ApiError.badRequest('Slug must contain lowercase letters, numbers and hyphens.')
      const slugLimit =
        resource === 'muscle-groups' ? 80 : resource === 'equipment-types' ? 100 : 120
      if (data.slug && data.slug.length > slugLimit)
        throw ApiError.badRequest(`Slug must be no longer than ${slugLimit} characters.`)
    }
    if (resource === 'gym-equipment') {
      validateText(data.equipmentTypeId, 'equipmentTypeId', 120)
      validateText(data.displayName, 'displayName', 160)
      if (data.isAvailable !== undefined && typeof data.isAvailable !== 'boolean')
        throw ApiError.badRequest('isAvailable must be true or false.')
      if (!id) data.slug = `gym-${user.gymId}-${crypto.randomUUID()}`
    }
    if (resource === 'floor-plans') {
      validateText(data.name, 'name', 120)
      if (data.sortOrder === undefined && !id) data.sortOrder = 0
      validateOrder(data.sortOrder)
      if (!id) {
        const base = slugify(`${user.gymId}-${input.translations?.en?.name || data.name}`).slice(
          0,
          80,
        )
        data.slug = `${base || 'floor-plan'}-${crypto.randomUUID()}`
      }
    }
    if (resource === 'exercises') {
      if (data.summary !== undefined) validateText(data.summary, 'summary', 700, false)
      for (const [field, label] of [
        ['instructions', 'Instructions'],
        ['benefits', 'Benefits'],
        ['tips', 'Tips'],
        ['commonMistakes', 'Common mistakes'],
      ]) {
        const required = field === 'instructions' && !id
        if (!id && !required && data[field] === undefined) data[field] = []
        validateList(data[field], label, required)
      }
      validateOrder(data.sortOrder)
      if (!id) data.slug = createContentSlug(input, resource, data.name)
      if (data.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))
        throw ApiError.badRequest('Exercise name must produce a valid slug.')
    }
    if (resource === 'variations') {
      validateText(data.exerciseId, 'exerciseId', 120)
      if (!id) data.slug = slugify(input.slug || `${data.exerciseId}-${data.name}`)
      validateText(data.name, 'name', 160)
      validateText(data.description, 'description', 500)
      validateList(data.instructions, 'Instructions', !id)
      if (data.sortOrder === undefined && !id) data.sortOrder = 0
      validateOrder(data.sortOrder)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))
        throw ApiError.badRequest('Variation name must produce a valid slug.')
    }
    if (id) {
      if (resource === 'gym-equipment') data.gymId = user.gymId
      if (resource === 'exercises') {
        data.slug = existing.slug
      }
      if (resource === 'variations') {
        data.slug = existing.slug
        data.exerciseId = existing.exerciseId
      }
      if (resource === 'floor-plans') {
        data.gymId = user.gymId
        if (data.imageMediaId === undefined) data.imageMediaId = existing.imageMediaId
        data.slug = existing.slug
      }
    } else {
      data.isActive = true
      data.createdAt = Date.now()
    }
    if (resource === 'muscle-groups') await validateMuscleGroupParent(db, id, data)
    await validateReferences(db, resource, data, user)
    let exerciseMuscleIds = null
    let exerciseEquipmentIds = null
    let existingMuscles = []
    if (resource === 'exercises') {
      existingMuscles = id
        ? await db.collection('exerciseMuscles').find({ exerciseId: id }).toArray()
        : []
      const existingEquipment = id
        ? await db.collection('exerciseEquipment').find({ exerciseId: id }).toArray()
        : []
      const primaryIds =
        input.primaryMuscleGroupIds ??
        existingMuscles
          .filter((entry) => entry.role === 'primary')
          .map((entry) => entry.muscleGroupId)
      const secondaryIds =
        input.secondaryMuscleGroupIds ??
        existingMuscles
          .filter((entry) => entry.role === 'secondary')
          .map((entry) => entry.muscleGroupId)
      exerciseEquipmentIds =
        input.equipmentTypeIds ?? existingEquipment.map((entry) => entry.equipmentTypeId)
      exerciseMuscleIds = validateExerciseMuscleSelection(primaryIds, secondaryIds)
      if (
        (await db.collection('muscleGroups').countDocuments({
          _id: { $in: exerciseMuscleIds.map((entry) => entry.muscleGroupId) },
          isActive: true,
          isDemo: { $ne: true },
        })) !== exerciseMuscleIds.length
      )
        throw ApiError.badRequest('Every selected muscle group must be active.')
      if (
        !Array.isArray(exerciseEquipmentIds) ||
        exerciseEquipmentIds.some((value) => typeof value !== 'string') ||
        new Set(exerciseEquipmentIds).size !== exerciseEquipmentIds.length
      )
        throw ApiError.badRequest('Equipment selections must be unique valid IDs.')
      if (
        exerciseEquipmentIds.length &&
        (await db.collection('equipmentTypes').countDocuments({
          _id: { $in: exerciseEquipmentIds },
          isActive: true,
          isDemo: { $ne: true },
        })) !== exerciseEquipmentIds.length
      )
        throw ApiError.badRequest('Every selected equipment type must be active.')
    }
    const persist = async () => {
      if (resource === 'exercises') await validateExerciseMedia(db, data, id)
      if (resource === 'floor-plans') await validateReferences(db, resource, data, user)
      data.updatedAt = Date.now()
      const key = id || data.slug || `${data.gymId}-${data.equipmentTypeId}-${crypto.randomUUID()}`
      data.isDemo = false
      await db
        .collection(item.collection)
        .updateOne({ _id: key }, { $set: data, $setOnInsert: { _id: key } }, { upsert: !id })
      if (resource === 'exercises') {
        await db.collection('exerciseMuscles').deleteMany({ exerciseId: key })
        await db.collection('exerciseMuscles').insertMany(
          exerciseMuscleIds.map(({ muscleGroupId, role }) => ({
            _id: `${key}--${muscleGroupId}--${role}`,
            exerciseId: key,
            muscleGroupId,
            role,
            isDemo: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })),
        )
        await db.collection('exerciseEquipment').deleteMany({ exerciseId: key })
        if (exerciseEquipmentIds.length)
          await db.collection('exerciseEquipment').insertMany(
            exerciseEquipmentIds.map((equipmentTypeId) => ({
              _id: `${key}--${equipmentTypeId}`,
              exerciseId: key,
              equipmentTypeId,
              isDemo: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })),
          )
      }
      const saved = await db.collection(item.collection).findOne({ _id: key })
      if (resource === 'exercises') return withExerciseRelationships(db, saved)
      const result = resource === 'gym-equipment' ? publicGymEquipment(saved) : publicRecord(saved)
      if (resource === 'floor-plans') delete result.floorLabel
      return result
    }
    return ['exercises', 'floor-plans'].includes(resource)
      ? mediaReferenceLock.run(persist)
      : persist()
  },
  archive: async function archive(sailsInstance, resource, id, user, active) {
    const item = definition(resource)
    const db = dbFor(sailsInstance)
    validateId(id, item.label)
    if (resource === 'muscle-groups' && !active) {
      const activeChildren = await db.collection('muscleGroups').countDocuments({
        parentId: id,
        isActive: { $ne: false },
      })
      if (activeChildren)
        throw ApiError.conflict('Reassign active child muscle groups before archiving this group.')
    }
    const result = await db.collection(item.collection).updateOne(
      {
        _id: id,
        ...(['gym-equipment', 'floor-plans'].includes(resource) ? { gymId: user.gymId } : {}),
      },
      { $set: { isActive: active, updatedAt: Date.now() } },
    )
    if (!result.matchedCount) throw ApiError.notFound(`${item.label} not found.`)
    return { id, isActive: active }
  },
}
