import { onMounted, onUnmounted, ref } from 'vue'
import { fetchApiHealth } from '@/api/health'

export function useApiHealth() {
  const isConnected = ref(false)
  const hasChecked = ref(false)
  let stopped = false
  let retryTimer
  let requestController

  async function check() {
    let delay = 1000
    while (!stopped) {
      try {
        requestController = new AbortController()
        const health = await fetchApiHealth(requestController.signal)
        isConnected.value = health.status === 'ok' && health.database === 'connected'
      } catch {
        isConnected.value = false
      } finally {
        requestController = null
      }
      hasChecked.value = true
      if (stopped) return
      delay = isConnected.value ? 10_000 : Math.min(delay * 2, 10_000)
      await new Promise((resolve) => {
        retryTimer = setTimeout(resolve, delay)
      })
    }
  }

  onMounted(check)
  onUnmounted(() => {
    stopped = true
    clearTimeout(retryTimer)
    requestController?.abort()
  })

  return { isConnected, hasChecked }
}
