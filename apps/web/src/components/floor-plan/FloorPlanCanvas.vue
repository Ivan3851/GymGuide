<script setup>
import { computed } from 'vue'
import { exerciseMarkerClasses } from '@/components/exercise/exercise-marker-state.js'

const props = defineProps({
  floor: { type: Object, required: true },
  selectedEquipmentId: { type: String, default: '' },
  markerMode: { type: String, default: 'exercise' },
  imageLabel: { type: String, required: true },
  markerLabel: { type: Function, default: null },
})
const emit = defineEmits(['select-marker'])
const markers = computed(() => props.floor.markers || [])

function classes(marker) {
  if (props.markerMode === 'exercise')
    return exerciseMarkerClasses(marker, props.selectedEquipmentId)
  return {
    'gym-floor-map-marker': true,
    'exercise-map-marker-selected': props.selectedEquipmentId === marker.gymEquipment.id,
  }
}

function label(marker) {
  if (props.markerLabel) return props.markerLabel(marker)
  return marker.gymEquipment.displayName
}
</script>

<template>
  <div class="exercise-map-frame">
    <div class="exercise-map">
      <img :src="floor.image.contentUrl" :alt="`${floor.name} · ${imageLabel}`" />
      <button
        v-for="marker in markers"
        :key="marker.id"
        class="exercise-map-marker"
        :class="classes(marker)"
        :style="{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }"
        :aria-label="label(marker)"
        :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
        @click="emit('select-marker', marker.gymEquipment.id)"
      ></button>
    </div>
  </div>
</template>
