const admin = require('../../services/AdminService')
const responder = require('../../services/ApiResponder')

module.exports = async function dashboard(req, res) {
  try {
    return res.json({ data: await admin.dashboard(req._sails, req.adminUser.gymId) })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
