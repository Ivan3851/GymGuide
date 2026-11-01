<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMuscleGroupEquipment } from '@/api/catalog'
import PageHeading from '@/components/shared/PageHeading.vue'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'

const route = useRoute()
const { data, isLoading, error, load } = useAsyncData(getMuscleGroupEquipment)
const muscleGroupId = computed(() => String(route.params.id || ''))

watch(muscleGroupId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view">
    <PageHeading
      :title="data?.muscleGroup?.name || 'Muscle group'"
      description="Choose equipment available in this gym."
    />

    <StatePanel
      v-if="isLoading"
      title="Loading equipment…"
      message="Getting the demo gym inventory."
    />
    <StatePanel
      v-else-if="error"
      title="Equipment could not be loaded"
      :message="error"
      tone="error"
      action-label="Try again"
      @action="load(muscleGroupId)"
    />
    <StatePanel
      v-else-if="!data?.equipment?.length"
      title="No equipment listed yet"
      message="There is no available demo equipment for this muscle group."
    />
    <section v-else class="card-grid" aria-label="Available equipment">
      <SelectionCard
        v-for="equipment in data.equipment"
        :key="equipment.id"
        :to="{
          name: 'equipment',
          params: { id: equipment.id },
          query: { fromMuscle: data.muscleGroup.id },
        }"
        :title="equipment.name"
        :description="equipment.description"
        :detail="`${equipment.unitCount} available at this demo gym`"
      />
    </section>
    <p class="demo-note">Demo catalog · Equipment and descriptions are sample data.</p>
  </div>
</template>
