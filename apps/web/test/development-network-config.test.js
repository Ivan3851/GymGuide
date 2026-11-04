import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Vite retains LAN development access and proxies API requests only to loopback', async () => {
  const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
  const rootPackage = JSON.parse(
    await readFile(new URL('../../../package.json', import.meta.url), 'utf8'),
  )

  assert.match(viteConfig, /host: '0\.0\.0\.0'/)
  assert.match(viteConfig, /target: 'http:\/\/127\.0\.0\.1:1337'/)
  assert.equal(rootPackage.scripts['dev:web'], 'npm --prefix apps/web run dev')
  assert.doesNotMatch(rootPackage.scripts['dev:web'], /--host/)
})

test('production runner keeps its loopback-only host check', async () => {
  const runner = await readFile(
    new URL('../../api/scripts/start-production.js', import.meta.url),
    'utf8',
  )
  assert.match(runner, /\['127\.0\.0\.1', '::1', 'localhost'\]/)
})
