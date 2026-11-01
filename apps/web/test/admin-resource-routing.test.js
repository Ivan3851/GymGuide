import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  adminContentResources,
  adminContentResourcePath,
} from '../src/admin/admin-content-resources.js'
import { adminResourceDefinitions } from '../src/admin/admin-resource-definitions.js'
import { adminResourceRouteTarget } from '../src/admin/admin-resource-route.js'

test('every supported admin navigation resource resolves to its matching editor', () => {
  assert.deepEqual(
    Object.keys(adminResourceDefinitions).sort(),
    Object.keys(adminContentResources).sort(),
  )

  for (const resource of Object.keys(adminContentResources)) {
    assert.equal(adminResourceRouteTarget(resource), true)
    assert.equal(adminContentResourcePath(resource), `/admin/content/${resource}`)
  }
})

test('malformed and record-ID resource segments reach the intentional admin not-found route', () => {
  for (const invalidResource of ['muscleGroups', 'equipmentTypeId', 'record-123', 'unknown']) {
    assert.deepEqual(adminResourceRouteTarget(invalidResource), { name: 'admin-not-found' })
  }
})

test('Sails serves the frontend shell for a direct admin URL refresh', async () => {
  const routes = await readFile(new URL('../../api/config/routes.js', import.meta.url), 'utf8')
  assert.match(routes, /'GET \/admin\/\*': \{ action: 'frontend\/index'/)
})
