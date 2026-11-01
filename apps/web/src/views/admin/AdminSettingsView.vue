<script setup>
import { onMounted, ref } from 'vue'
import { getAdminSettings, updateAdminSettings } from '@/api/admin'
import { useLocale } from '@/localization/locale'
import { apiErrorMessageKey } from '@/localization/api-error'

const timeoutSeconds = ref(60)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const { t } = useLocale()

async function load() {
  loading.value = true
  error.value = ''
  try {
    const settings = await getAdminSettings()
    timeoutSeconds.value = settings.memberInactivityTimeoutSeconds
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  } finally {
    loading.value = false
  }
}
async function save() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const settings = await updateAdminSettings({
      memberInactivityTimeoutSeconds: Number(timeoutSeconds.value),
    })
    timeoutSeconds.value = settings.memberInactivityTimeoutSeconds
    notice.value = 'admin.settingsSaved'
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <section>
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">{{ t('admin.settingsEyebrow') }}</p>
        <h1>{{ t('admin.settingsTitle') }}</h1>
        <p class="admin-muted">{{ t('admin.settingsDescription') }}</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert" role="alert">{{ t(error) }}</p>
    <p v-if="notice" class="admin-success" role="status">{{ t(notice) }}</p>
    <form class="admin-panel gym-settings-form" @submit.prevent="save">
      <label>
        {{ t('admin.idleTimeout') }}
        <span>{{ t('admin.idleExplanation') }}</span>
        <input
          v-model.number="timeoutSeconds"
          type="number"
          min="15"
          max="600"
          step="1"
          required
          :disabled="loading"
        />
      </label>
      <p class="admin-muted">{{ t('admin.timeoutRange') }}</p>
      <button class="admin-button admin-button-primary" :disabled="loading || saving">
        {{ saving ? t('admin.saving') : t('admin.saveSettings') }}
      </button>
    </form>
  </section>
</template>
