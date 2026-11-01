const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function listMarkers(req, res) {
  try {
    return res.json({
      data: await floorPlans.listAdminMarkers(req._sails, req.params.id, req.adminUser),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
