class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

ApiError.badRequest = (message = 'The request is invalid.') =>
  new ApiError(400, 'BAD_REQUEST', message)
ApiError.notFound = (message = 'The requested record was not found.') =>
  new ApiError(404, 'NOT_FOUND', message)
ApiError.unauthorized = (message = 'Authentication is required.') =>
  new ApiError(401, 'UNAUTHORIZED', message)
ApiError.forbidden = (message = 'The request is not allowed.') =>
  new ApiError(403, 'FORBIDDEN', message)
ApiError.conflict = (message = 'The request conflicts with existing data.') =>
  new ApiError(409, 'CONFLICT', message)
ApiError.tooManyRequests = (message = 'Too many attempts. Try again later.') =>
  new ApiError(429, 'RATE_LIMITED', message)
ApiError.payloadTooLarge = (message = 'The request is too large.') =>
  new ApiError(413, 'PAYLOAD_TOO_LARGE', message)
ApiError.unsupportedMedia = (message = 'The media format is not supported.') =>
  new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message)

module.exports = ApiError
