module.exports = {
  sendError: function sendError(req, res, error) {
    const sailsInstance = req._sails

    if (error && Number.isInteger(error.status) && error.code) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
    }

    if (error && error.code === 11000) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with that identifier already exists.' },
      })
    }

    if (error && /^Mongo/.test(error.name)) {
      sailsInstance.log.error(`Catalog database request failed: ${error.name}`)
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'GymGuide data is temporarily unavailable.',
        },
      })
    }

    sailsInstance.log.error(
      `Catalog request failed: ${error && error.message ? error.message : 'Unknown error'}`,
    )
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'GymGuide could not complete the request.' },
    })
  },
}
