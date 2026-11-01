const admin = require('../../services/AdminService')
const responder = require('../../services/ApiResponder')

module.exports = async function create(req, res) {
  try {
    return res.status(201).json({
      data: await admin.save(req._sails, req.params.resource, null, req.body, req.adminUser),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
