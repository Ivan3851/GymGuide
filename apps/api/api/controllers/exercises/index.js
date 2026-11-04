const catalog = require('../../services/CatalogService')
const responder = require('../../services/ApiResponder')

module.exports = async function listExercises(req, res) {
  try {
    const data = await catalog.getExerciseDirectory(req._sails)
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
