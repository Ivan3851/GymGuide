const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('API bootstrap and production runner do not invoke development demo seed tools', () => {
  const apiRoot = path.resolve(__dirname, '..')
  const bootstrap = fs.readFileSync(path.join(apiRoot, 'config/bootstrap.js'), 'utf8')
  const productionRunner = fs.readFileSync(
    path.join(apiRoot, 'scripts/start-production.js'),
    'utf8',
  )

  assert.doesNotMatch(bootstrap, /DemoSeedService|seed-demo/)
  assert.doesNotMatch(productionRunner, /DemoSeedService|seed-demo/)
})
