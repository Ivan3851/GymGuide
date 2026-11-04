const assert = require('node:assert/strict')
const test = require('node:test')
const AdminService = require('../api/services/AdminService')
const BilingualContent = require('../api/services/BilingualContent')
const CatalogService = require('../api/services/CatalogService')

test('all bilingual content models accept a JSON translations map', () => {
  for (const model of [
    'MuscleGroup',
    'EquipmentType',
    'Exercise',
    'ExerciseVariation',
    'GymEquipment',
    'GymFloorPlan',
  ]) {
    const schema = require(`../api/models/${model}`)
    assert.equal(schema.attributes.translations.type, 'json')
  }
})

function makeSails() {
  const collections = new Map()
  function matches(document, filter = {}) {
    return Object.entries(filter).every(([key, expected]) => {
      if (key === '$or') return expected.some((part) => matches(document, part))
      const actual = document[key]
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if ('$ne' in expected && actual === expected.$ne) return false
        if ('$in' in expected && !expected.$in.includes(actual)) return false
        if ('$exists' in expected && (actual !== undefined) !== expected.$exists) return false
        return true
      }
      return actual === expected
    })
  }
  const db = {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new Map())
      const documents = collections.get(name)
      return {
        async findOne(filter) {
          return [...documents.values()].find((document) => matches(document, filter)) || null
        },
        find(filter = {}) {
          return {
            sort() {
              return this
            },
            toArray: async () =>
              [...documents.values()].filter((document) => matches(document, filter)),
          }
        },
        async countDocuments(filter = {}) {
          return [...documents.values()].filter((document) => matches(document, filter)).length
        },
        async updateOne(filter, update, options = {}) {
          const previous = documents.get(filter._id)
          if (!previous && !options.upsert) return { matchedCount: 0 }
          const document = {
            ...(previous || update.$setOnInsert || {}),
            ...update.$set,
            _id: filter._id,
          }
          documents.set(filter._id, document)
          return { matchedCount: previous ? 1 : 0, upsertedCount: previous ? 0 : 1 }
        },
        async insertOne(document) {
          if (documents.has(document._id)) {
            const error = new Error('Duplicate key')
            error.code = 11000
            throw error
          }
          documents.set(document._id, document)
          return { insertedId: document._id }
        },
        async insertMany(items) {
          for (const document of items) documents.set(document._id, document)
          return { insertedCount: items.length }
        },
        async deleteOne(filter) {
          const document = [...documents.values()].find((candidate) => matches(candidate, filter))
          if (!document) return { deletedCount: 0 }
          documents.delete(document._id)
          return { deletedCount: 1 }
        },
        async deleteMany(filter) {
          const matchesToDelete = [...documents.values()].filter((document) =>
            matches(document, filter),
          )
          for (const document of matchesToDelete) documents.delete(document._id)
          return { deletedCount: matchesToDelete.length }
        },
      }
    },
  }
  return { hooks: { orm: { datastores: { default: { manager: { client: { db: () => db } } } } } } }
}

test('admin create and read stores bilingual muscle group content', async () => {
  const sails = makeSails()
  const created = await AdminService.save(
    sails,
    'muscle-groups',
    null,
    {
      translations: {
        'mk-MK': { name: 'Гради', description: 'Група на мускули.' },
        en: { name: 'Chest', description: 'A muscle group.' },
      },
      sortOrder: 0,
    },
    { gymId: 'demo-gym' },
  )

  assert.equal(created.name, 'Гради')
  assert.equal(created.translations.en.name, 'Chest')
  assert.equal(BilingualContent.contentForLocale(created, 'muscle-groups', 'en').name, 'Chest')
  assert.equal(BilingualContent.contentForLocale(created, 'muscle-groups', 'mk-MK').name, 'Гради')
})

test('Macedonian-only creation receives a valid slug when no English slug can be generated', async () => {
  const created = await AdminService.save(
    makeSails(),
    'muscle-groups',
    null,
    {
      translations: {
        'mk-MK': { name: 'Гради', description: 'Група на мускули.' },
        en: { name: '', description: '' },
      },
    },
    { gymId: 'demo-gym' },
  )

  assert.match(created.slug, /^muscle-groups-[0-9a-f-]{36}$/)
  assert.equal(created.name, 'Гради')
})

