export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function getJson(path) {
  let response
  try {
    response = await fetch(path, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiRequestError('Could not reach GymGuide. Check that the local API is running.')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiRequestError('GymGuide returned an unreadable response.', response.status)
  }

  if (!response.ok) {
    throw new ApiRequestError(
      payload.error?.message || 'GymGuide could not load this information.',
      response.status,
    )
  }

  return payload.data
}
