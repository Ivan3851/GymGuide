<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createAdminRecord, getAdmin, setAdminRecordArchived, updateAdminRecord } from '@/api/admin'

const definitions = {
  'muscle-groups': {
    title: 'Muscle groups',
    fields: [
      ['name', 'Name'],
      ['description', 'Description', 'textarea'],
      ['sortOrder', 'Sort order', 'number'],
    ],
  },
  'equipment-types': {
    title: 'Equipment types',
    fields: [
      ['name', 'Name'],
      ['description', 'Description', 'textarea'],
      ['sortOrder', 'Sort order', 'number'],
    ],
  },
  'gym-equipment': {
    title: 'Gym equipment',
    fields: [
      ['equipmentTypeId', 'Equipment type', 'select', 'equipment-types'],
      ['displayName', 'Display name'],
      ['details', 'Details', 'textarea'],
      ['isAvailable', 'Available', 'checkbox'],
    ],
  },
  exercises: {
    title: 'Exercises',
    fields: [
      ['name', 'Name'],
      ['summary', 'Summary', 'textarea'],
      ['instructions', 'Instructions (one per line)', 'list'],
      ['benefits', 'Benefits (one per line)', 'list'],
      ['tips', 'Tips (one per line)', 'list'],
      ['commonMistakes', 'Common mistakes (one per line)', 'list'],
      ['sortOrder', 'Sort order', 'number'],
    ],
  },
  variations: {
    title: 'Exercise variations',
    fields: [
      ['exerciseId', 'Parent exercise', 'select', 'exercises'],
      ['name', 'Name'],
      ['description', 'Description', 'textarea'],
      ['instructions', 'Instructions (one per line)', 'list'],
      ['sortOrder', 'Sort order', 'number'],
    ],
  },
  'floor-plans': {
    title: 'Floor plans',
    fields: [
      ['name', 'Name'],
      ['floorLabel', 'Floor label'],
      ['imageMediaId', 'Floor plan image', 'select', 'images'],
      ['sortOrder', 'Sort order', 'number'],
    ],
  },
}

const route = useRoute()
const resource = computed(() => route.params.resource)
const definition = computed(() => definitions[resource.value])
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
const isExercise = computed(() => resource.value === 'exercises')
const shownRecords = computed(() =>
  resource.value === 'variations' && selectedExercise.value
    ? records.value.filter((record) => record.exerciseId === selectedExercise.value)
    : records.value,
)

function blankForm() {
  Object.keys(form).forEach((key) => delete form[key])
  for (const [name, , type] of definition.value?.fields || [])
    form[name] = type === 'checkbox' ? true : type === 'number' ? 0 : ''
  form.instructions ??= ''
  form.benefits ??= ''
  form.tips ??= ''
  form.commonMistakes ??= ''
  form.primaryMuscleGroupIds = []
  form.secondaryMuscleGroupIds = []
  form.equipmentTypeIds = []
  form.videoMediaId = ''
  form.imageMediaIds = []
}

