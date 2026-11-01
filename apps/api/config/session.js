const sessionSecret = process.env.SESSION_SECRET

if (process.env.NODE_ENV === 'production') {
  if (!sessionSecret) throw new Error('SESSION_SECRET must be set in production.')
  if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 bytes in production.')
  }
}

module.exports.session = {
  secret: sessionSecret || 'development-only-session-secret-do-not-deploy',
  name: 'gymguide.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    maxAge: Number(process.env.ADMIN_SESSION_MAX_AGE_MS || 8 * 60 * 60 * 1000),
  },
}
