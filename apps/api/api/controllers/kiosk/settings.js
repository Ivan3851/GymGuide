const settings = require('../../services/KioskSettingsService')
const responder = require('../../services/ApiResponder')

module.exports = async function kioskSettings(req, res) {
  try {
    return res.json({ data: await settings.get(req._sails) })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
