export async function getKioskSettings() {
  const response = await fetch('/api/v1/kiosk/settings', {
    headers: { Accept: 'application/json' },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error?.message || 'Could not load kiosk settings.')
  return payload.data
}
