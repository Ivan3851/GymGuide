const path = require('node:path')

module.exports = function frontendIndex(req, res) {
  return res.sendFile(path.resolve(req._sails.config.appPath, 'assets', 'index.html'))
}
