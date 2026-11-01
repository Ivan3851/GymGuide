let csrfToken = null

export class AdminApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  let token = csrfToken
  if (options.method && options.method !== 'GET') {
    const csrfResponse = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
    const csrfPayload = await csrfResponse.json()
    if (!csrfResponse.ok)
      throw new AdminApiError('Could not establish a secure admin session.', csrfResponse.status)
    token = csrfToken = csrfPayload.data.csrfToken
  }
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-Token': token } : {}),
    },
    ...options,
  })
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new AdminApiError('GymGuide returned an unreadable response.', response.status)
  }
  if (!response.ok)
    throw new AdminApiError(payload.error?.message || 'The admin request failed.', response.status)
  return payload.data
}

export async function getAdminSession() {
  const data = await request('/api/v1/auth/session')
  csrfToken = data.csrfToken
  return data.user
}

export async function signIn(username, password) {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  csrfToken = data.csrfToken
  return data.user
}

export async function signOut() {
  try {
    await request('/api/v1/auth/logout', { method: 'POST' })
  } finally {
    csrfToken = null
  }
}

export const getAdmin = (path) => request(`/api/v1/admin/${path}`)
export const getAdminSettings = () => request('/api/v1/admin/settings')
export const updateAdminSettings = (payload) =>
  request('/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify(payload) })
export const createAdminRecord = (resource, payload) =>
  request(`/api/v1/admin/${resource}`, { method: 'POST', body: JSON.stringify(payload) })
export const updateAdminRecord = (resource, id, payload) =>
  request(`/api/v1/admin/${resource}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
export const setAdminRecordArchived = (resource, id, archived) =>
  request(
    `/api/v1/admin/${resource}/${encodeURIComponent(id)}/${archived ? 'archive' : 'restore'}`,
    { method: 'PATCH', body: '{}' },
  )

export const deleteAdminMedia = (id) =>
  request(`/api/v1/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' })

export async function uploadAdminMedia(file, onProgress = () => {}) {
  const csrfResponse = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
  const csrfPayload = await csrfResponse.json()
  if (!csrfResponse.ok)
    throw new AdminApiError('Could not establish a secure admin session.', csrfResponse.status)
  csrfToken = csrfPayload.data.csrfToken
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/v1/admin/media')
    request.withCredentials = true
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('X-CSRF-Token', csrfToken)
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener('load', () => {
      let payload
      try {
        payload = JSON.parse(request.responseText)
      } catch {
        reject(new AdminApiError('GymGuide returned an unreadable response.', request.status))
        return
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new AdminApiError(payload.error?.message || 'The upload failed.', request.status))
        return
      }
      resolve(payload.data)
    })
    request.addEventListener('error', () =>
      reject(new AdminApiError('The upload could not reach GymGuide.', 0)),
    )
    const formData = new FormData()
    formData.append('file', file)
    request.send(formData)
  })
}

export const getAdminFloorPlanMarkers = (id) =>
  getAdmin(`floor-plans/${encodeURIComponent(id)}/markers`)
export const saveAdminFloorPlanMarker = (floorPlanId, equipmentId, position) =>
  request(
    `/api/v1/admin/floor-plans/${encodeURIComponent(floorPlanId)}/markers/${encodeURIComponent(equipmentId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(position),
    },
  )
export const deleteAdminFloorPlanMarker = (floorPlanId, equipmentId) =>
  request(
    `/api/v1/admin/floor-plans/${encodeURIComponent(floorPlanId)}/markers/${encodeURIComponent(equipmentId)}`,
    {
      method: 'DELETE',
    },
  )

export function clearAdminCsrf() {
  csrfToken = null
}
