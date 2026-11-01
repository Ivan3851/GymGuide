<script setup>
import { onBeforeUnmount, onMounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getKioskSettings } from '@/api/kiosk'
import { createMemberIdleController } from '@/composables/member-idle-controller'
import { API_HEALTH_KEY } from '@/composables/api-health-key'
import { useApiHealth } from '@/composables/useApiHealth'

const apiHealth = useApiHealth(() => window.location.reload())
provide(API_HEALTH_KEY, apiHealth)

const route = useRoute()
const router = useRouter()
const DEFAULT_TIMEOUT_MS = 60_000
const isVideoPlaying = () =>
  [...document.querySelectorAll('video')].some(
    (video) => !video.paused && !video.ended && !video.error,
  )
const idleController = createMemberIdleController({
  timeoutMs: DEFAULT_TIMEOUT_MS,
  isVideoPlaying,
  onTimeout: () => router.replace({ name: 'home' }),
})
const isAdminRoute = (path) => path === '/admin' || path.startsWith('/admin/')
let settingsLoaded = false
let returningFromAdmin = false

async function loadKioskTimeout() {
  try {
    const settings = await getKioskSettings()
    const seconds = settings.memberInactivityTimeoutSeconds
    if (Number.isInteger(seconds) && seconds >= 15 && seconds <= 600)
      idleController.setTimeoutMs(seconds * 1000)
  } catch {
    idleController.setTimeoutMs(DEFAULT_TIMEOUT_MS)
  }
}

function syncRouteScope(path) {
  if (isAdminRoute(path)) {
    idleController.stop()
    returningFromAdmin = true
    return
  }
  idleController.start()
  if (!settingsLoaded || returningFromAdmin) {
    settingsLoaded = true
    returningFromAdmin = false
    loadKioskTimeout()
  }
}
function onMemberInteraction(event) {
  if (event.isTrusted) idleController.interact()
}
function onVideoStopped() {
  idleController.playbackStopped()
}

watch(() => route.path, syncRouteScope, { immediate: true })

onMounted(async () => {
  for (const eventName of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove'])
    document.addEventListener(eventName, onMemberInteraction, { capture: true, passive: true })
  for (const eventName of ['ended', 'pause', 'error', 'abort', 'emptied'])
    document.addEventListener(eventName, onVideoStopped, true)
})

onBeforeUnmount(() => {
  idleController.stop()
  for (const eventName of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove'])
    document.removeEventListener(eventName, onMemberInteraction, true)
  for (const eventName of ['ended', 'pause', 'error', 'abort', 'emptied'])
    document.removeEventListener(eventName, onVideoStopped, true)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>
