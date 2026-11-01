module.exports = async function session(req, res) {
  res.set('Cache-Control', 'no-store')
  if (!req.session || !req.session.adminId)
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED', message: 'No active admin session.' } })
  try {
    const db = req._sails.hooks.orm.datastores.default.manager.client.db()
    const user = await db
      .collection('adminUsers')
      .findOne({ _id: req.session.adminId, isActive: true })
    if (!user) {
      req.session.destroy(() => {})
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Your admin session has expired. Please sign in again.',
        },
      })
    }
    if (!req.session.csrfToken)
      req.session.csrfToken = require('../../services/AdminAuthService').csrfToken()
    return res.json({
      data: {
        user: {
          id: String(user._id),
          username: user.username,
          email: user.email || null,
          role: user.role,
          gymId: user.gymId,
        },
        csrfToken: req.session.csrfToken,
      },
    })
  } catch (error) {
    req._sails.log.error(`Admin session lookup failed: ${error.message}`)
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'GymGuide data is temporarily unavailable.',
      },
    })
  }
}
