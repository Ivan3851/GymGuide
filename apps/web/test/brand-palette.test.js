import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const styles = [
  new URL('../src/styles/tokens.css', import.meta.url),
  new URL('../src/styles/main.css', import.meta.url),
  new URL('../src/styles/admin.css', import.meta.url),
  new URL('../src/styles/redesign.css', import.meta.url),
]

test('the site uses a white canvas and contains no legacy blue styling', async () => {
  const source = (await Promise.all(styles.map((path) => readFile(path, 'utf8')))).join('\n')

  assert.match(source, /--color-bg:\s*#ffffff/i)
  assert.match(source, /--color-accent:\s*#ffc947/i)
  assert.match(source, /--color-text:\s*#232323/i)
  assert.doesNotMatch(source, /#39a9cb|color-blue|57\s+169\s+203/i)
})
