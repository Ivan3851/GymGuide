const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function deleteMarker(req, res) {
  try {
    const data = await floorPlans.deleteMarker(
      req._sails,
      req.params.id,
      req.params.equipmentId,
      req.adminUser,
    )
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
