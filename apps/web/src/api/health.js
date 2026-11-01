export async function fetchApiHealth(signal) {
  const response = await fetch('/api/v1/health', {
    headers: { Accept: 'application/json' },
    signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`)
  }

  return response.json()
}
