<script setup>
import { computed, nextTick, reactive, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { createAdminRecord, getAdmin, setAdminRecordArchived, updateAdminRecord } from '@/api/admin'
import { adminResourceDefinitions } from '@/admin/admin-resource-definitions'
import { selectPrimaryMuscle } from '@/admin/exercise-muscle-selection'
import { useLocale } from '@/localization/locale'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeRecord } from '@/localization/content'
import { createLatestRequest } from '@/composables/latest-request'

const route = useRoute()
const { t, locale } = useLocale()
const resource = computed(() => route.params.resource)
const definition = computed(() => adminResourceDefinitions[resource.value])
const records = ref([])
const options = reactive({
  'equipment-types': [],
  exercises: [],
  'muscle-groups': [],
  images: [],
  videos: [],
})
const loading = ref(false)
const error = ref('')
const notice = ref('')
const includeArchived = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const selectedExercise = ref('')
const form = reactive({})
const formPanel = ref(null)
const latestRequest = createLatestRequest()
const isExercise = computed(() => resource.value === 'exercises')
const availableMuscleParents = computed(() => {
  const groups = options['muscle-groups']
  const excluded = new Set()
  if (resource.value === 'muscle-groups' && editingId.value) {
    const queue = [editingId.value]
    while (queue.length) {
      const currentId = queue.shift()
      if (excluded.has(currentId)) continue
      excluded.add(currentId)
      for (const group of groups) if (group.parentId === currentId) queue.push(group.id)
    }
  }
  return groups.filter((group) => !excluded.has(group.id))
})
const shownRecords = computed(() =>
  resource.value === 'variations' && selectedExercise.value
    ? records.value.filter((record) => record.exerciseId === selectedExercise.value)
    : records.value,
)

function isLocalizedField(type) {
  return type?.startsWith('localized-')
}

function inputValue(value, type) {
  if (type === 'localized-list') return Array.isArray(value) ? value.join('\n') : ''
  return typeof value === 'string' ? value : ''
}

function localizationKind(resourceName = resource.value) {
  if (resourceName === 'muscle-groups') return 'muscle'
  if (resourceName === 'equipment-types') return 'equipment'
  if (resourceName === 'variations') return 'variation'
  if (resourceName === 'exercises') return 'exercise'
  if (resourceName === 'gym-equipment') return 'gymEquipment'
  if (resourceName === 'floor-plans') return 'floorPlan'
  return 'catalog'
}

function localizedRecord(record, resourceName = resource.value) {
  return localizeRecord(record, locale.value, localizationKind(resourceName))
}

function recordLanguageValue(record, language, field) {
  const otherLanguage = language === 'mk-MK' ? 'en' : 'mk-MK'
  if (Object.hasOwn(record.translations?.[language] || {}, field))
    return record.translations[language][field]
  if (['gym-equipment', 'floor-plans'].includes(resource.value)) {
    if (record.translations || language === 'en') return ''
    return record[field]
  }
  const localizedRecord = localizeRecord(record, language, localizationKind())
  const candidates = [
    record.translations?.[otherLanguage]?.[field],
    localizedRecord[field],
    record[field],
  ]
  return candidates.find((value) =>
    Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim(),
  )
}

function blankForm() {
  Object.keys(form).forEach((key) => delete form[key])
  form.translations = { 'mk-MK': {}, en: {} }
  for (const [name, , type] of definition.value?.fields || []) {
    if (isLocalizedField(type)) {
      form.translations['mk-MK'][name] = ''
      form.translations.en[name] = ''
    } else form[name] = type === 'checkbox' ? true : type === 'number' ? 0 : ''
  }
  form.primaryMuscleGroupIds = []
  form.secondaryMuscleGroupIds = []
  form.equipmentTypeIds = []
  form.videoMediaId = ''
  form.imageMediaIds = []
}

