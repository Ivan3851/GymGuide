<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import PageHeading from '@/components/shared/PageHeading.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import FloorPlanCanvas from '@/components/floor-plan/FloorPlanCanvas.vue'
import { getGymMapFloorPlans } from '@/api/catalog'
import { useAsyncData } from '@/composables/useAsyncData'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeEquipmentUnit, localizeRecord } from '@/localization/content'
import { useLocale } from '@/localization/locale'
import { validMapMarkers } from '@/components/map/valid-map-markers'

const { locale, t } = useLocale()
const {
  data: floorPlans,
  isLoading,
  error,
  load,
} = useAsyncData(getGymMapFloorPlans, apiErrorMessageKey)
const selectedFloorId = ref('')
const selectedEquipmentId = ref('')
const floors = computed(() =>
  (floorPlans.value || []).map((floor) => ({
    ...localizeRecord(floor, locale.value, 'floorPlan'),
    markers: validMapMarkers(floor.markers),
  })),
)
const currentFloor = computed(
  () => floors.value.find((floor) => floor.id === selectedFloorId.value) || floors.value[0] || null,
)
const currentMarker = computed(
  () =>
    currentFloor.value?.markers.find(
      (marker) => marker.gymEquipment.id === selectedEquipmentId.value,
    ) || null,
)
const localizedEquipment = computed(() =>
  currentMarker.value
    ? localizeEquipmentUnit(currentMarker.value.gymEquipment, locale.value)
    : null,
)
const localizedFloor = computed(() =>
  currentFloor.value
    ? {
        ...currentFloor.value,
        markers: currentFloor.value.markers.map((marker) => ({
          ...marker,
          gymEquipment: localizeEquipmentUnit(marker.gymEquipment, locale.value),
        })),
      }
    : null,
)

onMounted(() => load())

watch(
  floors,
  (value) => {
    if (!value.some((floor) => floor.id === selectedFloorId.value))
      selectedFloorId.value = value[0]?.id || ''
    const floor = value.find((item) => item.id === selectedFloorId.value) || value[0]
    if (!floor?.markers.some((marker) => marker.gymEquipment.id === selectedEquipmentId.value))
      selectedEquipmentId.value = floor?.markers[0]?.gymEquipment.id || ''
  },
  { immediate: true },
)

watch(selectedFloorId, (floorId) => {
  const floor = floors.value.find((item) => item.id === floorId)
  if (!floor?.markers.some((marker) => marker.gymEquipment.id === selectedEquipmentId.value))
    selectedEquipmentId.value = floor?.markers[0]?.gymEquipment.id || ''
})
</script>

<template>
  <div class="browse-view gym-map-view">
    <PageHeading :title="t('map.title')" :description="t('map.description')" />
    <StatePanel v-if="isLoading" :title="t('map.loading')" :message="t('map.loadingMessage')" />
    <StatePanel
      v-else-if="error"
      :title="t('map.errorTitle')"
      :message="t(error)"
      tone="error"
      :action-label="t('common.retry')"
      @action="load()"
    />
    <StatePanel
      v-else-if="!floors.length"
      :title="t('map.emptyTitle')"
      :message="t('map.emptyMessage')"
    />
    <template v-else>
      <div class="gym-map-toolbar">
        <label v-if="floors.length > 1" class="floorplan-floor-select">
          {{ t('floor.floor') }}
          <select v-model="selectedFloorId">
            <option v-for="floor in floors" :key="floor.id" :value="floor.id">
              {{ floor.name }}
            </option>
          </select>
        </label>
      </div>
      <section v-if="currentFloor" class="gym-map-layout" :aria-label="t('map.title')">
        <StatePanel
          v-if="!currentFloor.image?.contentUrl"
          :title="t('map.imageUnavailable')"
          :message="t('map.imageUnavailableMessage')"
          tone="error"
        />
        <FloorPlanCanvas
          v-else
          class="gym-map-canvas"
          :floor="localizedFloor"
          :selected-equipment-id="selectedEquipmentId"
          marker-mode="general"
          :image-label="t('map.title')"
          @select-marker="selectedEquipmentId = $event"
        />
        <aside class="gym-map-info" :aria-label="t('map.equipmentInfo')">
          <template v-if="localizedEquipment">
            <p class="eyebrow">{{ t('map.equipmentInfo') }}</p>
            <h2>{{ localizedEquipment.displayName }}</h2>
            <p class="gym-map-type">{{ localizedEquipment.equipmentTypeName }}</p>
          </template>
          <p v-else class="admin-muted">{{ t('map.selectMachine') }}</p>
          <div v-if="!currentFloor.markers.length" class="gym-map-empty-floor" role="status">
            {{ t('map.noMachinesOnFloor') }}
          </div>
          <div v-else class="gym-map-machine-list" :aria-label="t('map.machines')">
            <button
              v-for="marker in currentFloor.markers"
              :key="marker.id"
              type="button"
              :aria-pressed="selectedEquipmentId === marker.gymEquipment.id"
              :class="{ selected: selectedEquipmentId === marker.gymEquipment.id }"
              @click="selectedEquipmentId = marker.gymEquipment.id"
            >
              {{ localizeEquipmentUnit(marker.gymEquipment, locale).displayName }}
            </button>
          </div>
        </aside>
      </section>
    </template>
  </div>
</template>
