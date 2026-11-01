import { isAdminContentResource } from './admin-content-resources.js'

export function adminResourceRouteTarget(resource) {
  return isAdminContentResource(resource) ? true : { name: 'admin-not-found' }
}
