import { ref } from 'vue'

export function useAsyncData(loader, formatError = (error) => error.message) {
  const data = ref(null)
  const isLoading = ref(true)
  const error = ref('')
  let latestRequest = 0

  async function load(...args) {
    const requestId = ++latestRequest
    isLoading.value = true
    error.value = ''
    try {
      const result = await loader(...args)
      if (requestId === latestRequest) data.value = result
    } catch (loadError) {
      if (requestId === latestRequest) {
        error.value = formatError(loadError)
        data.value = null
      }
    } finally {
      if (requestId === latestRequest) isLoading.value = false
    }
  }

  return { data, isLoading, error, load }
}
