const media = require('../../services/MediaService')
const responder = require('../../services/ApiResponder')

module.exports = async function mediaDelete(req, res) {
  try {
    return res.json({ data: await media.delete(req._sails, req.params.id) })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