test('admin update preserves the other language when only one translation changes', async () => {
  const sails = makeSails()
  const user = { gymId: 'demo-gym' }
  const created = await AdminService.save(
    sails,
    'muscle-groups',
    null,
    {
      translations: {
        'mk-MK': { name: 'Гради', description: 'Стара содржина.' },
        en: { name: 'Chest', description: 'Old content.' },
      },
    },
    user,
  )
  const updated = await AdminService.save(
    sails,
    'muscle-groups',
    created.id,
    { translations: { 'mk-MK': { name: 'Градни мускули' } } },
    user,
  )

  assert.equal(updated.translations['mk-MK'].name, 'Градни мускули')
  assert.equal(updated.translations.en.name, 'Chest')
  assert.equal(updated.translations['mk-MK'].description, 'Стара содржина.')
  assert.equal(updated.translations.en.description, 'Old content.')

  const legacyUpdated = await AdminService.save(
    sails,
    'muscle-groups',
    created.id,
    { name: 'Updated by a legacy client' },
    user,
  )
  assert.equal(legacyUpdated.translations['mk-MK'].name, 'Updated by a legacy client')
  assert.equal(legacyUpdated.translations.en.name, 'Updated by a legacy client')
})

test('member catalog read responses retain bilingual fields for client-side language switching', async () => {
  const record = {
    _id: 'chest',
    slug: 'chest',
    name: 'Гради',
    description: 'Група на мускули.',
    translations: {
      'mk-MK': { name: 'Гради', description: 'Група на мускули.' },
      en: { name: 'Chest', description: 'A muscle group.' },
    },
  }
  const db = {
    collection() {
      return {
        find() {
          return {
            sort() {
              return this
            },
            async toArray() {
              return [record]
            },
          }
        },
      }
    },
  }
  const sails = {
    hooks: { orm: { datastores: { default: { manager: { client: { db: () => db } } } } } },
  }

  const [memberRecord] = await CatalogService.listMuscleGroups(sails)

  assert.equal(memberRecord.name, 'Гради')
  assert.equal(memberRecord.translations.en.name, 'Chest')
  assert.equal(BilingualContent.contentForLocale(memberRecord, 'muscle-groups', 'en').name, 'Chest')
})

test('legacy single-language records remain readable with a language fallback', () => {
  const legacy = { id: 'chest', name: 'Chest', description: 'Existing description' }
  assert.equal(BilingualContent.contentForLocale(legacy, 'muscle-groups', 'mk-MK').name, 'Chest')
  assert.equal(legacy.translations, undefined)
})

test('legacy create and edit requests remain supported and old text becomes the missing translation fallback', async () => {
  const sails = makeSails()
  const user = { gymId: 'demo-gym' }
  const legacy = await AdminService.save(
    sails,
    'equipment-types',
    null,
    { name: 'Leg press', description: 'Existing equipment description.' },
    user,
  )
  const updated = await AdminService.save(
    sails,
    'equipment-types',
    legacy.id,
    {
      translations: {
        'mk-MK': { name: 'Потисок со нозе', description: 'Постоечки опис за опремата.' },
      },
    },
    user,
  )

  assert.equal(legacy.translations, undefined)
  assert.equal(updated.translations['mk-MK'].name, 'Потисок со нозе')
  assert.equal(updated.translations.en.name, 'Leg press')
  assert.equal(updated.translations.en.description, 'Existing equipment description.')
})

test('exercise and variation instructions and guidance arrays are stored per language', () => {
  const exercise = BilingualContent.normalizeForStorage(
    'exercises',
    {
      'mk-MK': {
        name: 'Потисок',
        summary: 'Краток опис.',
        instructions: ['Седнете.'],
        benefits: ['Контрола.'],
        tips: ['Дишете.'],
        commonMistakes: ['Не брзајте.'],
      },
      en: {
        name: 'Press',
        summary: 'Short summary.',
        instructions: ['Sit down.'],
        benefits: ['Control.'],
        tips: ['Breathe.'],
        commonMistakes: ['Do not rush.'],
      },
    },
    {},
  )
  const variation = BilingualContent.normalizeForStorage(
    'variations',
    {
      'mk-MK': { name: 'Тесен фат', description: 'Потесна положба.', instructions: ['Фатете.'] },
      en: {
        name: 'Close grip',
        description: 'Use a narrower hand position.',
        instructions: ['Grip.'],
      },
    },
    {},
  )

  assert.deepEqual(exercise.translations.en.instructions, ['Sit down.'])
  assert.deepEqual(exercise.translations['mk-MK'].commonMistakes, ['Не брзајте.'])
  assert.deepEqual(variation.canonical.instructions, ['Фатете.'])
  assert.deepEqual(
    BilingualContent.contentForLocale(
      { ...variation.canonical, translations: variation.translations },
      'variations',
      'en',
    ).instructions,
    ['Grip.'],
  )
})

