const auth = require('../../services/AdminAuthService')
const responder = require('../../services/ApiResponder')

module.exports = async function login(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const session = await auth.login(req._sails, req, body.username, body.password)
    return res.json({ data: session })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
