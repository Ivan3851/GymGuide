<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({ locations: { type: Object, required: true } })
const selectedFloorId = ref('')
const selectedEquipmentId = ref('')
const currentFloor = computed(
  () =>
    props.locations.floorPlans.find((floor) => floor.id === selectedFloorId.value) ||
    props.locations.floorPlans[0] ||
    null,
)
const currentMarker = computed(
  () =>
    currentFloor.value?.markers.find(
      (marker) => marker.gymEquipment.id === selectedEquipmentId.value,
    ) || null,
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
</script>

<template>
  <section class="detail-section exercise-floorplan-section">
    <div class="floorplan-heading">
      <div>
        <p class="eyebrow">At your gym</p>
        <h2>Find this equipment</h2>
      </div>
      <label v-if="locations.floorPlans.length > 1" class="floorplan-floor-select">
        Floor
        <select v-model="selectedFloorId">
          <option v-for="floor in locations.floorPlans" :key="floor.id" :value="floor.id">
            {{ floor.floorLabel }} · {{ floor.name }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="!locations.floorPlans.length" class="floorplan-notice">
      This gym has not added a floor plan yet. Ask a staff member where to find the equipment.
    </p>
    <template v-else>
      <p v-if="locations.hasMappedEquipment" class="floorplan-notice">
        Highlighted markers show equipment that can perform this exercise.
      </p>
      <p v-else class="floorplan-notice">
        No specific machine location has been configured for this exercise. The floor plan is shown
        for reference.
      </p>
      <div class="exercise-floorplan-layout">
        <div class="exercise-map-frame">
          <div v-if="currentFloor" class="exercise-map">
            <img :src="currentFloor.image.contentUrl" :alt="`${currentFloor.name} floor plan`" />
            <button
              v-for="marker in currentFloor.markers"
              :key="marker.id"
              class="exercise-map-marker"
              :class="{
                'exercise-map-marker-match': marker.matchesExercise,
                'exercise-map-marker-selected': selectedEquipmentId === marker.gymEquipment.id,
              }"
              :style="{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }"
              :aria-label="`${marker.gymEquipment.displayName}${marker.matchesExercise ? ', matches this exercise' : ''}`"
              :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
              @click="selectedEquipmentId = marker.gymEquipment.id"
            >
              {{ marker.gymEquipment.displayName }}
            </button>
          </div>
        </div>

        <aside class="exercise-equipment-panel" aria-label="Equipment locations">
          <h3>{{ currentMarker?.gymEquipment.displayName || 'Equipment locations' }}</h3>
          <p v-if="currentMarker">
            {{ currentMarker.gymEquipment.equipmentTypeName
            }}<span v-if="currentMarker.gymEquipment.details">
              · {{ currentMarker.gymEquipment.details }}</span
            >
          </p>
          <p v-else-if="selectedEquipmentId">
            No floor marker is configured for this equipment unit.
          </p>
          <p v-else>Select an equipment marker to see its name and details.</p>
          <h4 v-if="locations.equipmentUnits.length">Matching equipment</h4>
          <button
            v-for="unit in locations.equipmentUnits"
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