function toForm(record) {
  blankForm()
  for (const [field, , type] of definition.value.fields) {
    const value = record[field]
    form[field] =
      type === 'list' ? (value || []).join('\n') : (value ?? (type === 'checkbox' ? true : ''))
  }
  if (isExercise.value) {
    form.primaryMuscleGroupIds = record.primaryMuscleGroupIds || []
    form.secondaryMuscleGroupIds = record.secondaryMuscleGroupIds || []
    form.equipmentTypeIds = record.equipmentTypeIds || []
    form.videoMediaId = record.videoMediaId || ''
    form.imageMediaIds = record.imageMediaIds || []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    records.value = await getAdmin(`${resource.value}?includeArchived=${includeArchived.value}`)
    const jobs = []
    if (resource.value === 'gym-equipment' || resource.value === 'exercises')
      jobs.push(
        getAdmin('equipment-types').then((value) => {
          options['equipment-types'] = value
        }),
      )
    if (resource.value === 'exercises')
      jobs.push(
        getAdmin('muscle-groups').then((value) => {
          options['muscle-groups'] = value
        }),
      )
    if (resource.value === 'variations')
      jobs.push(
        getAdmin('exercises').then((value) => {
          options.exercises = value
        }),
      )
    if (resource.value === 'exercises' || resource.value === 'floor-plans')
      jobs.push(
        getAdmin('media').then((value) => {
          options.images = value.filter((asset) => asset.mediaType === 'image')
          options.videos = value.filter((asset) => asset.mediaType === 'video')
        }),
      )
    await Promise.all(jobs)
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
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
}
function cancelEdit() {
  editingId.value = null
  blankForm()
}
function toggle(field, id) {
  const values = form[field]
  form[field] = values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
}
function payload() {
  const result = {}
  for (const [field, , type] of definition.value.fields) {
    const value = form[field]
    result[field] =
      type === 'list'
        ? value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : type === 'number'
          ? Number(value)
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
    notice.value = editingId.value ? 'Changes saved.' : 'Record added.'
    editingId.value = null
    blankForm()
    await load()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    submitting.value = false
  }
}

async function toggleArchived(record) {
  error.value = ''
  notice.value = ''
  try {
    await setAdminRecordArchived(resource.value, record.id, record.isActive !== false)
    notice.value = record.isActive === false ? 'Record restored.' : 'Record archived.'
    await load()
  } catch (requestError) {
    error.value = requestError.message
  }
}

function recordName(record) {
  return record.name || record.displayName
}
function optionName(kind, id) {
  return (options[kind] || []).find((item) => item.id === id)?.name || id
}
function selectLabel(kind, option) {
  return kind === 'images' ? option.originalName : option.name
}
function mediaName(id) {
  return [...options.images, ...options.videos].find((asset) => asset.id === id)?.originalName || id
}

watch(resource, () => {
  startCreate()
  selectedExercise.value = ''
  load()
})
watch(includeArchived, load)
onMounted(() => {
  blankForm()
  load()
})
</script>

<template>
  <section v-if="definition">
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">Content</p>
        <h1>{{ definition.title }}</h1>
        <p class="admin-muted">Manage reusable catalog content and this demo gym's inventory.</p>
      </div>
      <button class="admin-button admin-button-primary" @click="startCreate">
        + Add {{ definition.title.replace(/s$/, '').toLowerCase() }}
      </button>
    </div>
    <p v-if="notice" class="admin-success" role="status">{{ notice }}</p>
    <p v-if="error" class="admin-alert" role="alert">{{ error }}</p>
    <div class="admin-panel admin-form-panel">
      <div class="admin-form-heading">
        <h2>{{ editingId ? 'Edit record' : 'Add record' }}</h2>
        <button v-if="editingId" class="admin-button admin-button-quiet" @click="cancelEdit">
          Cancel edit
        </button>
      </div>
      <form class="admin-form-grid" @submit.prevent="save">
        <label
          v-for="[field, label, type, optionKind] in definition.fields"
          :key="field"
          :class="type === 'textarea' || type === 'list' ? 'admin-field-wide' : ''"
        >
          <template v-if="type === 'checkbox'"
            ><span>{{ label }}</span
            ><input v-model="form[field]" type="checkbox"
          /></template>
          <template v-else-if="type === 'select'"
            ><span>{{ label }}</span
            ><select v-model="form[field]" required>
              <option disabled value="">Choose…</option>
              <option v-for="option in options[optionKind]" :key="option.id" :value="option.id">
                {{ selectLabel(optionKind, option) }}
              </option>
            </select></template
          >
          <template v-else
            ><span>{{ label }}</span
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
        <template v-if="isExercise">
          <label class="admin-field-wide"
            ><span>Instructional video</span
            ><select v-model="form.videoMediaId">
              <option value="">No video</option>
              <option v-for="asset in options.videos" :key="asset.id" :value="asset.id">
                {{ asset.originalName }}
              </option>
            </select></label
          >
          <fieldset class="admin-field-wide">
            <legend>Exercise images</legend>
            <label v-for="asset in options.images" :key="asset.id" class="admin-check-option"
              ><input v-model="form.imageMediaIds" type="checkbox" :value="asset.id" />{{
                asset.originalName
              }}</label
            >
            <p v-if="!options.images.length" class="admin-muted">
              Upload images in Media library first.
            </p>
          </fieldset>
          <label
            ><span>Primary muscle group</span
            ><select v-model="form.primaryMuscleGroupIds[0]" required>
              <option disabled value="">Choose one…</option>
              <option
                v-for="option in options['muscle-groups']"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }}
              </option>
            </select></label
          >
          <fieldset>
            <legend>Secondary muscle groups</legend>
            <label
              v-for="option in options['muscle-groups']"
              :key="option.id"
              class="admin-check-option"
              ><input
                type="checkbox"
                :checked="form.secondaryMuscleGroupIds.includes(option.id)"
                @change="toggle('secondaryMuscleGroupIds', option.id)"
              />{{ option.name }}</label
            >
          </fieldset>
          <fieldset class="admin-field-wide">
            <legend>Supported equipment types</legend>
            <label
              v-for="option in options['equipment-types']"
              :key="option.id"
              class="admin-check-option"
              ><input
                type="checkbox"
                :checked="form.equipmentTypeIds.includes(option.id)"
                @change="toggle('equipmentTypeIds', option.id)"
              />{{ option.name }}</label
            >
          </fieldset>
        </template>
        <div class="admin-form-actions admin-field-wide">
          <button class="admin-button admin-button-primary" type="submit" :disabled="submitting">
            {{ submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add record' }}
          </button>
        </div>
      </form>
    </div>
    <div class="admin-list-toolbar">
      <label class="admin-check-option"
        ><input v-model="includeArchived" type="checkbox" />Include archived</label
      ><label v-if="resource === 'variations'"
        >Filter by exercise<select v-model="selectedExercise">
          <option value="">All exercises</option>
          <option v-for="exercise in options.exercises" :key="exercise.id" :value="exercise.id">
            {{ exercise.name }}
          </option>
        </select></label
      >
    </div>
    <p v-if="loading" class="admin-message">Loading records…</p>
    <div v-else-if="!shownRecords.length" class="admin-panel admin-message">
      No records found. Add the first one above.
    </div>
    <div v-else class="admin-record-list">
      <article v-for="record in shownRecords" :key="record.id" class="admin-record-card">
        <div class="admin-record-copy">
          <div class="admin-record-title">
            <h3>{{ recordName(record) }}</h3>
            <span
              class="admin-status"
              :class="record.isActive === false ? 'admin-status-archived' : ''"
              >{{ record.isActive === false ? 'Archived' : 'Active' }}</span
            >
          </div>
          <p v-if="record.description || record.summary || record.details" class="admin-muted">
            {{ record.description || record.summary || record.details }}
          </p>
          <p v-if="resource === 'gym-equipment'" class="admin-meta">
            {{ optionName('equipment-types', record.equipmentTypeId) }} ·
            {{ record.isAvailable ? 'Available' : 'Unavailable' }}
          </p>
          <p v-if="resource === 'variations'" class="admin-meta">
            For {{ optionName('exercises', record.exerciseId) }}
          </p>
          <p v-if="resource === 'floor-plans'" class="admin-meta">
            {{ record.floorLabel }} · Image: {{ mediaName(record.imageMediaId) }}
          </p>
          <p v-if="isExercise" class="admin-meta">
            {{
              record.primaryMuscleGroupIds.map((id) => optionName('muscle-groups', id)).join(', ')
            }}
            ·
            {{ record.equipmentTypeIds.map((id) => optionName('equipment-types', id)).join(', ') }}
          </p>
        </div>
        <div class="admin-record-actions">
          <button class="admin-button" @click="startEdit(record)">Edit</button
          ><RouterLink
            v-if="resource === 'floor-plans'"
            class="admin-button"
            :to="`/admin/floor-plans/${encodeURIComponent(record.id)}/edit`"
            >Positions</RouterLink
          ><button
            class="admin-button"
            :class="record.isActive === false ? 'admin-button-primary' : 'admin-button-danger'"
            @click="toggleArchived(record)"
          >
            {{ record.isActive === false ? 'Restore' : 'Archive' }}
          </button>
        </div>
      </article>
    </div>
  </section>
  <section v-else class="admin-panel">
    <h1>Unknown content section</h1>
    <RouterLink to="/admin/dashboard">Return to dashboard</RouterLink>
  </section>
</template>
