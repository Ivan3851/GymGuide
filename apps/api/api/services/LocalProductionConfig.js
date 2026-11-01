const path = require('node:path')

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])

function parseLocalMongoUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('MONGODB_URI must be set for a production installation.')
  }

  let parsed
  try {
    parsed = new URL(uri)
  } catch {
    throw new Error('MONGODB_URI is not a valid MongoDB connection URI.')
  }

  if (parsed.protocol !== 'mongodb:') {
    throw new Error('A local GymGuide installation requires a mongodb:// URI.')
  }

  const host = (parsed.hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error('Production MongoDB must be on this PC and bound to loopback.')
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0])
  } catch {
    throw new Error('MONGODB_URI contains an invalid database name.')
  }
  if (!databaseName) throw new Error('MONGODB_URI must include a database name.')
  if (databaseName.toLowerCase() === 'gymguide_dev') {
    throw new Error('Production configuration may not use the gymguide_dev database.')
  }

  return {
    host,
    port: Number(parsed.port || 27017),
    databaseName,
  }
}

function resolveProductionConfig(env = process.env, appDirectory = process.cwd()) {
  const host = (env.HOST || '127.0.0.1').toLowerCase()
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error('Production HOST must be a loopback address.')
  }

  const mongo = parseLocalMongoUri(env.MONGODB_URI)
  const mediaDirectory = env.GYMGUIDE_MEDIA_DIR
  if (!mediaDirectory || !path.isAbsolute(mediaDirectory)) {
    throw new Error('GYMGUIDE_MEDIA_DIR must be an absolute persistent directory in production.')
  }
  const resolvedMediaDirectory = path.resolve(mediaDirectory)
  const resolvedAppDirectory = path.resolve(appDirectory)
  const relativeMediaPath = path.relative(resolvedAppDirectory, resolvedMediaDirectory)
  const mediaIsInsideApp =
    relativeMediaPath === '' ||
    (relativeMediaPath !== '..' &&
      !relativeMediaPath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeMediaPath))
  if (mediaIsInsideApp) {
    throw new Error('Production media must be stored outside the versioned application directory.')
  }

  return {
    host,
    mongoUri: env.MONGODB_URI,
    mongo,
    mediaDirectory: resolvedMediaDirectory,
  }
}

module.exports = { parseLocalMongoUri, resolveProductionConfig }
