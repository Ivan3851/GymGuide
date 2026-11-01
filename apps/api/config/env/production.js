module.exports = {
  explicitHost: process.env.HOST || '127.0.0.1',
  models: {
    migrate: 'safe',
  },
  log: {
    level: 'warn',
  },
  security: { cors: { allRoutes: false } },
}
