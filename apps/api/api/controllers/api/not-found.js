module.exports = function apiNotFound(req, res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found.' } })
}
