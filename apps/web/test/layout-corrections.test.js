import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const stylesUrl = new URL('../src/styles/redesign.css', import.meta.url)

test('admin shell uses near full viewport width and its main area has compact internal padding', async () => {
  const styles = await readFile(stylesUrl, 'utf8')
  assert.match(styles, /\.admin-shell\s*\{[^}]*width: 98%;[^}]*margin-inline: auto/)
  assert.match(
    styles,
    /\.admin-main\s*\{[^}]*max-width: none;[^}]*padding: clamp\(10px, 1\.1vw, 16px\)/,
  )
  assert.match(styles, /\.main-content-admin\s*\{[^}]*width: 100%;[^}]*max-width: none/)
})

test('floor editor stacks sections and gives the proportional canvas its full parent width', async () => {
  const styles = await readFile(stylesUrl, 'utf8')
  const view = await readFile(
    new URL('../src/views/admin/AdminFloorPlanEditorView.vue', import.meta.url),
    'utf8',
  )
  assert.match(styles, /\.floor-editor-layout\s*\{[^}]*display: flex;[^}]*flex-direction: column/)
  assert.match(
    styles,
    /\.floor-editor-canvas-area\s*\{[^}]*width: 100%;[^}]*max-width: none;[^}]*min-width: 0;[^}]*flex: 1 1 100%/,
  )
  assert.match(
    styles,
    /\.floor-editor-frame img\s*\{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: contain/,
  )
  assert.match(view, /naturalWidth \/ image\.naturalHeight/)
  assert.match(view, /aspectRatio: imageAspectRatio/)
})

test('member navigation sticks at the top without replacing horizontal links with a drawer', async () => {
  const styles = await readFile(stylesUrl, 'utf8')
  const header = await readFile(
    new URL('../src/components/layout/AppHeader.vue', import.meta.url),
    'utf8',
  )
  assert.match(styles, /position: sticky;[\s\S]{0,30}top: 0/)
  assert.match(styles, /\.member-horizontal-nav\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap/)
  assert.match(styles, /\.main-content\s*\{[^}]*scroll-padding-top: 110px/)
  assert.match(header, /class="member-horizontal-nav"/)
  assert.doesNotMatch(header, /hamburger|drawer|toggle-menu/i)
})

test('sidebar logout remains in a route-independent flex column and at the bottom', async () => {
  const styles = await readFile(stylesUrl, 'utf8')
  const shell = await readFile(
    new URL('../src/views/admin/AdminShell.vue', import.meta.url),
    'utf8',
  )
  assert.match(styles, /\.admin-sidebar\s*\{[^}]*display: flex;[^}]*flex-direction: column/)
  assert.match(styles, /\.admin-sidebar-footer\s*\{[^}]*margin-top: auto/)
  assert.match(
    shell,
    /<nav[\s\S]*?<\/nav>[\s\S]*?class="admin-sidebar-footer"[\s\S]*?admin\.logout/,
  )
})
