const errorKeys = new Map([
  [0, 'errors.offline'],
  [400, 'errors.invalid'],
  [401, 'errors.unauthorized'],
  [403, 'errors.forbidden'],
  [404, 'errors.notFound'],
  [409, 'errors.conflict'],
  [413, 'errors.tooLarge'],
  [415, 'errors.unsupported'],
  [422, 'errors.invalid'],
  [429, 'errors.rateLimited'],
])

export function apiErrorMessageKey(error) {
  return errorKeys.get(error?.status) || (error?.status >= 500 ? 'errors.server' : 'errors.generic')
}

export function localizeApiError(error, t) {
  return t(apiErrorMessageKey(error))
}
