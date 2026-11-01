const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function listFloorPlans(req, res) {
  try {
    return res.json({ data: await floorPlans.listMemberFloorPlans(req._sails) })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
