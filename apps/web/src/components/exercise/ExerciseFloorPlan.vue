<script setup>
import { computed, ref, watch } from 'vue'
import FloorPlanCanvas from '@/components/floor-plan/FloorPlanCanvas.vue'
import { localizeEquipmentUnit, localizeRecord } from '@/localization/content'
import { useLocale } from '@/localization/locale'

const props = defineProps({ locations: { type: Object, required: true } })
const { locale, t } = useLocale()
const selectedFloorId = ref('')
const selectedEquipmentId = ref('')
const currentFloor = computed(() =>
  localizeRecord(
    props.locations.floorPlans.find((floor) => floor.id === selectedFloorId.value) ||
      props.locations.floorPlans[0] ||
      null,
    locale.value,
    'floorPlan',
  ),
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
            {{ localizeRecord(floor, locale, 'floorPlan').name }}
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
        <FloorPlanCanvas
          v-if="currentFloor"
          :floor="{ ...currentFloor, markers: currentMarkers }"
          :selected-equipment-id="selectedEquipmentId"
          :image-label="t('floor.title')"
          :marker-label="
            (marker) =>
              marker.matchesExercise
                ? t('floor.markerMatch', { name: marker.gymEquipment.displayName })
                : marker.gymEquipment.displayName
          "
          @select-marker="selectedEquipmentId = $event"
        />

        <aside class="exercise-equipment-panel" :aria-label="t('floor.equipmentLocations')">
          <h3>{{ currentMarker?.gymEquipment.displayName || t('floor.equipmentLocations') }}</h3>
          <p v-if="currentMarker">
            {{ currentMarker.gymEquipment.equipmentTypeName }}
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