function toForm(record) {
  blankForm()
  for (const [field, , type] of definition.value.fields) {
    if (isLocalizedField(type)) {
      for (const language of ['mk-MK', 'en']) {
        form.translations[language][field] = inputValue(
          recordLanguageValue(record, language, field),
          type,
        )
      }
      continue
    }
    const value = record[field]
    form[field] =
      type === 'list' ? (value || []).join('\n') : (value ?? (type === 'checkbox' ? true : ''))
  }
  if (isExercise.value) {
    form.primaryMuscleGroupIds = record.primaryMuscleGroupIds || []
    form.secondaryMuscleGroupIds = [...new Set(record.secondaryMuscleGroupIds || [])].filter(
      (id) => id !== form.primaryMuscleGroupIds[0],
    )
    form.equipmentTypeIds = record.equipmentTypeIds || []
    form.videoMediaId = record.videoMediaId || ''
    form.imageMediaIds = record.imageMediaIds || []
  }
}

function clearOptions() {
  options['equipment-types'] = []
  options.exercises = []
  options['muscle-groups'] = []
  options.images = []
  options.videos = []
}

async function load(resourceName = resource.value) {
  loading.value = true
  error.value = ''
  const result = await latestRequest.run(async (signal) => {
    const loadedRecords = await getAdmin(
      `${resourceName}?includeArchived=${includeArchived.value}`,
      { signal },
    )
    const jobs = []
    const loadedOptions = {
      'equipment-types': [],
      exercises: [],
      'muscle-groups': [],
      images: [],
      videos: [],
    }
    if (resourceName === 'gym-equipment' || resourceName === 'exercises')
      jobs.push(
        getAdmin('equipment-types', { signal }).then((value) => {
          loadedOptions['equipment-types'] = value
        }),
      )
    if (resourceName === 'exercises')
      jobs.push(
        getAdmin('muscle-groups', { signal }).then((value) => {
          loadedOptions['muscle-groups'] = value
        }),
      )
    if (resourceName === 'muscle-groups')
      jobs.push(
        getAdmin('muscle-groups?includeArchived=true', { signal }).then((value) => {
          loadedOptions['muscle-groups'] = value
        }),
      )
    if (resourceName === 'variations')
      jobs.push(
        getAdmin('exercises', { signal }).then((value) => {
          loadedOptions.exercises = value
        }),
      )
    if (resourceName === 'exercises' || resourceName === 'floor-plans')
      jobs.push(
        getAdmin('media', { signal }).then((value) => {
          loadedOptions.images = value.filter((asset) => asset.mediaType === 'image')
          loadedOptions.videos = value.filter((asset) => asset.mediaType === 'video')
        }),
      )
    await Promise.all(jobs)
    return { records: loadedRecords, options: loadedOptions }
  })
  if (!result.current) return
  if (result.error) {
    error.value = apiErrorMessageKey(result.error)
  } else {
    records.value = result.value.records
    Object.assign(options, result.value.options)
  }
  loading.value = false
}

function startCreate() {
  editingId.value = null
  blankForm()
  notice.value = ''
  error.value = ''
}
function startEdit(record) {
  editingId.value = record.id
  toForm(record)
  notice.value = ''
  error.value = ''
  nextTick(() => {
    formPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    formPanel.value?.querySelector('input:not([type="checkbox"]), textarea, select')?.focus({
      preventScroll: true,
    })
  })
}
function cancelEdit() {
  editingId.value = null
  blankForm()
}
function toggle(field, id) {
  const values = form[field]
  form[field] = values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
}
function changePrimaryMuscle(id) {
  const selection = selectPrimaryMuscle(id, form.secondaryMuscleGroupIds)
  form.primaryMuscleGroupIds = selection.primaryIds
  form.secondaryMuscleGroupIds = selection.secondaryIds
}
function payload() {
  const result = {}
  result.translations = { 'mk-MK': {}, en: {} }
  for (const [field, , type] of definition.value.fields) {
    if (isLocalizedField(type)) {
      for (const language of ['mk-MK', 'en']) {
        const value = form.translations[language][field]
        result.translations[language][field] =
          type === 'localized-list'
            ? value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            : value
      }
      const macedonianValue = result.translations['mk-MK'][field]
      const englishValue = result.translations.en[field]
      const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value.trim()))
      result[field] = hasValue(macedonianValue) ? macedonianValue : englishValue
      continue
    }
    const value = form[field]
    result[field] =
      type === 'list'
        ? value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : type === 'number'
          ? Number(value)
          : type === 'optional-select'
            ? value || null
            : value
  }
  if (isExercise.value)
    Object.assign(result, {
      primaryMuscleGroupIds: form.primaryMuscleGroupIds,
      secondaryMuscleGroupIds: form.secondaryMuscleGroupIds,
      equipmentTypeIds: form.equipmentTypeIds,
      videoMediaId: form.videoMediaId || null,
      imageMediaIds: form.imageMediaIds,
    })
  return result
}

