<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getEquipmentExercises } from '@/api/catalog'
import PageHeading from '@/components/shared/PageHeading.vue'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'

const route = useRoute()
const { data, isLoading, error, load } = useAsyncData(getEquipmentExercises)
const equipmentId = computed(() => String(route.params.id || ''))
const backTo = computed(() =>
  route.query.fromMuscle
    ? { name: 'muscle-group', params: { id: String(route.query.fromMuscle) } }
    : '/',
)

watch(equipmentId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view">
    <PageHeading
      :title="data?.equipmentType?.name || 'Equipment'"
      description="Choose an exercise to see the demo instructions and variations."
      :back-to="backTo"
      back-label="Equipment"
    />

    <StatePanel
      v-if="isLoading"
      title="Loading exercises…"
      message="Finding compatible movements."
    />
    <StatePanel
      v-else-if="error"
      title="Exercises could not be loaded"
      :message="error"
      tone="error"
      action-label="Try again"
      @action="load(equipmentId)"
    />
    <StatePanel
      v-else-if="!data?.exercises?.length"
      title="No exercises listed yet"
      message="This demo equipment does not have exercises assigned."
    />
    <section v-else class="card-grid" aria-label="Exercises for this equipment">
      <SelectionCard
        v-for="exercise in data.exercises"
        :key="exercise.id"
        :to="{
          name: 'exercise',
          params: { id: exercise.id },
          query: { fromEquipment: equipmentId },
        }"
        :title="exercise.name"
        :description="exercise.summary"
        :detail="exercise.muscles.map((muscle) => muscle.name).join(' · ')"
      />
    </section>
    <p class="demo-note">Demo catalog · Exercise guidance is sample content.</p>
  </div>
</template>
