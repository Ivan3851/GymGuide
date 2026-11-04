import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { localizeApiError } from './api-error.js'
import { localizeEquipmentUnit, localizeRecord } from './content.js'
import { setLocale, useLocale } from './locale.js'
import { messages } from './messages.js'

test('English and Macedonian provide the same translation keys', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['mk-MK']).sort())
})

test('member and admin interface copy contains no demo labels or sample-data warnings', () => {
  for (const locale of Object.values(messages)) {
    assert.equal(
      Object.values(locale).some((value) => /demo|демо/i.test(value)),
      false,
    )
  }
})

test('the default locale is Macedonian and can switch in the current session', () => {
  const { locale, t } = useLocale()
  assert.equal(locale.value, 'mk-MK')
  assert.equal(t('home.start'), messages['mk-MK']['home.start'])
  setLocale('en')
  assert.equal(locale.value, 'en')
  assert.equal(t('home.start'), messages.en['home.start'])
  setLocale('mk-MK')
})

test('switching languages leaves the active route and selected record intact', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/exercises/:id', name: 'exercise', component: { template: '<div />' } }],
  })
  await router.push('/exercises/chest-press?machine=press-a')
  const selectedExercise = router.currentRoute.value.params.id
  const selectedMachine = router.currentRoute.value.query.machine

  setLocale('en')

  const { t } = useLocale()
  assert.equal(t('admin.gymEquipment'), 'Physical Equipment')
  assert.equal(t('admin.floorPlans'), 'Floor Plans')

  assert.equal(router.currentRoute.value.fullPath, '/exercises/chest-press?machine=press-a')
  assert.equal(router.currentRoute.value.params.id, selectedExercise)
  assert.equal(router.currentRoute.value.query.machine, selectedMachine)
  setLocale('mk-MK')
  assert.equal(t('admin.gymEquipment'), 'Опрема во теретаната')
  assert.equal(t('admin.floorPlans'), 'План на просторот')
})

test('member content uses the selected translation and falls back without modifying the source', () => {
  const bilingual = {
    isDemo: false,
    name: 'Chest press',
    summary: 'Legacy summary',
    translations: {
      'mk-MK': { name: 'Потисок за гради' },
      en: { name: 'Chest press', summary: 'Press from a seated position.' },
    },
  }
  const macedonian = localizeRecord(bilingual, 'mk-MK', 'exercise')
  const english = localizeRecord(bilingual, 'en', 'exercise')

  assert.equal(macedonian.name, 'Потисок за гради')
  assert.equal(macedonian.summary, 'Press from a seated position.')
  assert.equal(english.summary, 'Press from a seated position.')
  assert.equal(bilingual.summary, 'Legacy summary')
})

test('gym-authored translations are selected without fabricated translations', () => {
  const authored = {
    slug: 'leg-press',
    isDemo: false,
    name: 'My gym name',
    description: 'Original single-language description',
    translations: { 'mk-MK': { name: 'Gym entered name' } },
  }
  const localized = localizeRecord(authored, 'mk-MK', 'equipment')
  assert.equal(localized.name, 'Gym entered name')
  assert.equal(localized.description, 'Original single-language description')
  assert.equal(authored.name, 'My gym name')
})

test('equipment retains its authored unit label and localizes the linked equipment type', () => {
  const unit = localizeEquipmentUnit(
    {
      isDemo: false,
      displayName: 'Leg station by the window',
      equipmentTypeName: 'Leg press',
      equipmentType: {
        slug: 'leg-press',
        name: 'Leg press',
        isDemo: false,
        translations: {
          'mk-MK': { name: 'Потисок со нозе' },
          en: { name: 'Leg press' },
        },
      },
    },
    'mk-MK',
  )

  assert.equal(unit.displayName, 'Leg station by the window')
  assert.equal(unit.equipmentTypeName, 'Потисок со нозе')
})

test('floor names and physical equipment names localize with existing-field fallback', () => {
  const floor = {
    name: 'Главна сала',
    translations: { 'mk-MK': { name: 'Главна сала' }, en: { name: 'Main gym' } },
  }
  assert.equal(localizeRecord(floor, 'mk-MK', 'floorPlan').name, 'Главна сала')
  assert.equal(localizeRecord(floor, 'en', 'floorPlan').name, 'Main gym')

  const unit = localizeEquipmentUnit(
    {
      displayName: 'Преса до прозорец',
      translations: {
        'mk-MK': { displayName: 'Преса до прозорец' },
        en: { displayName: 'Press by window' },
      },
      equipmentType: {
        name: 'Chest press',
        translations: { 'mk-MK': { name: 'Преса за гради' }, en: { name: 'Chest press' } },
      },
    },
    'en',
  )
  assert.equal(unit.displayName, 'Press by window')
  assert.equal('details' in unit, false)
  assert.equal('description' in unit, false)
  assert.equal(unit.equipmentTypeName, 'Chest press')
})

test('physical equipment localization ignores legacy descriptions without mutating source data', () => {
  const legacy = {
    displayName: 'Legacy press',
    details: 'Old detail',
    description: 'Old description',
    translations: {
      'mk-MK': { displayName: 'Стара преса', details: 'Стар детаљ', description: 'Стар опис' },
      en: { displayName: 'Legacy press', details: 'Old detail', description: 'Old description' },
    },
  }
  const localized = localizeEquipmentUnit(legacy, 'en')
  assert.equal(localized.displayName, 'Legacy press')
  assert.equal('details' in localized, false)
  assert.equal('description' in localized, false)
  assert.equal('details' in localized.translations.en, false)
  assert.equal(legacy.details, 'Old detail')
})

test('API failures use localized messages by status', () => {
  assert.equal(
    localizeApiError({ status: 401 }, (key) => key),
    'errors.unauthorized',
  )
  assert.equal(
    localizeApiError({ status: 503 }, (key) => key),
    'errors.server',
  )
  assert.equal(
    localizeApiError(new Error('offline'), (key) => key),
    'errors.generic',
  )
})
