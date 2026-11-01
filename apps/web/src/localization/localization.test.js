import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { localizeApiError } from './api-error.js'
import { localizeEquipmentUnit, localizeRecord } from './demo-content.js'
import { setLocale, useLocale } from './locale.js'
import { messages } from './messages.js'

test('English and Macedonian provide the same translation keys', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['mk-MK']).sort())
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

  assert.equal(router.currentRoute.value.fullPath, '/exercises/chest-press?machine=press-a')
  assert.equal(router.currentRoute.value.params.id, selectedExercise)
  assert.equal(router.currentRoute.value.query.machine, selectedMachine)
  setLocale('mk-MK')
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

test('demo equipment localization uses a separate slug namespace', () => {
  const equipment = localizeRecord(
    { slug: 'leg-press', isDemo: true, name: 'Leg press machine' },
    'mk-MK',
    'equipment',
  )
  const exercise = localizeRecord(
    { slug: 'leg-press', isDemo: true, name: 'Leg press' },
    'mk-MK',
    'exercise',
  )

  assert.equal(equipment.name, 'Машина за потисок со нозе')
  assert.equal(exercise.name, 'Потисок со нозе')
})

test('gym-authored translations are selected without demo or automatic translations', () => {
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

test('demo equipment unit labels use the translated equipment type', () => {
  const unit = localizeEquipmentUnit(
    { isDemo: true, equipmentTypeId: 'leg-press', displayName: 'Leg press 1' },
    'mk-MK',
  )
  assert.equal(unit.equipmentTypeName, 'Машина за потисок со нозе')
})

test('gym equipment retains its authored label and localizes its linked equipment type', () => {
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
