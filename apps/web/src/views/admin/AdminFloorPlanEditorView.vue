<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  deleteAdminFloorPlanMarker,
  getAdmin,
  getAdminFloorPlanMarkers,
  saveAdminFloorPlanMarker,
} from '@/api/admin'
import { useLocale } from '@/localization/locale'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeEquipmentUnit, localizeRecord } from '@/localization/content'

const route = useRoute()
const { locale, t } = useLocale()
const plans = ref([])
const equipment = ref([])
const markers = ref([])
const planId = ref(String(route.params.id || ''))
const placementId = ref('')
const selectedEquipmentId = ref('')
const draggingId = ref('')
const positionX = ref('')
const positionY = ref('')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const imageAspectRatio = ref(null)
const plan = computed(() => plans.value.find((item) => item.id === planId.value))
const localizedPlans = computed(() =>
  plans.value.map((item) => ({ ...item, ...localizeRecord(item, locale.value, 'floorPlan') })),
)
const localizedPlan = computed(() => localizedPlans.value.find((item) => item.id === planId.value))
const localizedMarkers = computed(() =>
  markers.value.map((marker) => ({
    ...marker,
    gymEquipment: localizeEquipmentUnit(marker.gymEquipment, locale.value),
  })),
)
const localizedInventory = computed(() =>
  equipment.value.map((unit) => localizeEquipmentUnit(unit, locale.value)),
)
const selectedMarker = computed(
  () =>
    localizedMarkers.value.find((marker) => marker.gymEquipment.id === selectedEquipmentId.value) ||
    null,
)
const availableEquipment = computed(() =>
  localizedInventory.value.filter(
    (unit) => !markers.value.some((marker) => marker.gymEquipment.id === unit.id),
  ),
)

async function load() {
  error.value = ''
  try {
    const [allPlans, allEquipment, allMedia, allEquipmentTypes] = await Promise.all([
      getAdmin('floor-plans?includeArchived=true'),
      getAdmin('gym-equipment?includeArchived=true'),
      getAdmin('media'),
      getAdmin('equipment-types?includeArchived=true'),
    ])
    plans.value = allPlans.map((item) => ({
      ...item,
      image: allMedia.find((asset) => asset.id === item.imageMediaId),
    }))
    const typeById = new Map(allEquipmentTypes.map((item) => [item.id, item]))
    equipment.value = allEquipment
      .filter((unit) => unit.isActive !== false)
      .map((unit) => ({ ...unit, equipmentType: typeById.get(unit.equipmentTypeId) }))
    if (!planId.value) planId.value = plans.value.find((item) => item.isActive !== false)?.id || ''
    await loadMarkers()
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  }
}
async function loadMarkers() {
  if (!planId.value) {
    markers.value = []
    return
  }
  try {
    markers.value = await getAdminFloorPlanMarkers(planId.value)
    if (!markers.value.some((marker) => marker.gymEquipment.id === selectedEquipmentId.value))
      selectedEquipmentId.value = markers.value[0]?.gymEquipment.id || ''
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  }
}
function selectMarker(marker) {
  selectedEquipmentId.value = marker.gymEquipment.id
  positionX.value = String(marker.x)
  positionY.value = String(marker.y)
}
function coordinates(event) {
  const rect = event.currentTarget.querySelector('img').getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  }
}
function setImageAspectRatio(event) {
  const image = event.currentTarget
  if (image.naturalWidth > 0 && image.naturalHeight > 0)
    imageAspectRatio.value = image.naturalWidth / image.naturalHeight
}
watch(
  selectedMarker,
  (marker) => {
    positionX.value = marker ? String(marker.x) : ''
    positionY.value = marker ? String(marker.y) : ''
  },
  { immediate: true },
)
async function place(event) {
  if (!placementId.value || draggingId.value) return
  const position = coordinates(event)
  await save(placementId.value, position)
  placementId.value = ''
}
function startDrag(event, id) {
  draggingId.value = id
  const marker = markers.value.find((item) => item.gymEquipment.id === id)
  if (marker) selectMarker(marker)
  event.currentTarget.setPointerCapture(event.pointerId)
}
function moveDrag(event) {
  if (!draggingId.value) return
  const position = coordinates(event)
  const marker = markers.value.find((item) => item.gymEquipment.id === draggingId.value)
  if (marker) Object.assign(marker, position)
  if (marker) {
    positionX.value = String(position.x)
    positionY.value = String(position.y)
  }
}
async function endDrag(event) {
  if (!draggingId.value) return
  const id = draggingId.value
  const frame = event.currentTarget.closest('.floor-editor-frame') || event.currentTarget
  const rect = frame.querySelector('img').getBoundingClientRect()
  const position = {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  }
  draggingId.value = ''
  await save(id, position)
}
async function save(equipmentId, position) {
  saving.value = true
  error.value = ''
  try {
    await saveAdminFloorPlanMarker(planId.value, equipmentId, position)
    notice.value = 'admin.markerSaved'
    await loadMarkers()
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
    await loadMarkers()
  } finally {
    saving.value = false
  }
}
async function saveSelectedPosition() {
  const x = Number(positionX.value)
  const y = Number(positionY.value)
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    error.value = 'admin.markerRangeError'
    return
  }
  await save(selectedEquipmentId.value, { x, y })
}
async function remove(marker) {
  error.value = ''
  try {
    await deleteAdminFloorPlanMarker(planId.value, marker.gymEquipment.id)
    notice.value = 'admin.markerRemoved'
    await loadMarkers()
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  }
}
watch(planId, loadMarkers)
onMounted(load)
</script>

