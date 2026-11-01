export function createLatestRequest() {
  let generation = 0
  let controller = null

  async function run(task) {
    controller?.abort()
    controller = new AbortController()
    const requestGeneration = ++generation
    try {
      const value = await task(controller.signal)
      return requestGeneration === generation ? { current: true, value } : { current: false }
    } catch (error) {
      return requestGeneration === generation ? { current: true, error } : { current: false }
    }
  }

  function cancel() {
    generation += 1
    controller?.abort()
    controller = null
  }

  return { run, cancel }
}
