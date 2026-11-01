const media = require('../../services/MediaService')
const responder = require('../../services/ApiResponder')

module.exports = async function mediaList(req, res) {
  try {
    return res.json({ data: await media.list(req._sails) })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
