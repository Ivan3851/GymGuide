module.exports = function requireCsrf(req, res, proceed) {
  res.set('Cache-Control', 'no-store')
  const expected = req.session && req.session.csrfToken
  const supplied = req.headers['x-csrf-token']
  if (!expected || typeof supplied !== 'string' || supplied.length !== expected.length) {
    return res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'The security token is missing or expired. Refresh and try again.',
      },
    })
  }
  const crypto = require('crypto')
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'The security token is missing or expired. Refresh and try again.',
      },
    })
  }
  return proceed()
}
