<script setup>
import { computed, ref, watch } from 'vue'
import { exerciseMarkerClasses } from './exercise-marker-state.js'
import { localizeEquipmentUnit } from '@/localization/demo-content'
import { useLocale } from '@/localization/locale'

const props = defineProps({ locations: { type: Object, required: true } })
const { locale, t } = useLocale()
const selectedFloorId = ref('')
const selectedEquipmentId = ref('')
const currentFloor = computed(
  () =>
    props.locations.floorPlans.find((floor) => floor.id === selectedFloorId.value) ||
    props.locations.floorPlans[0] ||
    null,
)
const currentMarkers = computed(
  () =>
    currentFloor.value?.markers.map((marker) => ({
      ...marker,
      gymEquipment: localizeEquipmentUnit(marker.gymEquipment, locale.value),
    })) || [],
)
const currentMarker = computed(
  () =>
    currentMarkers.value.find((marker) => marker.gymEquipment.id === selectedEquipmentId.value) ||
    null,
)
const equipmentUnits = computed(() =>
  props.locations.equipmentUnits.map((unit) => localizeEquipmentUnit(unit, locale.value)),
)

function selectEquipment(equipmentId) {
  selectedEquipmentId.value = equipmentId
  const floor = props.locations.floorPlans.find((item) =>
    item.markers.some((marker) => marker.gymEquipment.id === equipmentId),
  )
  if (floor) selectedFloorId.value = floor.id
}

watch(
  () => props.locations.floorPlans,
  (floors) => {
    if (!floors.some((floor) => floor.id === selectedFloorId.value))
      selectedFloorId.value = floors[0]?.id || ''
    const defaultMarker = floors
      .flatMap((floor) => floor.markers)
      .find((marker) => marker.matchesExercise)
    if (!selectedEquipmentId.value && defaultMarker)
      selectedEquipmentId.value = defaultMarker.gymEquipment.id
  },
  { immediate: true },
)

watch(selectedFloorId, (floorId) => {
  const floor = props.locations.floorPlans.find((item) => item.id === floorId)
  if (!floor?.markers.some((marker) => marker.gymEquipment.id === selectedEquipmentId.value)) {
    selectedEquipmentId.value = floor?.markers[0]?.gymEquipment.id || ''
  }
})
</script>

<template>
  <section class="detail-section exercise-floorplan-section">
    <div class="floorplan-heading">
      <div>
        <p class="eyebrow">{{ t('floor.eyebrow') }}</p>
        <h2>{{ t('floor.title') }}</h2>
      </div>
      <label v-if="locations.floorPlans.length > 1" class="floorplan-floor-select">
        {{ t('floor.floor') }}
        <select v-model="selectedFloorId">
          <option v-for="floor in locations.floorPlans" :key="floor.id" :value="floor.id">
            {{ floor.floorLabel }} · {{ floor.name }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="!locations.floorPlans.length" class="floorplan-notice">
      {{ t('floor.none') }}
    </p>
    <template v-else>
      <p v-if="locations.hasMappedEquipment" class="floorplan-notice">
        {{ t('floor.highlighted') }}
      </p>
      <p v-else class="floorplan-notice">{{ t('floor.noMatch') }}</p>
      <div class="exercise-floorplan-layout">
        <div class="exercise-map-frame">
          <div v-if="currentFloor" class="exercise-map">
            <img
              :src="currentFloor.image.contentUrl"
              :alt="`${currentFloor.name} · ${t('floor.title')}`"
            />
            <button
              v-for="marker in currentMarkers"
              :key="marker.id"
              class="exercise-map-marker"
              :class="exerciseMarkerClasses(marker, selectedEquipmentId)"
              :style="{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }"
              :aria-label="
                marker.matchesExercise
                  ? t('floor.markerMatch', { name: marker.gymEquipment.displayName })
                  : marker.gymEquipment.displayName
              "
              :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
              @click="selectedEquipmentId = marker.gymEquipment.id"
            ></button>
          </div>
        </div>

        <aside class="exercise-equipment-panel" :aria-label="t('floor.equipmentLocations')">
          <h3>{{ currentMarker?.gymEquipment.displayName || t('floor.equipmentLocations') }}</h3>
          <p v-if="currentMarker">
            {{ currentMarker.gymEquipment.equipmentTypeName
            }}<span v-if="currentMarker.gymEquipment.details">
              · {{ currentMarker.gymEquipment.details }}</span
            >
          </p>
          <p v-else-if="selectedEquipmentId">{{ t('floor.noMarker') }}</p>
          <p v-else>{{ t('floor.selectMarker') }}</p>
          <h4 v-if="locations.equipmentUnits.length">{{ t('floor.matchingEquipment') }}</h4>
          <button
            v-for="unit in equipmentUnits"
            :key="unit.id"
            class="equipment-location-choice"
            :class="{ 'equipment-location-choice-selected': selectedEquipmentId === unit.id }"
            :aria-pressed="selectedEquipmentId === unit.id"
            @click="selectEquipment(unit.id)"
          >
            <strong>{{ unit.displayName }}</strong>
            <span>{{ unit.equipmentTypeName }}</span>
          </button>
        </aside>
      </div>
    </template>
  </section>
</template>
