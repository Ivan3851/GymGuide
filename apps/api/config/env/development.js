module.exports = {
  explicitHost: process.env.HOST || '127.0.0.1',
  models: {
    migrate: 'safe',
  },
  log: {
    level: 'info',
  },
  security: { cors: { allRoutes: false } },
}
