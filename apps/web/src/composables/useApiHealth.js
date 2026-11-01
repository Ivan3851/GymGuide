import { onMounted, ref } from 'vue'
import { fetchApiHealth } from '@/api/health'

export function useApiHealth() {
  const isConnected = ref(false)
  const hasChecked = ref(false)

  onMounted(async () => {
    try {
      const health = await fetchApiHealth()
      isConnected.value = health.status === 'ok' && health.database === 'connected'
    } catch {
      isConnected.value = false
    } finally {
      hasChecked.value = true
    }
  })

  return { isConnected, hasChecked }
}