async function save() {
  submitting.value = true
  error.value = ''
  notice.value = ''
  try {
    const data = payload()
    if (editingId.value) await updateAdminRecord(resource.value, editingId.value, data)
    else await createAdminRecord(resource.value, data)
    notice.value = editingId.value ? 'admin.recordSaved' : 'admin.recordAdded'
    editingId.value = null
    blankForm()
    await load()
  } catch (requestError) {
    error.value = apiErrorMessageKey(requestError)
  } finally {
    submitting.value = false
  }
}

async function toggleArchived(record) {
  error.value = ''
  notice.value = ''
  try {
    await setAdminRecordArchived(resource.value, record.id, record.isActive !== false)
    notice.value = record.isActive === false ? 'admin.recordRestored' : 'admin.recordArchived'
    await load()
  } catch (requestError) {
    error.value = apiErrorMessageKey(requestError)
  }
}

function recordName(record) {
  const localized = localizedRecord(record)
  return localized.name || localized.displayName || record.displayName
}
function recordDescription(record) {
  const localized = localizedRecord(record)
  return localized.description || localized.summary
}
function optionName(kind, id) {
  const option = (options[kind] || []).find((item) => item.id === id)
  return (option && localizedRecord(option, localizationKind(kind)))?.name || id
}
function selectLabel(kind, option) {
  if (kind === 'images') return option.originalName
  const name = localizedRecord(option, localizationKind(kind)).name
  if (kind !== 'muscle-groups' || !option.parentId) return name
  return `${name} · ${t('admin.childOf', { parent: optionName(kind, option.parentId) })}`
}
function mediaName(id) {
  return [...options.images, ...options.videos].find((asset) => asset.id === id)?.originalName || id
}

