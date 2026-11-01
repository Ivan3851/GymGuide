const catalog = require('../../services/CatalogService')
const responder = require('../../services/ApiResponder')

module.exports = async function getMuscleGroupEquipment(req, res) {
  try {
    const data = await catalog.getEquipmentForMuscleGroup(req._sails, req.params.id)
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
