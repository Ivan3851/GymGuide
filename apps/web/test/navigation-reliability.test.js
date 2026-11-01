import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createLatestRequest } from '../src/composables/latest-request.js'
import { validMapMarkers } from '../src/components/map/valid-map-markers.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('out-of-order admin responses cannot replace the currently selected resource', async () => {
  const requests = createLatestRequest()
  const exercises = deferred()
  let exerciseSignal
  const stale = requests.run((signal) => {
    exerciseSignal = signal
    return exercises.promise
  })
  const current = await requests.run(async () => ['leg press'])

  exercises.resolve(['chest press'])
  const outdated = await stale
  assert.equal(exerciseSignal.aborted, true)
  assert.deepEqual(current, { current: true, value: ['leg press'] })
  assert.deepEqual(outdated, { current: false })
})

test('invalid map positions and equipment without ids are not shown as markers', () => {
  const valid = { id: 'mark-1', x: 0.4, y: 0.7, gymEquipment: { id: 'unit-1' } }
  assert.deepEqual(
    validMapMarkers([
      valid,
      { ...valid, id: 'negative', x: -0.01 },
      { ...valid, id: 'overflow', y: 1.01 },
      { ...valid, id: 'missing-unit', gymEquipment: {} },
      { ...valid, id: 'missing-coordinate', x: Number.NaN },
    ]),
    [valid],
  )
})

test('member map uses floor-plan data and neutral markers without exercise match classes', async () => {
  const component = await readFile(new URL('../src/views/GymMapView.vue', import.meta.url), 'utf8')
  const api = await readFile(new URL('../src/api/catalog.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/styles/redesign.css', import.meta.url), 'utf8')
  assert.match(api, /\/api\/v1\/floor-plans\?includeUnavailable=true/)
  assert.match(component, /v-for="floor in floors"/)
  assert.match(component, /class="gym-map-marker"/)
  assert.doesNotMatch(component, /exercise-map-marker-(?:match|other)/)
  assert.match(styles, /\.gym-map-marker::before[\s\S]*?background: var\(--color-accent\)/)
  assert.match(styles, /\.gym-map-marker-selected::before[\s\S]*?background: var\(--color-accent\)/)
})

test('member header remains horizontal outside admin routes with map and language controls', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const header = await readFile(
    new URL('../src/components/layout/AppHeader.vue', import.meta.url),
    'utf8',
  )
  assert.match(app, /<AppHeader v-if="!isAdminRoute\(route\.path\)" \/>/)
  assert.doesNotMatch(app, /MemberSideMenu|memberMenuOpen/)
  assert.match(header, /<nav class="member-horizontal-nav"/)
  assert.match(header, /to="\/map"/)
  assert.match(header, /setLocale\('mk-MK'\)/)
  assert.match(header, /setLocale\('en'\)/)
})

test('admin resource view uses guarded abortable loads and guides edit focus', async () => {
  const view = await readFile(
    new URL('../src/views/admin/AdminResourceView.vue', import.meta.url),
    'utf8',
  )
  const styles = await readFile(new URL('../src/styles/redesign.css', import.meta.url), 'utf8')
  assert.match(view, /latestRequest\.run\(async \(signal\)/)
  assert.match(view, /getAdmin\([\s\S]*?\{ signal \}/)
  assert.match(view, /formPanel\.value\?\.scrollIntoView/)
  assert.match(view, /querySelector\('input:not\(\[type="checkbox"\]\), textarea, select'\)/)
  assert.match(view, /recordName\(records\.find\(/)
  assert.match(
    styles,
    /\.admin-resource-workspace\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column/,
  )
  assert.match(styles, /\.admin-form-editing\s*\{[\s\S]*?border-color: var\(--color-accent\)/)
})

test('direct member map navigation is served by the Sails frontend fallback', async () => {
  const routes = await readFile(new URL('../../api/config/routes.js', import.meta.url), 'utf8')
  assert.match(routes, /'GET \/map': \{ action: 'frontend\/index'/)
})
