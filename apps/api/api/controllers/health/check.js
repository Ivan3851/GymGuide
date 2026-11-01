const databaseHealth = require('../../services/DatabaseHealth')

module.exports = async function checkHealth(req, res) {
  const sailsInstance = req._sails

  try {
    await databaseHealth.ping(sailsInstance)

    return res.json({
      status: 'ok',
      database: 'connected',
      service: 'gymguide-api',
    })
  } catch (error) {
    sailsInstance.log.error(`Health check failed: ${error.name}: ${error.message}`)

    return res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      service: 'gymguide-api',
    })
  }
}
