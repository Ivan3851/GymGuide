const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function saveMarker(req, res) {
  try {
    const data = await floorPlans.saveMarker(
      req._sails,
      req.params.id,
      req.params.equipmentId,
      req.body,
      req.adminUser,
    )
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
