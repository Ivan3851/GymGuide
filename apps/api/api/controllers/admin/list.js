const admin = require('../../services/AdminService')
const responder = require('../../services/ApiResponder')

module.exports = async function list(req, res) {
  try {
    return res.json({
      data: await admin.list(
        req._sails,
        req.params.resource,
        req.adminUser,
        req.query.includeArchived === 'true',
      ),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
