const media = require('../../services/MediaService')
const responder = require('../../services/ApiResponder')

module.exports = async function mediaUpload(req, res) {
  try {
    const asset = await media.upload(req._sails, req)
    return res.status(201).json({ data: asset })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
