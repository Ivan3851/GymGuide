const ApiError = require('./ApiError')

const DEFAULT_TIMEOUT_SECONDS = 60
const MIN_TIMEOUT_SECONDS = 15
const MAX_TIMEOUT_SECONDS = 600

function database(sailsInstance) {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore?.manager?.client) {
    const error = new Error('MongoDB is not connected.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}

function currentGymId() {
  return process.env.GYMGUIDE_GYM_ID || 'demo-gym'
}

function readTimeout(gym) {
  const timeout = gym.settings?.memberInactivityTimeoutSeconds
  return Number.isInteger(timeout) &&
    timeout >= MIN_TIMEOUT_SECONDS &&
    timeout <= MAX_TIMEOUT_SECONDS
    ? timeout
    : DEFAULT_TIMEOUT_SECONDS
}

module.exports = {
  DEFAULT_TIMEOUT_SECONDS,
  MIN_TIMEOUT_SECONDS,
  MAX_TIMEOUT_SECONDS,

  get: async function getSettings(sailsInstance, gymId = currentGymId()) {
    const db = database(sailsInstance)
    const gym = await db.collection('gyms').findOne({ _id: gymId, status: 'active' })
    if (!gym) throw ApiError.notFound('The configured gym was not found.')
    const timeout = readTimeout(gym)
    if (gym.settings?.memberInactivityTimeoutSeconds !== timeout) {
      await db.collection('gyms').updateOne(
        {
          _id: gymId,
          status: 'active',
          'settings.memberInactivityTimeoutSeconds': { $exists: false },
        },
        { $set: { 'settings.memberInactivityTimeoutSeconds': timeout } },
      )
    }
    return { memberInactivityTimeoutSeconds: timeout }
  },

  update: async function updateSettings(sailsInstance, input, user) {
    const timeout = input?.memberInactivityTimeoutSeconds
    if (
      !Number.isInteger(timeout) ||
      timeout < MIN_TIMEOUT_SECONDS ||
      timeout > MAX_TIMEOUT_SECONDS
    ) {
      throw ApiError.badRequest(
        `Member inactivity timeout must be a whole number from ${MIN_TIMEOUT_SECONDS} to ${MAX_TIMEOUT_SECONDS} seconds.`,
      )
    }
    const db = database(sailsInstance)
    const result = await db
      .collection('gyms')
      .updateOne(
        { _id: user.gymId, status: 'active' },
        { $set: { 'settings.memberInactivityTimeoutSeconds': timeout, updatedAt: Date.now() } },
      )
    if (!result.matchedCount) throw ApiError.notFound('The configured gym was not found.')
    return { memberInactivityTimeoutSeconds: timeout }
  },
}
