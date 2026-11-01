const admin = require('../../services/AdminService')
const responder = require('../../services/ApiResponder')

module.exports = async function update(req, res) {
  try {
    return res.json({
      data: await admin.save(
        req._sails,
        req.params.resource,
        req.params.id,
        req.body,
        req.adminUser,
      ),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
