<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AdminApiError, signIn } from '@/api/admin'

const username = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const router = useRouter()
const route = useRoute()

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
  } catch (requestError) {
    error.value =
      requestError instanceof AdminApiError ? requestError.message : 'Could not sign in. Try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="admin-login-page">
    <form class="admin-login-card" @submit.prevent="submit">
      <RouterLink class="admin-brand" to="/">GymGuide <span>STAFF</span></RouterLink>
      <p class="admin-eyebrow">Administration</p>
      <h1>Sign in</h1>
      <p class="admin-muted">Use your gym staff account to manage this kiosk's content.</p>
      <label
        >Username or email<input
          v-model="username"
          autocomplete="username"
          required
          maxlength="254"
          autofocus
      /></label>
      <label
        >Password<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="256"
      /></label>
      <p v-if="error" class="admin-alert" role="alert">{{ error }}</p>
      <button class="admin-button admin-button-primary" type="submit" :disabled="pending">
        {{ pending ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>
