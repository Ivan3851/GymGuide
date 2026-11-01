<script setup>
import { onMounted, watch } from 'vue'
import { getMuscleGroups } from '@/api/catalog'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useApiHealth } from '@/composables/useApiHealth'

const { isConnected, hasChecked } = useApiHealth()
const { data, isLoading, error, load } = useAsyncData(getMuscleGroups)
onMounted(() => load())
watch(isConnected, (connected) => {
  if (connected && error.value) load()
})
</script>

<template>
  <div class="home-view">
    <section class="hero hero-compact" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">GymGuide · Demo catalog</p>
        <h1 id="hero-title">Train with<br /><span>confidence.</span></h1>
        <p class="hero-description">
          Choose a muscle group to find equipment and exercises available in this gym.
        </p>
      </div>
    </section>

    <section class="browse-section" aria-labelledby="muscle-groups-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Start here</p>
          <h2 id="muscle-groups-title">Choose a muscle group</h2>
        </div>
        <span v-if="data" class="result-count">{{ data.length }} groups</span>
      </div>

      <StatePanel
        v-if="isLoading"
        title="Loading muscle groups…"
        message="Connecting to the local catalog."
      />
      <StatePanel
        v-else-if="error"
        title="Muscle groups could not be loaded"
        :message="error"
        tone="error"
        action-label="Try again"
        @action="load()"
      />
      <StatePanel
        v-else-if="!data?.length"
        title="No muscle groups available"
        message="The catalog is empty. Run the demo seed command to add the proof-of-concept data."
      />
      <div v-else class="card-grid muscle-grid">
        <SelectionCard
          v-for="muscleGroup in data"
          :key="muscleGroup.id"
          :to="{ name: 'muscle-group', params: { id: muscleGroup.id } }"
          :title="muscleGroup.name"
          :description="muscleGroup.description"
        />
      </div>
    </section>

    <footer class="home-footer">
      <span
        class="status-dot"
        :class="{ 'status-dot-offline': hasChecked && !isConnected }"
        aria-hidden="true"
      ></span>
      <span v-if="isConnected">Local services are ready. You’re in the right place.</span>
      <span v-else-if="hasChecked"
        >Local services are not responding. Check the backend connection.</span
      >
      <span v-else>Connecting to local services…</span>
    </footer>
  </div>
</template>
