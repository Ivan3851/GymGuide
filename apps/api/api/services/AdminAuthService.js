const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const ApiError = require('./ApiError')

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12)

function database(sailsInstance) {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore || !datastore.manager || !datastore.manager.client) {
    const error = new Error('MongoDB is not connected.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}

function csrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

function checkRateLimit(key) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    attempts.set(key, { startedAt: now, count: 0 })
    return
  }
  if (entry.count >= MAX_ATTEMPTS) throw ApiError.tooManyRequests()
}

module.exports = {
  csrfToken,
  login: async function login(sailsInstance, req, username, password) {
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length > 254 ||
      password.length > 256 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw ApiError.unauthorized('The username or password is incorrect.')
    }
    const normalized = username.trim().toLowerCase()
    const key = req.ip || req.socket.remoteAddress
    checkRateLimit(key)
    const entry = attempts.get(key)
    entry.count += 1

    const db = database(sailsInstance)
    const user = await db.collection('adminUsers').findOne({
      $or: [{ username: normalized }, { email: normalized }],
      isActive: true,
    })
    const hash = user ? user.passwordHash : DUMMY_HASH
    const matches = await bcrypt.compare(password, hash)
    if (!user || !matches) throw ApiError.unauthorized('The username or password is incorrect.')

    attempts.delete(key)
    await new Promise((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    )
    req.session.adminId = String(user._id)
    req.session.csrfToken = csrfToken()
    await new Promise((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    )
    return {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email || null,
        role: user.role,
        gymId: user.gymId,
      },
      csrfToken: req.session.csrfToken,
    }
  },
}
