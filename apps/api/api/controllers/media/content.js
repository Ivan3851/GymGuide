const media = require('../../services/MediaService')
const responder = require('../../services/ApiResponder')

module.exports = async function mediaContent(req, res) {
  try {
    return await media.stream(req._sails, req, res, req.params.id)
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
