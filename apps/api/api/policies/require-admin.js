const ApiError = require('../services/ApiError')

module.exports = async function requireAdmin(req, res, proceed) {
  res.set('Cache-Control', 'no-store')
  const adminId = req.session && req.session.adminId
  if (!adminId)
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED', message: 'Please sign in to continue.' } })

  try {
    const db = req._sails.hooks.orm.datastores.default.manager.client.db()
    const user = await db.collection('adminUsers').findOne({ _id: adminId, isActive: true })
    if (!user) {
      req.session.destroy(() => {})
      throw ApiError.unauthorized('Your admin session has expired. Please sign in again.')
    }
    req.adminUser = {
      id: String(user._id),
      username: user.username,
      email: user.email || null,
      role: user.role,
      gymId: user.gymId,
    }
    return proceed()
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: { code: error.code, message: error.message } })
    req._sails.log.error(`Admin authorization failed: ${error.message}`)
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'GymGuide data is temporarily unavailable.',
      },
    })
  }
}
