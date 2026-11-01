import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { exerciseMarkerClasses } from '../src/components/exercise/exercise-marker-state.js'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../src/components/floor-plan/FloorPlanCanvas.vue', import.meta.url),
)
const stylesPath = fileURLToPath(new URL('../src/styles/redesign.css', import.meta.url))
const baseStylesPath = fileURLToPath(new URL('../src/styles/main.css', import.meta.url))

test('keeps matching and unrelated machine marker states distinct', () => {
  assert.deepEqual(
    exerciseMarkerClasses({ matchesExercise: true, gymEquipment: { id: 'unit-a' } }, ''),
    {
      'exercise-map-marker-match': true,
      'exercise-map-marker-other': false,
      'exercise-map-marker-selected': false,
    },
  )
  assert.deepEqual(
    exerciseMarkerClasses({ matchesExercise: false, gymEquipment: { id: 'unit-b' } }, ''),
    {
      'exercise-map-marker-match': false,
      'exercise-map-marker-other': true,
      'exercise-map-marker-selected': false,
    },
  )
})

test('marks only the selected physical machine as selected', () => {
  const marker = { matchesExercise: true, gymEquipment: { id: 'unit-a' } }
  assert.equal(exerciseMarkerClasses(marker, 'unit-a')['exercise-map-marker-selected'], true)
  assert.equal(exerciseMarkerClasses(marker, 'unit-b')['exercise-map-marker-selected'], false)
})

test('uses accessible dot buttons without permanent map labels', async () => {
  const component = await readFile(componentPath, 'utf8')
  assert.match(component, /:aria-label="label\(marker\)"/)
  assert.match(component, /@click="emit\('select-marker', marker\.gymEquipment\.id\)"/)
  assert.doesNotMatch(component, /\{\{\s*marker\.gymEquipment\.displayName\s*\}\}/)
  assert.match(component, /marker\.x \* 100/)
  assert.match(component, /marker\.y \* 100/)
})

test('keeps the map and info panel side by side on large displays and stacked on smaller ones', async () => {
  const styles = await readFile(stylesPath, 'utf8')
  const baseStyles = await readFile(baseStylesPath, 'utf8')
  assert.match(
    baseStyles,
    /@media \(min-width: 1100px\)[\s\S]*?\.exercise-floorplan-layout\s*\{[\s\S]*?minmax\(250px, 320px\)/,
  )
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.exercise-floorplan-layout\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
  )
  assert.match(
    styles,
    /\.exercise-map-marker::before\s*\{[\s\S]*?width: 17px;[\s\S]*?height: 17px;/,
  )
  assert.match(baseStyles, /\.exercise-map-marker\s*\{[\s\S]*?width: var\(--touch-target\)/)
})

test('removes marker root fills and shadows while retaining the transparent touch target', async () => {
  const styles = await readFile(stylesPath, 'utf8')
  const baseStyles = await readFile(baseStylesPath, 'utf8')
  const markerRule = styles.match(/\.exercise-map-marker\s*\{([^}]*)\}/)?.[1] || ''
  const matchRule = styles.match(/\.exercise-map-marker-match\s*\{([^}]*)\}/)?.[1] || ''
  assert.doesNotMatch(markerRule, /border: 3px solid var\(--color-bg\)/)
  assert.doesNotMatch(markerRule, /background: var\(--color-text\)/)
  assert.doesNotMatch(markerRule, /box-shadow:/)
  assert.doesNotMatch(matchRule, /background: var\(--color-accent\)|box-shadow:/)
  assert.match(
    baseStyles,
    /\.exercise-map-marker\s*\{[\s\S]*?width: var\(--touch-target\);[\s\S]*?height: var\(--touch-target\);[\s\S]*?background: transparent/,
  )
})
