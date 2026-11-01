const floorPlans = require('../../services/FloorPlanService')
const responder = require('../../services/ApiResponder')

module.exports = async function listFloorPlans(req, res) {
  try {
    return res.json({
      data: await floorPlans.listMemberFloorPlans(req._sails, undefined, {
        includeUnavailable: req.query.includeUnavailable === 'true',
        includeMissingImages: req.query.includeMissingImages === 'true',
      }),
    })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