<template>
  <section>
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">{{ t('admin.floorEyebrow') }}</p>
        <h1>{{ t('admin.floorTitle') }}</h1>
        <p class="admin-muted">{{ t('admin.floorDescription') }}</p>
      </div>
      <RouterLink class="admin-button" to="/admin/content/floor-plans">{{
        t('admin.manageFloorPlans')
      }}</RouterLink>
    </div>
    <p v-if="error" class="admin-alert" role="alert">{{ t(error) }}</p>
    <p v-if="notice" class="admin-success" role="status">{{ t(notice) }}</p>
    <div class="admin-panel floor-editor-controls">
      <label
        >{{ t('admin.floorSelect')
        }}<select v-model="planId">
          <option value="" disabled>{{ t('admin.selectFloor') }}</option>
          <option v-for="item in localizedPlans" :key="item.id" :value="item.id">
            {{ item.name }}{{ item.isActive === false ? t('floor.archived') : '' }}
          </option>
        </select></label
      ><label
        >{{ t('admin.placeEquipment')
        }}<select
          v-model="placementId"
          :disabled="!availableEquipment.length || plan?.isActive === false"
        >
          <option value="">{{ t('admin.selectEquipment') }}</option>
          <option v-for="unit in availableEquipment" :key="unit.id" :value="unit.id">
            {{ unit.displayName }}
          </option>
        </select></label
      >
    </div>
    <p v-if="saving" class="admin-muted">{{ t('admin.savingMarker') }}</p>
    <div v-if="plan?.image" class="floor-editor-layout">
      <div class="floor-editor-canvas-area">
        <div
          class="floor-editor-frame"
          :class="{ 'floor-editor-place': placementId }"
          :style="
            imageAspectRatio
              ? {
                  aspectRatio: imageAspectRatio,
                  width: `min(100%, ${imageAspectRatio * 70}vh)`,
                }
              : undefined
          "
          @click="place"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <img :src="plan.image.contentUrl" :alt="localizedPlan.name" @load="setImageAspectRatio" />
          <button
            v-for="marker in localizedMarkers"
            :key="marker.id"
            class="editor-marker"
            :class="{ 'editor-marker-selected': selectedEquipmentId === marker.gymEquipment.id }"
            :style="{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }"
            :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
            :aria-label="t('admin.dragMarker', { name: marker.gymEquipment.displayName })"
            @click.stop="selectMarker(marker)"
            @pointerdown.stop="startDrag($event, marker.gymEquipment.id)"
          >
            {{ marker.gymEquipment.displayName }}
          </button>
        </div>
      </div>
      <aside class="floor-editor-selected-panel" :aria-label="t('admin.selectedEquipment')">
        <template v-if="selectedMarker">
          <p class="admin-eyebrow">{{ t('admin.selectedEquipment') }}</p>
          <h2>{{ selectedMarker.gymEquipment.displayName }}</h2>
          <p class="admin-muted">{{ selectedMarker.gymEquipment.equipmentTypeName }}</p>
          <p class="admin-muted">{{ t('admin.dragInstructions') }}</p>
          <div class="marker-position-fields">
            <label
              >{{ t('admin.xPosition')
              }}<input v-model="positionX" type="number" min="0" max="1" step="0.01"
            /></label>
            <label
              >{{ t('admin.yPosition')
              }}<input v-model="positionY" type="number" min="0" max="1" step="0.01"
            /></label>
          </div>
          <button
            class="admin-button admin-button-primary"
            :disabled="saving || plan?.isActive === false"
            @click="saveSelectedPosition"
          >
            {{ t('admin.savePosition') }}
          </button>
          <button
            class="admin-button admin-button-danger"
            :disabled="saving"
            @click="remove(selectedMarker)"
          >
            {{ t('admin.removePosition') }}
          </button>
        </template>
        <p v-else class="admin-muted">
          {{ t('admin.selectMarker') }}
        </p>
        <p v-if="placementId" class="admin-success">
          {{ t('admin.tapToPlace') }}
        </p>
      </aside>
    </div>
    <div v-else class="admin-panel admin-message">
      {{ t('admin.chooseActivePlan') }}
    </div>
    <p v-if="plan && !plan.image" class="admin-alert">
      {{ t('admin.missingFloorImage') }}
    </p>
  </section>
</template>