test('new content requires a value in at least one language and validates each language', () => {
  assert.throws(
    () =>
      BilingualContent.normalizeForStorage(
        'equipment-types',
        { 'mk-MK': { name: '', description: '' }, en: { name: '', description: '' } },
        {},
      ),
    /at least one language/,
  )
  assert.throws(
    () =>
      BilingualContent.normalizeForStorage(
        'equipment-types',
        { 'mk-MK': { name: 'Име', description: '' }, en: { name: 42, description: '' } },
        {},
      ),
    /must be text/,
  )
})

test('display-order values remain manually assignable, including duplicate values', async () => {
  const sails = makeSails()
  const user = { gymId: 'gym-one' }
  const createMuscle = (name, sortOrder, parentId = null) =>
    AdminService.save(
      sails,
      'muscle-groups',
      null,
      {
        name,
        description: `${name} group`,
        parentId,
        ...(sortOrder === undefined ? {} : { sortOrder }),
      },
      user,
    )
  const chest = await createMuscle('Chest', 7)
  const back = await createMuscle('Back', 7)
  assert.equal(chest.sortOrder, 7)
  assert.equal(back.sortOrder, 7)
  const preserved = await AdminService.save(
    sails,
    'muscle-groups',
    back.id,
    { name: 'Back updated', description: 'Updated description' },
    user,
  )
  assert.equal(preserved.sortOrder, 7)
  const moved = await AdminService.save(sails, 'muscle-groups', back.id, { sortOrder: 9 }, user)
  assert.equal(moved.sortOrder, 9)
})

