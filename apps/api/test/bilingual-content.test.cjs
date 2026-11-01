const assert = require('node:assert/strict')
const test = require('node:test')
const AdminService = require('../api/services/AdminService')
const BilingualContent = require('../api/services/BilingualContent')
const CatalogService = require('../api/services/CatalogService')

test('all bilingual content models accept a JSON translations map', () => {
  for (const model of ['MuscleGroup', 'EquipmentType', 'Exercise', 'ExerciseVariation']) {
    const schema = require(`../api/models/${model}`)
    assert.equal(schema.attributes.translations.type, 'json')
  }
})

function makeSails() {
  const collections = new Map()
  const db = {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new Map())
      const documents = collections.get(name)
      return {
        async findOne(filter) {
          return documents.get(filter._id) || null
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
