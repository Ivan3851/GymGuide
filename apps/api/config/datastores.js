const { resolveProductionConfig } = require('../api/services/LocalProductionConfig')

const isProduction = process.env.NODE_ENV === 'production'
const url = isProduction
  ? resolveProductionConfig(process.env, process.cwd()).mongoUri
  : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gymguide_dev'

module.exports.datastores = {
  default: {
    adapter: 'sails-mongo',
    url,
  },
}
