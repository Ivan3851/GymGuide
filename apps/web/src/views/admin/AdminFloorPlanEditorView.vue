<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  deleteAdminFloorPlanMarker,
  getAdmin,
  getAdminFloorPlanMarkers,
  saveAdminFloorPlanMarker,
} from '@/api/admin'

const route = useRoute()
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
const plan = computed(() => plans.value.find((item) => item.id === planId.value))
const selectedMarker = computed(
  () =>
    markers.value.find((marker) => marker.gymEquipment.id === selectedEquipmentId.value) || null,
)
const availableEquipment = computed(() =>
  equipment.value.filter(
    (unit) => !markers.value.some((marker) => marker.gymEquipment.id === unit.id),
  ),
)

async function load() {
  error.value = ''
  try {
    const [allPlans, allEquipment, allMedia] = await Promise.all([
      getAdmin('floor-plans?includeArchived=true'),
      getAdmin('gym-equipment?includeArchived=true'),
      getAdmin('media'),
    ])
    plans.value = allPlans.map((item) => ({
      ...item,
      image: allMedia.find((asset) => asset.id === item.imageMediaId),
    }))
    equipment.value = allEquipment.filter((unit) => unit.isActive !== false && unit.isAvailable)
    if (!planId.value) planId.value = plans.value.find((item) => item.isActive !== false)?.id || ''
    await loadMarkers()
  } catch (problem) {
    error.value = problem.message
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
    error.value = problem.message
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
    notice.value = 'Marker position saved.'
    await loadMarkers()
  } catch (problem) {
    error.value = problem.message
    await loadMarkers()
  } finally {
    saving.value = false
  }
}
async function saveSelectedPosition() {
  const x = Number(positionX.value)
  const y = Number(positionY.value)
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    error.value = 'Position values must be between 0 and 1.'
    return
  }
  await save(selectedEquipmentId.value, { x, y })
}
async function remove(marker) {
  error.value = ''
  try {
    await deleteAdminFloorPlanMarker(planId.value, marker.gymEquipment.id)
    notice.value = 'Marker removed.'
    await loadMarkers()
  } catch (problem) {
    error.value = problem.message
  }
}
watch(planId, loadMarkers)
onMounted(load)
</script>

<template>
  <section>
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">Gym layout</p>
        <h1>Equipment positions</h1>
        <p class="admin-muted">Markers use normalized positions and scale with the floor plan.</p>
      </div>
      <RouterLink class="admin-button" to="/admin/content/floor-plans"
        >Manage floor plans</RouterLink
      >
    </div>
    <p v-if="error" class="admin-alert" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-success" role="status">{{ notice }}</p>
    <div class="admin-panel floor-editor-controls">
      <label
        >Floor plan<select v-model="planId">
          <option value="" disabled>Select a floor plan</option>
          <option v-for="item in plans" :key="item.id" :value="item.id">
            {{ item.floorLabel }} · {{ item.name
            }}{{ item.isActive === false ? ' (archived)' : '' }}
          </option>
        </select></label
      ><label
        >Equipment to place<select
          v-model="placementId"
          :disabled="!availableEquipment.length || plan?.isActive === false"
        >
          <option value="">Select equipment, then tap map</option>
          <option v-for="unit in availableEquipment" :key="unit.id" :value="unit.id">
            {{ unit.displayName }}
          </option>
        </select></label
      >
    </div>
    <p v-if="saving" class="admin-muted">Saving marker…</p>
    <div v-if="plan?.image" class="floor-editor-layout">
      <div class="floor-editor-canvas-area">
        <div
          class="floor-editor-frame"
          :class="{ 'floor-editor-place': placementId }"
          @click="place"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <img :src="plan.image.contentUrl" :alt="plan.name" />
          <button
            v-for="marker in markers"
            :key="marker.id"
            class="editor-marker"
            :class="{ 'editor-marker-selected': selectedEquipmentId === marker.gymEquipment.id }"
            :style="{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }"
            :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
            :aria-label="`${marker.gymEquipment.displayName}; drag to move`"
            @click.stop="selectMarker(marker)"
            @pointerdown.stop="startDrag($event, marker.gymEquipment.id)"
          >
            {{ marker.gymEquipment.displayName }}
          </button>
        </div>
      </div>
      <aside class="floor-editor-selected-panel" aria-label="Selected equipment marker">
        <template v-if="selectedMarker">
          <p class="admin-eyebrow">Selected equipment</p>
          <h2>{{ selectedMarker.gymEquipment.displayName }}</h2>
          <p class="admin-muted">{{ selectedMarker.gymEquipment.equipmentTypeName }}</p>
          <p v-if="selectedMarker.gymEquipment.details" class="admin-muted">
            {{ selectedMarker.gymEquipment.details }}
          </p>
          <p class="admin-muted">Drag the marker, or edit its normalized position.</p>
          <div class="marker-position-fields">
            <label
              >X position (0–1)<input v-model="positionX" type="number" min="0" max="1" step="0.01"
            /></label>
            <label
              >Y position (0–1)<input v-model="positionY" type="number" min="0" max="1" step="0.01"
            /></label>
          </div>
          <button
            class="admin-button admin-button-primary"
            :disabled="saving || plan?.isActive === false"
            @click="saveSelectedPosition"
          >
            Save position
          </button>
          <button
            class="admin-button admin-button-danger"
            :disabled="saving"
            @click="remove(selectedMarker)"
          >
            Remove marker
          </button>
        </template>
        <p v-else class="admin-muted">
          Select a marker on the plan to see its equipment and editing controls.
        </p>
        <p v-if="placementId" class="admin-success">
          Tap inside the plan to place the selected equipment.
        </p>
      </aside>
    </div>
    <div v-else class="admin-panel admin-message">
      Choose an active floor plan with an uploaded image. Create one from Floor plans.
    </div>
    <p v-if="plan && !plan.image" class="admin-alert">
      This floor plan image is unavailable; edit the floor plan and select a ready image.
    </p>
  </section>
</template>