test('floor names and physical equipment names are bilingual without exposing legacy descriptions', async () => {
  const sails = makeSails()
  const db = sails.hooks.orm.datastores.default.manager.client.db()
  const gyms = db.collection('gyms')
  const assets = db.collection('mediaAssets')
  const muscles = db.collection('muscleGroups')
  await gyms.insertOne({ _id: 'gym-one', status: 'active' })
  await assets.insertOne({ _id: 'floor-image', mediaType: 'image', status: 'ready' })
  await muscles.insertOne({ _id: 'chest', isActive: true })

  const planCollection = db.collection('gymFloorPlans')
  await planCollection.insertOne({
    _id: 'legacy-floor',
    slug: 'legacy-floor',
    gymId: 'gym-one',
    name: 'Стара сала',
    floorLabel: 'Legacy label',
    imageMediaId: 'floor-image',
    sortOrder: 3,
    isActive: true,
  })
  const updatedFloor = await AdminService.save(
    sails,
    'floor-plans',
    'legacy-floor',
    {
      translations: { 'mk-MK': { name: 'Стара сала' }, en: { name: 'Main gym' } },
    },
    { gymId: 'gym-one' },
  )
  assert.equal(
    BilingualContent.contentForLocale(updatedFloor, 'floor-plans', 'en').name,
    'Main gym',
  )
  assert.equal((await planCollection.findOne({ _id: 'legacy-floor' })).name, 'Стара сала')
  assert.equal((await planCollection.findOne({ _id: 'legacy-floor' })).floorLabel, 'Legacy label')
  assert.equal(Object.hasOwn(updatedFloor, 'floorLabel'), false)
  assert.equal(Object.hasOwn(require('../api/models/GymFloorPlan').attributes, 'floorLabel'), false)
  assert.equal(
    (await AdminService.list(sails, 'floor-plans', { gymId: 'gym-one' }, true))[0].floorLabel,
    undefined,
  )

  const floor = await AdminService.save(
    sails,
    'floor-plans',
    null,
    {
      translations: { 'mk-MK': { name: 'Главна сала' }, en: { name: 'Main level' } },
      imageMediaId: 'floor-image',
    },
    { gymId: 'gym-one' },
  )
  assert.equal(BilingualContent.contentForLocale(floor, 'floor-plans', 'en').name, 'Main level')

  const equipmentTypes = db.collection('equipmentTypes')
  await equipmentTypes.insertOne({ _id: 'press-type', isActive: true, isDemo: false })
  const unit = await AdminService.save(
    sails,
    'gym-equipment',
    null,
    {
      equipmentTypeId: 'press-type',
      isAvailable: true,
      translations: {
        'mk-MK': { displayName: 'Преса до прозорец' },
        en: { displayName: 'Press by window' },
      },
    },
    { gymId: 'gym-one' },
  )
  assert.equal(unit.displayName, 'Преса до прозорец')
  assert.equal(
    BilingualContent.contentForLocale(unit, 'gym-equipment', 'en').displayName,
    'Press by window',
  )
  assert.equal(BilingualContent.contentForLocale(unit, 'gym-equipment', 'en').details, undefined)
  assert.equal(Object.hasOwn(require('../api/models/GymEquipment').attributes, 'details'), false)
  assert.equal(Object.hasOwn(BilingualContent.schemas['gym-equipment'], 'details'), false)

  const legacyUnitCollection = db.collection('gymEquipment')
  await legacyUnitCollection.insertOne({
    _id: 'legacy-unit',
    slug: 'legacy-unit',
    gymId: 'gym-one',
    equipmentTypeId: 'press-type',
    displayName: 'Стара машина',
    details: 'Постоечки детали.',
    description: 'Legacy physical description.',
    translations: {
      'mk-MK': { displayName: 'Стара машина', details: 'Стари детали.' },
      en: { displayName: 'Legacy machine', description: 'Legacy translated description.' },
    },
    isAvailable: true,
    isActive: true,
  })
  const updatedLegacyUnit = await AdminService.save(
    sails,
    'gym-equipment',
    'legacy-unit',
    {
      equipmentTypeId: 'press-type',
      displayName: 'Стара машина',
      isAvailable: false,
    },
    { gymId: 'gym-one' },
  )
  const preservedLegacyUnit = await legacyUnitCollection.findOne({ _id: 'legacy-unit' })
  assert.equal(preservedLegacyUnit.displayName, 'Стара машина')
  assert.equal(preservedLegacyUnit.details, 'Постоечки детали.')
  assert.equal(preservedLegacyUnit.description, 'Legacy physical description.')
  assert.equal(preservedLegacyUnit.isAvailable, false)
  assert.equal(Object.hasOwn(preservedLegacyUnit.translations['mk-MK'], 'details'), true)
  assert.equal(Object.hasOwn(updatedLegacyUnit, 'details'), false)
  assert.equal(Object.hasOwn(updatedLegacyUnit, 'description'), false)
  assert.equal(Object.hasOwn(updatedLegacyUnit.translations.en, 'details'), false)
  assert.equal(Object.hasOwn(unit, 'details'), false)
  assert.equal(Object.hasOwn(unit.translations.en, 'details'), false)
  const publicLegacyUnit = (
    await AdminService.list(sails, 'gym-equipment', { gymId: 'gym-one' })
  )[0]
  assert.equal(Object.hasOwn(publicLegacyUnit, 'details'), false)
  assert.equal(Object.hasOwn(publicLegacyUnit, 'description'), false)
  assert.equal(Object.hasOwn(publicLegacyUnit.translations['mk-MK'], 'details'), false)

  const minimalExercise = {
    translations: {
      'mk-MK': {
        name: 'Потисок',
        instructions: ['Седнете.'],
        summary: '',
        benefits: [],
        tips: [],
        commonMistakes: [],
      },
      en: {
        name: 'Press',
        instructions: ['Sit down.'],
        summary: '',
        benefits: [],
        tips: [],
        commonMistakes: [],
      },
    },
    primaryMuscleGroupIds: ['chest'],
    secondaryMuscleGroupIds: [],
    equipmentTypeIds: [],
  }
  const exercise = await AdminService.save(sails, 'exercises', null, minimalExercise, {
    gymId: 'gym-one',
  })
  assert.equal(exercise.summary, '')
  assert.deepEqual(exercise.benefits, [])
  assert.deepEqual(exercise.tips, [])
  assert.deepEqual(exercise.commonMistakes, [])

  const populated = await AdminService.save(
    sails,
    'exercises',
    exercise.id,
    {
      translations: {
        'mk-MK': { benefits: ['Стабилност.'], tips: ['Дишете.'], commonMistakes: ['Не брзајте.'] },
        en: { benefits: ['Stability.'], tips: ['Breathe.'], commonMistakes: ['Do not rush.'] },
      },
    },
    { gymId: 'gym-one' },
  )
  assert.deepEqual(populated.benefits, ['Стабилност.'])
  const unchanged = await AdminService.save(
    sails,
    'exercises',
    exercise.id,
    { translations: { 'mk-MK': { name: 'Потисок изменет' } } },
    { gymId: 'gym-one' },
  )
  assert.deepEqual(unchanged.benefits, ['Стабилност.'])
  const cleared = await AdminService.save(
    sails,
    'exercises',
    exercise.id,
    {
      translations: {
        'mk-MK': { benefits: [], tips: [], commonMistakes: [] },
        en: { benefits: [], tips: [], commonMistakes: [] },
      },
    },
    { gymId: 'gym-one' },
  )
  assert.deepEqual(cleared.benefits, [])
})
