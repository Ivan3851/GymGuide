const settings = require('../../services/KioskSettingsService')
const responder = require('../../services/ApiResponder')

module.exports = async function adminSettings(req, res) {
  try {
    const data =
      req.method === 'GET'
        ? await settings.get(req._sails, req.adminUser.gymId)
        : await settings.update(req._sails, req.body, req.adminUser)
    return res.json({ data })
  } catch (error) {
    return responder.sendError(req, res, error)
  }
}
