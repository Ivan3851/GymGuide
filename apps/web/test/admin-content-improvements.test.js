import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { adminResourceDefinitions } from '../src/admin/admin-resource-definitions.js'
import { buildExerciseDirectoryGroups } from '../src/directory/exercise-directory.js'
import { messages } from '../src/localization/messages.js'

test('admin equipment and floor-plan routes share centralized bilingual heading keys', () => {
  assert.equal(adminResourceDefinitions['gym-equipment'].titleKey, 'admin.gymEquipment')
  assert.equal(adminResourceDefinitions['floor-plans'].titleKey, 'admin.floorPlans')
  assert.equal(messages.en['admin.gymEquipment'], 'Physical Equipment')
  assert.equal(messages.en['admin.floorPlans'], 'Floor Plans')
  assert.equal(messages['mk-MK']['admin.gymEquipment'], 'Опрема во теретаната')
  assert.equal(messages['mk-MK']['admin.floorPlans'], 'План на просторот')
  const equipmentFields = adminResourceDefinitions['gym-equipment'].fields
  assert.deepEqual(
    equipmentFields.filter(([field]) => ['displayName', 'details'].includes(field)),
    [['displayName', 'admin.name', 'localized-text']],
  )
  assert.deepEqual(
    adminResourceDefinitions['floor-plans'].fields.find(([field]) => field === 'name'),
    ['name', 'admin.name', 'localized-text'],
  )
  assert.equal(
    adminResourceDefinitions['gym-equipment'].fields.some(([field]) => field === 'details'),
    false,
  )
})

test('display order remains a manual numeric field without auto-order helpers or duplicate restrictions', async () => {
  const resourceView = await readFile(
    new URL('../src/views/admin/AdminResourceView.vue', import.meta.url),
    'utf8',
  )
  const definitions = adminResourceDefinitions['muscle-groups'].fields
  assert.deepEqual(
    definitions.find(([field]) => field === 'sortOrder'),
    ['sortOrder', 'admin.sortOrder', 'number'],
  )
  assert.doesNotMatch(
    resourceView,
    /nextDisplayOrder|availableDisplayOrders|isDisplayOrderUsed|orderRecords/,
  )
  assert.match(resourceView, /:type="type === 'number' \? 'number' : 'text'"/)
})

test('exercise directory parent filtering follows only primary descendant groups and de-duplicates exercises', () => {
  const result = buildExerciseDirectoryGroups(
    {
      muscleGroups: [
        { id: 'chest', name: 'Chest' },
        { id: 'upper', name: 'Upper chest', parentId: 'chest' },
        { id: 'lower', name: 'Lower chest', parentId: 'chest' },
        { id: 'back', name: 'Back' },
      ],
      topLevelMuscleGroups: [
        { id: 'chest', name: 'Chest' },
        { id: 'back', name: 'Back' },
      ],
      exercises: [
        { id: 'press', primaryMuscleGroup: { id: 'upper' }, primaryGroupRootId: 'chest' },
        { id: 'fly', primaryMuscleGroup: { id: 'lower' }, primaryGroupRootId: 'chest' },
        { id: 'row', primaryMuscleGroup: { id: 'back' }, primaryGroupRootId: 'back' },
      ],
    },
    'chest',
  )
  assert.deepEqual(
    result.map((group) => group.muscleGroup.id),
    ['upper', 'lower'],
  )
  assert.deepEqual(
    result.flatMap((group) => group.exercises.map((exercise) => exercise.id)),
    ['press', 'fly'],
  )
})

test('muscle selection carries its parent ID through equipment navigation and retries', async () => {
  const muscleView = await readFile(
    new URL('../src/views/MuscleGroupView.vue', import.meta.url),
    'utf8',
  )
  const equipmentView = await readFile(
    new URL('../src/views/EquipmentView.vue', import.meta.url),
    'utf8',
  )
  const catalogApi = await readFile(new URL('../src/api/catalog.js', import.meta.url), 'utf8')
  assert.match(muscleView, /query: \{ fromMuscle: data\.muscleGroup\.id \}/)
  assert.match(equipmentView, /getEquipmentExercises\(id, groupId\)/)
  assert.match(equipmentView, /load\(\{ equipmentId, muscleGroupId \}\)/)
  assert.match(catalogApi, /muscleGroupId=\$\{encodeURIComponent\(muscleGroupId\)\}/)
})

test('floor labels are absent and optional exercise content uses empty-safe member rendering', async () => {
  const resourceView = await readFile(
    new URL('../src/views/admin/AdminResourceView.vue', import.meta.url),
    'utf8',
  )
  const exerciseView = await readFile(
    new URL('../src/views/ExerciseView.vue', import.meta.url),
    'utf8',
  )
  const definitions = await readFile(
    new URL('../src/admin/admin-resource-definitions.js', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(definitions, /floorLabel|admin\.floorLabel/)
  assert.doesNotMatch(
    await readFile(new URL('../src/localization/messages.js', import.meta.url), 'utf8'),
    /floorLabel|floor\.unnamed|unnamedFloor/,
  )
  assert.match(resourceView, /:required="\['name', 'summary'\]\.includes\(field\)"/)
  assert.match(exerciseView, /v-if="exercise\.benefits\?\.length"/)
  assert.match(exerciseView, /v-if="exercise\.tips\?\.length"/)
  assert.match(exerciseView, /v-if="exercise\.commonMistakes\?\.length"/)
  assert.match(exerciseView, /:description="exercise\?\.summary \|\| ''"/)
})

test('physical equipment descriptions are absent from admin and member displays', async () => {
  const resourceView = await readFile(
    new URL('../src/views/admin/AdminResourceView.vue', import.meta.url),
    'utf8',
  )
  const mapView = await readFile(new URL('../src/views/GymMapView.vue', import.meta.url), 'utf8')
  const exerciseMap = await readFile(
    new URL('../src/components/exercise/ExerciseFloorPlan.vue', import.meta.url),
    'utf8',
  )
  const adminMap = await readFile(
    new URL('../src/views/admin/AdminFloorPlanEditorView.vue', import.meta.url),
    'utf8',
  )
  const localizer = await readFile(
    new URL('../src/localization/content.js', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(resourceView, /localized\.details|record\.details/)
  assert.doesNotMatch(mapView, /localizedEquipment\.details/)
  assert.doesNotMatch(exerciseMap, /gymEquipment\.details/)
  assert.doesNotMatch(adminMap, /gymEquipment\.details/)
  assert.match(localizer, /delete safeUnit\.details/)
  assert.match(localizer, /delete safeUnit\.description/)
})
