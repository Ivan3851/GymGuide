export function createMemberIdleController({
  timeoutMs,
  isVideoPlaying,
  onTimeout,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let activeTimeoutMs = timeoutMs
  let timerId = null
  let enabled = false
  let resetPending = false

  function clearTimerIfNeeded() {
    if (timerId !== null) clearTimer(timerId)
    timerId = null
  }

  function expire() {
    timerId = null
    if (!enabled) return
    if (isVideoPlaying()) {
      resetPending = true
      return
    }
    resetPending = false
    onTimeout()
  }

  function restart() {
    clearTimerIfNeeded()
    resetPending = false
    if (enabled) timerId = setTimer(expire, activeTimeoutMs)
  }

  return {
    start() {
      enabled = true
      restart()
    },
    stop() {
      enabled = false
      resetPending = false
      clearTimerIfNeeded()
    },
    interact() {
      if (enabled) restart()
    },
    setTimeoutMs(value) {
      activeTimeoutMs = value
      if (enabled) restart()
    },
    playbackStopped() {
      if (enabled && resetPending && !isVideoPlaying()) {
        resetPending = false
        onTimeout()
      }
    },
    get enabled() {
      return enabled
    },
    get resetPending() {
      return resetPending
    },
  }
}
