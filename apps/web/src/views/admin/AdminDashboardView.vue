<script setup>
import { onMounted, ref } from 'vue'
import { getAdmin } from '@/api/admin'
import { useLocale } from '@/localization/locale'
import { apiErrorMessageKey } from '@/localization/api-error'

const loading = ref(true)
const error = ref('')
const stats = ref(null)
const { t } = useLocale()
const cards = [
  ['admin.muscleCount', 'muscleGroups'],
  ['admin.equipmentTypeCount', 'equipmentTypes'],
  ['admin.equipmentCount', 'gymEquipment'],
  ['admin.exerciseCount', 'exercises'],
  ['admin.variationCount', 'variations'],
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await getAdmin('dashboard')
  } catch (requestError) {
    error.value = apiErrorMessageKey(requestError)
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
        <p class="admin-eyebrow">{{ t('admin.dashboardEyebrow') }} · {{ t('admin.demoGym') }}</p>
        <h1>{{ t('admin.dashboardTitle') }}</h1>
        <p class="admin-muted">{{ t('admin.dashboardDescription') }}</p>
      </div>
      <button class="admin-button" @click="load">{{ t('admin.refresh') }}</button>
    </div>
    <p v-if="loading" class="admin-message">{{ t('admin.loadingDashboard') }}</p>
    <div v-else-if="error" class="admin-alert" role="alert">{{ t(error) }}</div>
    <div v-else class="admin-stat-grid">
      <article v-for="[label, key] in cards" :key="key" class="admin-stat-card">
        <span>{{ t(label) }}</span
        ><strong>{{ stats[key] }}</strong>
      </article>
    </div>
    <div class="admin-panel admin-dashboard-note">
      <h2>{{ t('admin.contentManagement') }}</h2>
      <p>
        {{ t('admin.contentManagementText') }}
      </p>
    </div>
  </section>
</template>
