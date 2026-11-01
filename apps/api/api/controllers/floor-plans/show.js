const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function showFloorPlan(req, res) {
  try {
    const data = await floorPlans.getMemberFloorPlan(req._sails, req.params.id)
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
