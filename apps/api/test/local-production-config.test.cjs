const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')
const {
  parseLocalMongoUri,
  resolveProductionConfig,
} = require('../api/services/LocalProductionConfig')

test('production configuration accepts local MongoDB and persistent media paths', () => {
  const config = resolveProductionConfig(
    {
      HOST: '127.0.0.1',
      MONGODB_URI: 'mongodb://127.0.0.1:27018/gymguide',
      GYMGUIDE_MEDIA_DIR: path.resolve('..', 'GymGuideData', 'media'),
    },
    path.resolve('app'),
  )
  assert.equal(config.mongo.host, '127.0.0.1')
  assert.equal(config.mongo.port, 27018)
  assert.equal(config.mongo.databaseName, 'gymguide')
})

test('production configuration rejects missing, remote, or development MongoDB targets', () => {
  for (const uri of [
    undefined,
    'mongodb://example.com/gymguide',
    'mongodb://localhost/gymguide_dev',
  ]) {
    assert.throws(() => parseLocalMongoUri(uri))
  }
})

test('production configuration rejects non-loopback bind and media inside the app release', () => {
  const base = {
    MONGODB_URI: 'mongodb://127.0.0.1:27017/gymguide',
    GYMGUIDE_MEDIA_DIR: path.resolve('release', 'data', 'media'),
  }
  assert.throws(() =>
    resolveProductionConfig({ ...base, HOST: '0.0.0.0' }, path.resolve('release')),
  )
  assert.throws(() => resolveProductionConfig(base, path.resolve('release')))
})
