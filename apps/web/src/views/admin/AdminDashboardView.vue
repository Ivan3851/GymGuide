<script setup>
import { onMounted, ref } from 'vue'
import { getAdmin } from '@/api/admin'

const loading = ref(true)
const error = ref('')
const stats = ref(null)
const cards = [
  ['Muscle groups', 'muscleGroups'],
  ['Equipment types', 'equipmentTypes'],
  ['Gym equipment units', 'gymEquipment'],
  ['Exercises', 'exercises'],
  ['Exercise variations', 'variations'],
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await getAdmin('dashboard')
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <section>
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">GymGuide · Demo Gym</p>
        <h1>Dashboard</h1>
        <p class="admin-muted">A quick look at the content in this kiosk.</p>
      </div>
      <button class="admin-button" @click="load">Refresh</button>
    </div>
    <p v-if="loading" class="admin-message">Loading dashboard…</p>
    <div v-else-if="error" class="admin-alert" role="alert">{{ error }}</div>
    <div v-else class="admin-stat-grid">
      <article v-for="[label, key] in cards" :key="key" class="admin-stat-card">
        <span>{{ label }}</span
        ><strong>{{ stats[key] }}</strong>
      </article>
    </div>
    <div class="admin-panel admin-dashboard-note">
      <h2>Content management</h2>
      <p>
        Choose a section from the sidebar to add, edit, archive or restore catalog content. Changes
        are served to the member kiosk immediately.
      </p>
    </div>
  </section>
</template>
