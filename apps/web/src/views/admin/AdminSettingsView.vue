<script setup>
import { onMounted, ref } from 'vue'
import { getAdminSettings, updateAdminSettings } from '@/api/admin'

const timeoutSeconds = ref(60)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const settings = await getAdminSettings()
    timeoutSeconds.value = settings.memberInactivityTimeoutSeconds
  } catch (problem) {
    error.value = problem.message
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
    notice.value = 'Kiosk settings saved.'
  } catch (problem) {
    error.value = problem.message
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
        <p class="admin-eyebrow">Kiosk configuration</p>
        <h1>Gym settings</h1>
        <p class="admin-muted">These settings apply to member browsing at this gym.</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-success" role="status">{{ notice }}</p>
    <form class="admin-panel gym-settings-form" @submit.prevent="save">
      <label>
        Return to homepage after inactivity
        <span
          >Members return to the start after this many idle seconds. Active videos are allowed to
          finish.</span
        >
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
      <p class="admin-muted">Allowed range: 15–600 seconds. Default: 60 seconds.</p>
      <button class="admin-button admin-button-primary" :disabled="loading || saving">
        {{ saving ? 'Saving…' : 'Save settings' }}
      </button>
    </form>
  </section>
</template>
