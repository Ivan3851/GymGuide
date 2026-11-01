const catalog = require('../../services/CatalogService')
const responder = require('../../services/ApiResponder')

module.exports = async function listMuscleGroups(req, res) {
  try {
    const data = await catalog.listMuscleGroups(req._sails)
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