watch(
  [resource, includeArchived],
  ([resourceName], [previousResource]) => {
    latestRequest.cancel()
    if (resourceName !== previousResource) {
      startCreate()
      selectedExercise.value = ''
      records.value = []
      clearOptions()
    }
    load(resourceName)
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => latestRequest.cancel())
</script>

<template>
  <section v-if="definition">
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">{{ t('admin.content') }}</p>
        <h1>{{ t(definition.titleKey) }}</h1>
        <p class="admin-muted">{{ t('admin.manageDescription') }}</p>
      </div>
      <button class="admin-button admin-button-primary" @click="startCreate">
        + {{ t('admin.addRecord') }}
      </button>
    </div>
    <p v-if="notice" class="admin-success" role="status">{{ t(notice) }}</p>
    <p v-if="error" class="admin-alert" role="alert">{{ t(error) }}</p>
    <div class="admin-resource-workspace">
      <div
        ref="formPanel"
        class="admin-panel admin-form-panel"
        :class="{ 'admin-form-editing': editingId }"
      >
        <div class="admin-form-heading">
          <div>
            <h2>{{ editingId ? t('admin.editRecord') : t('admin.addRecord') }}</h2>
            <p v-if="editingId" class="admin-editing-record">
              {{ recordName(records.find((record) => record.id === editingId) || {}) }}
            </p>
          </div>
          <button v-if="editingId" class="admin-button admin-button-quiet" @click="cancelEdit">
            {{ t('admin.cancel') }}
          </button>
        </div>
        <form class="admin-form-grid" @submit.prevent="save">
          <template v-for="[field, labelKey, type, optionKind] in definition.fields" :key="field">
            <fieldset
              v-if="isLocalizedField(type)"
              class="admin-field-wide localized-content-field"
            >
              <legend>{{ t(labelKey) }}</legend>
              <label>
                {{ t('admin.macedonianVersion') }}
                <textarea
                  v-if="type === 'localized-textarea' || type === 'localized-list'"
                  v-model="form.translations['mk-MK'][field]"
                  :rows="type === 'localized-list' ? 4 : 3"
                /><input v-else v-model="form.translations['mk-MK'][field]" type="text" />
              </label>
              <label>
                {{ t('admin.englishVersion') }}
                <textarea
                  v-if="type === 'localized-textarea' || type === 'localized-list'"
                  v-model="form.translations.en[field]"
                  :rows="type === 'localized-list' ? 4 : 3"
                /><input v-else v-model="form.translations.en[field]" type="text" />
              </label>
            </fieldset>
            <label v-else :class="type === 'textarea' || type === 'list' ? 'admin-field-wide' : ''">
              <template v-if="type === 'checkbox'"
                ><span>{{ t(labelKey) }}</span
                ><input v-model="form[field]" type="checkbox"
              /></template>
              <template v-else-if="type === 'select' || type === 'optional-select'"
                ><span>{{ t(labelKey) }}</span
                ><select v-model="form[field]" :required="type === 'select'">
                  <option v-if="type === 'optional-select'" value="">
                    {{ t('admin.noParent') }}
                  </option>
                  <option v-else disabled value="">{{ t('admin.choose') }}</option>
                  <option
                    v-for="option in type === 'optional-select'
                      ? availableMuscleParents
                      : options[optionKind]"
                    :key="option.id"
                    :value="option.id"
                    :disabled="option.isActive === false"
                  >
                    {{ selectLabel(optionKind, option) }}
                  </option>
                </select></template
              >
              <template v-else
                ><span>{{ t(labelKey) }}</span
                ><textarea
                  v-if="type === 'textarea' || type === 'list'"
                  v-model="form[field]"
                  :required="type === 'list' || ['description', 'summary'].includes(field)"
                  :rows="type === 'list' ? 4 : 3" /><input
                  v-else
                  v-model="form[field]"
                  :type="type === 'number' ? 'number' : 'text'"
                  :required="['name', 'summary'].includes(field)"
                  :min="type === 'number' ? 0 : undefined"
              /></template>
            </label>
          </template>
          <template v-if="isExercise">
            <label class="admin-field-wide"
              ><span>{{ t('admin.instructionalVideo') }}</span
              ><select v-model="form.videoMediaId">
                <option value="">{{ t('admin.noVideo') }}</option>
                <option v-for="asset in options.videos" :key="asset.id" :value="asset.id">
                  {{ asset.originalName }}
                </option>
              </select></label
            >
            <fieldset class="admin-field-wide">
              <legend>{{ t('admin.exerciseImages') }}</legend>
              <label v-for="asset in options.images" :key="asset.id" class="admin-check-option"
                ><input v-model="form.imageMediaIds" type="checkbox" :value="asset.id" />{{
                  asset.originalName
                }}</label
              >
              <p v-if="!options.images.length" class="admin-muted">
                {{ t('admin.uploadImagesFirst') }}
              </p>
            </fieldset>
            <label
              ><span>{{ t('admin.primaryMuscle') }}</span
              ><select
                :value="form.primaryMuscleGroupIds[0] || ''"
                required
                @change="changePrimaryMuscle($event.target.value)"
              >
                <option disabled value="">{{ t('admin.chooseOne') }}</option>
                <option
                  v-for="option in options['muscle-groups']"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ optionName('muscle-groups', option.id) }}
                </option>
              </select></label
            >
            <fieldset>
              <legend>{{ t('admin.secondaryMuscles') }}</legend>
              <label
                v-for="option in options['muscle-groups']"
                v-show="option.id !== form.primaryMuscleGroupIds[0]"
                :key="option.id"
                class="admin-check-option"
                ><input
                  type="checkbox"
                  :checked="form.secondaryMuscleGroupIds.includes(option.id)"
                  @change="toggle('secondaryMuscleGroupIds', option.id)"
                />{{ optionName('muscle-groups', option.id) }}</label
              >
            </fieldset>
            <fieldset class="admin-field-wide">
              <legend>{{ t('admin.supportedEquipment') }}</legend>
              <label
                v-for="option in options['equipment-types']"
                :key="option.id"
                class="admin-check-option"
                ><input
                  type="checkbox"
                  :checked="form.equipmentTypeIds.includes(option.id)"
                  @change="toggle('equipmentTypeIds', option.id)"
                />{{ optionName('equipment-types', option.id) }}</label
              >
            </fieldset>
          </template>
          <div class="admin-form-actions admin-field-wide">
            <button class="admin-button admin-button-primary" type="submit" :disabled="submitting">
              {{
                submitting
                  ? t('admin.saving')
                  : editingId
                    ? t('admin.saveChanges')
                    : t('admin.addRecord')
              }}
            </button>
          </div>
        </form>
      </div>
      <div class="admin-resource-list-area">
        <div class="admin-list-toolbar">
          <label class="admin-check-option"
            ><input v-model="includeArchived" type="checkbox" />{{
              t('admin.includeArchived')
            }}</label
          ><label v-if="resource === 'variations'"
            >{{ t('admin.filterExercise')
            }}<select v-model="selectedExercise">
              <option value="">{{ t('admin.allExercises') }}</option>
              <option v-for="exercise in options.exercises" :key="exercise.id" :value="exercise.id">
                {{ exercise.name }}
              </option>
            </select></label
          >
        </div>
        <p v-if="loading" class="admin-message" role="status">{{ t('admin.loadingRecords') }}</p>
        <div v-else-if="!shownRecords.length" class="admin-panel admin-message">
          {{ t('admin.emptyRecords') }}
        </div>
        <div v-else class="admin-record-list">
          <article v-for="record in shownRecords" :key="record.id" class="admin-record-card">
            <div class="admin-record-copy">
              <div class="admin-record-title">
                <h3>{{ recordName(record) }}</h3>
                <span
                  class="admin-status"
                  :class="record.isActive === false ? 'admin-status-archived' : ''"
                  >{{ record.isActive === false ? t('admin.archived') : t('admin.active') }}</span
                >
              </div>
              <p v-if="recordDescription(record)" class="admin-muted">
                {{ recordDescription(record) }}
              </p>
              <p v-if="resource === 'gym-equipment'" class="admin-meta">
                {{ optionName('equipment-types', record.equipmentTypeId) }} ·
                {{ record.isAvailable ? t('admin.availableStatus') : t('admin.unavailableStatus') }}
              </p>
              <p v-if="resource === 'muscle-groups' && record.parentId" class="admin-meta">
                {{ t('admin.childOf', { parent: optionName('muscle-groups', record.parentId) }) }}
              </p>
              <p v-if="resource === 'variations'" class="admin-meta">
                {{
                  t('admin.forExercise', { exercise: optionName('exercises', record.exerciseId) })
                }}
              </p>
              <p v-if="resource === 'floor-plans'" class="admin-meta">
                {{ t('admin.image') }}:
                {{ mediaName(record.imageMediaId) }}
              </p>
              <p v-if="isExercise" class="admin-meta">
                {{
                  record.primaryMuscleGroupIds
                    .map((id) => optionName('muscle-groups', id))
                    .join(', ')
                }}
                ·
                {{
                  record.equipmentTypeIds.map((id) => optionName('equipment-types', id)).join(', ')
                }}
              </p>
            </div>
            <div class="admin-record-actions">
              <button class="admin-button" @click="startEdit(record)">{{ t('admin.edit') }}</button
              ><RouterLink
                v-if="resource === 'floor-plans'"
                class="admin-button"
                :to="`/admin/floor-plans/${encodeURIComponent(record.id)}/edit`"
                >{{ t('admin.positionsAction') }}</RouterLink
              ><button
                class="admin-button"
                :class="record.isActive === false ? 'admin-button-primary' : 'admin-button-danger'"
                @click="toggleArchived(record)"
              >
                {{ record.isActive === false ? t('admin.restore') : t('admin.archive') }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
  <section v-else class="admin-panel">
    <h1>{{ t('admin.unknownSection') }}</h1>
    <RouterLink to="/admin/dashboard">{{ t('admin.returnDashboard') }}</RouterLink>
  </section>
</template>
