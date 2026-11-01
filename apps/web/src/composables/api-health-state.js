export function isBackendRecovery(previousConnectionState, nextConnectionState, hasChecked) {
  return hasChecked && previousConnectionState === false && nextConnectionState === true
}
