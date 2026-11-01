export async function fetchApiHealth() {
  const response = await fetch('/api/v1/health', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`)
  }

  return response.json()
}
