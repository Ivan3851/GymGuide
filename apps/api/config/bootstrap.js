const databaseIndexes = require('../api/services/DatabaseIndexes')
const media = require('../api/services/MediaService')

module.exports.bootstrap = async function bootstrap() {
  await databaseIndexes.ensure(require('sails'))
  await media.cleanupInterruptedUploads(require('sails'))
}
