<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signIn } from '@/api/admin'
import { useLocale } from '@/localization/locale'

const username = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const router = useRouter()
const route = useRoute()
const { t } = useLocale()

function setValidation(event, key) {
  event.target.setCustomValidity(t(key))
}

function clearValidation(event) {
  event.target.setCustomValidity('')
}

async function submit() {
  pending.value = true
  error.value = ''
  try {
    await signIn(username.value, password.value)
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
        ? route.query.redirect
        : '/admin/dashboard'
    await router.replace(redirect)
  } catch {
    error.value = 'admin.loginError'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="admin-login-page">
    <form class="admin-login-card" @submit.prevent="submit">
      <RouterLink class="admin-brand" to="/"
        >GymGuide <span>{{ t('admin.badge') }}</span></RouterLink
      >
      <p class="admin-eyebrow">{{ t('admin.loginEyebrow') }}</p>
      <h1>{{ t('admin.loginTitle') }}</h1>
      <p class="admin-muted">{{ t('admin.loginDescription') }}</p>
      <label
        >{{ t('admin.username')
        }}<input
          v-model="username"
          autocomplete="username"
          required
          maxlength="254"
          autofocus
          :aria-label="t('admin.username')"
          @invalid="setValidation($event, 'admin.validation.username')"
          @input="clearValidation"
      /></label>
      <label
        >{{ t('admin.password')
        }}<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="256"
          :aria-label="t('admin.password')"
          @invalid="setValidation($event, 'admin.validation.password')"
          @input="clearValidation"
      /></label>
      <p v-if="error" class="admin-alert" role="alert">{{ t(error) }}</p>
      <button class="admin-button admin-button-primary" type="submit" :disabled="pending">
        {{ pending ? t('admin.signingIn') : t('admin.signIn') }}
      </button>
    </form>
  </main>
</template>
