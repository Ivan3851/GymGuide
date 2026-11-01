const auth = require('../../services/AdminAuthService')

module.exports = function csrf(req, res) {
  res.set('Cache-Control', 'no-store')
  if (!req.session.csrfToken) req.session.csrfToken = auth.csrfToken()
  return res.json({ data: { csrfToken: req.session.csrfToken } })
}
