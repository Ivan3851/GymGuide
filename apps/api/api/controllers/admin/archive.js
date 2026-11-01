const admin = require('../../services/AdminService')
const responder = require('../../services/ApiResponder')

module.exports = async function archive(req, res) {
  try {
    return res.json({
      data: await admin.archive(
        req._sails,
        req.params.resource,
        req.params.id,
        req.adminUser,
        false,
      ),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
