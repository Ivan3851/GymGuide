const { resolveProductionConfig } = require('../../api/services/LocalProductionConfig')

const production = resolveProductionConfig(process.env, process.cwd())

module.exports = {
  explicitHost: production.host,
  models: {
    migrate: 'safe',
  },
  log: {
    level: 'warn',
  },
  security: { cors: { allRoutes: false } },
}
