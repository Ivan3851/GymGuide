const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const ApiError = require('./ApiError')
const referenceLock = require('./MediaReferenceLock')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const formats = {
  '.mp4': { mediaType: 'video', mimeType: 'video/mp4' },
  '.jpg': { mediaType: 'image', mimeType: 'image/jpeg' },
  '.jpeg': { mediaType: 'image', mimeType: 'image/jpeg' },
  '.png': { mediaType: 'image', mimeType: 'image/png' },
  '.webp': { mediaType: 'image', mimeType: 'image/webp' },
}
const defaultVideoLimit = 512 * 1024 * 1024
const defaultImageLimit = 15 * 1024 * 1024

function limits() {
  const video = Number(process.env.MEDIA_MAX_VIDEO_BYTES || defaultVideoLimit)
  const image = Number(process.env.MEDIA_MAX_IMAGE_BYTES || defaultImageLimit)
  if (!Number.isSafeInteger(video) || video < 1 || !Number.isSafeInteger(image) || image < 1) {
    throw new Error('Media upload size configuration is invalid.')
  }
  return { video, image, upload: Math.max(video, image) }
}

function paths(sailsInstance) {
  const root = path.resolve(
    process.env.GYMGUIDE_MEDIA_DIR ||
      path.resolve(sailsInstance.config.appPath, '../../data/media'),
  )
  return { root, incoming: path.join(root, '.incoming'), files: path.join(root, 'files') }
}

async function ensureDirectories(sailsInstance) {
  const locations = paths(sailsInstance)
  await Promise.all([
    fs.promises.mkdir(locations.incoming, { recursive: true }),
    fs.promises.mkdir(locations.files, { recursive: true }),
  ])
  return locations
}

function database(sailsInstance) {
  const datastore = sailsInstance.hooks.orm.datastores.default
  if (!datastore || !datastore.manager || !datastore.manager.client) {
    const error = new Error('MongoDB is not connected.')
    error.name = 'MongoDatabaseUnavailable'
    throw error
  }
  return datastore.manager.client.db()
}

function publicAsset(asset) {
  return {
    id: String(asset._id),
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    mediaType: asset.mediaType,
    size: asset.size,
    createdAt: asset.createdAt,
    contentUrl: `/api/v1/media/${asset._id}/content`,
  }
}

function validStorageName(value) {
  if (typeof value !== 'string') return false
  const match = /^(.+)\.(mp4|jpg|jpeg|png|webp)$/i.exec(value)
  return Boolean(match && UUID_PATTERN.test(match[1]))
}

function incomingPath(location, descriptor) {
  if (!descriptor || typeof descriptor.fd !== 'string')
    throw new Error('Upload temporary file is invalid.')
  const resolved = path.resolve(descriptor.fd)
  if (path.dirname(resolved) !== location.incoming)
    throw new Error('Upload temporary path is invalid.')
  return resolved
}

function safeOriginalName(name) {
  if (typeof name !== 'string') throw ApiError.badRequest('An original filename is required.')
  const cleaned = [...name.replace(/[\\/]/g, '_')]
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
    .trim()
    .slice(0, 255)
  if (!cleaned || cleaned === '.' || cleaned === '..')
    throw ApiError.badRequest('The filename is invalid.')
  return cleaned
}

async function sniffFile(filePath, format) {
  const handle = await fs.promises.open(filePath, 'r')
  try {
    const header = Buffer.alloc(12)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    if (format.mimeType === 'image/jpeg')
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
    if (format.mimeType === 'image/png')
      return (
        bytesRead >= 8 &&
        header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
    if (format.mimeType === 'image/webp')
      return (
        bytesRead >= 12 &&
        header.toString('ascii', 0, 4) === 'RIFF' &&
        header.toString('ascii', 8, 12) === 'WEBP'
      )
    if (format.mimeType === 'video/mp4')
      return bytesRead >= 12 && header.toString('ascii', 4, 8) === 'ftyp'
    return false
  } finally {
    await handle.close()
  }
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

async function removeFile(filePath) {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

function referenceConflict() {
  return ApiError.conflict(
    'This media is attached to an exercise or floor plan and cannot be deleted.',
  )
}

async function isReferenced(db, id) {
  const [exercise, floorPlan] = await Promise.all([
    db
      .collection('exercises')
      .findOne({ $or: [{ videoMediaId: id }, { imageMediaIds: id }] }, { projection: { _id: 1 } }),
    db.collection('gymFloorPlans').findOne({ imageMediaId: id }, { projection: { _id: 1 } }),
  ])
  return Boolean(exercise || floorPlan)
}

async function isPublishedReference(db, asset) {
  if (asset.mediaType === 'video') {
    return Boolean(
      await db
        .collection('exercises')
        .findOne({ videoMediaId: String(asset._id), isActive: true }, { projection: { _id: 1 } }),
    )
  }
  const [exercise, floorPlan] = await Promise.all([
    db
      .collection('exercises')
      .findOne({ imageMediaIds: String(asset._id), isActive: true }, { projection: { _id: 1 } }),
    db.collection('gymFloorPlans').findOne(
      {
        imageMediaId: String(asset._id),
        isActive: true,
        gymId: process.env.GYMGUIDE_GYM_ID || 'demo-gym',
      },
      { projection: { _id: 1 } },
    ),
  ])
  return Boolean(exercise || floorPlan)
}

async function isAdmin(req, db) {
  if (!req.session || !req.session.adminId) return false
  return Boolean(
    await db
      .collection('adminUsers')
      .findOne({ _id: req.session.adminId, isActive: true }, { projection: { _id: 1 } }),
  )
}

function parseRange(header, size) {
  if (!header) return null
  if (typeof header !== 'string' || !header.startsWith('bytes=') || header.includes(','))
    return false
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || size < 1 || (!match[1] && !match[2])) return false
  let start
  let end
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : size - 1
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size)
      return false
    end = Math.min(end, size - 1)
  }
  return { start, end }
}

module.exports = {
  paths,
  publicAsset,
  limits,
  referenceLock,

  list: async function list(sailsInstance) {
    const db = database(sailsInstance)
    const records = await db
      .collection('mediaAssets')
      .find({ status: 'ready' })
      .sort({ createdAt: -1 })
      .toArray()
    return records.map(publicAsset)
  },

  upload: async function upload(sailsInstance, req) {
    const location = await ensureDirectories(sailsInstance)
    const configuredLimits = limits()
    return new Promise((resolve, reject) => {
      req.file('file').upload(
        {
          dirname: location.incoming,
          maxBytes: configuredLimits.upload,
          saveAs: (_file, next) => next(null, `${crypto.randomUUID()}.part`),
        },
        async (uploadError, files) => {
          const temporaryFiles = (files || [])
            .map((file) => {
              try {
                return incomingPath(location, file)
              } catch {
                return null
              }
            })
            .filter(Boolean)

          if (uploadError) {
            await Promise.all(
              temporaryFiles.map(removeFile).map((promise) => promise.catch(() => {})),
            )
            if (
              uploadError.code === 'E_EXCEEDS_UPLOAD_LIMIT' ||
              uploadError.code === 'E_EXCEEDS_FILE_SIZE_LIMIT'
            ) {
              return reject(
                ApiError.payloadTooLarge('The upload exceeds GymGuide’s configured size limit.'),
              )
            }
            return reject(
              ApiError.badRequest('The upload was interrupted or could not be received.'),
            )
          }
          if (!files || files.length !== 1) {
            await Promise.all(
              temporaryFiles.map(removeFile).map((promise) => promise.catch(() => {})),
            )
            return reject(ApiError.badRequest('Upload exactly one file in the “file” field.'))
          }

          const file = files[0]
          let tempPath
          let finalPath
          let finalFileCreated = false
          let assetId
          try {
            tempPath = incomingPath(location, file)
            const originalName = safeOriginalName(file.filename)
            const extension = path.extname(originalName).toLowerCase()
            const format = formats[extension]
            if (!format || file.type !== format.mimeType) {
              throw ApiError.unsupportedMedia(
                'Only MP4, JPEG, PNG and WebP files with matching media types are supported.',
              )
            }
            const limit =
              format.mediaType === 'video' ? configuredLimits.video : configuredLimits.image
            const stats = await fs.promises.stat(tempPath)
            if (stats.size < 1) throw ApiError.badRequest('The uploaded file is empty.')
            if (stats.size > limit)
              throw ApiError.payloadTooLarge(
                'This file exceeds the configured size limit for its media type.',
              )
            if (!(await sniffFile(tempPath, format)))
              throw ApiError.unsupportedMedia(
                'The file contents do not match the supported format.',
              )

            assetId = crypto.randomUUID()
            const storageName = `${assetId}${extension}`
            finalPath = path.join(location.files, storageName)
            const now = Date.now()
            const record = {
              _id: assetId,
              originalName,
              storageName,
              mimeType: format.mimeType,
              mediaType: format.mediaType,
              size: stats.size,
              sha256: await hashFile(tempPath),
              status: 'uploading',
              uploadedBy: String(req.adminUser.id),
              createdAt: now,
              updatedAt: now,
            }
            const db = database(sailsInstance)
            await db.collection('mediaAssets').insertOne(record)
            const destination = fs.createWriteStream(finalPath, { flags: 'wx', mode: 0o600 })
            destination.once('open', () => {
              finalFileCreated = true
            })
            await pipeline(fs.createReadStream(tempPath), destination)
            await removeFile(tempPath)
            const ready = await db
              .collection('mediaAssets')
              .updateOne(
                { _id: assetId, status: 'uploading' },
                { $set: { status: 'ready', updatedAt: Date.now() } },
              )
            if (ready.matchedCount !== 1) throw new Error('Could not finalize media metadata.')
            return resolve(publicAsset({ ...record, status: 'ready' }))
          } catch (error) {
            if (tempPath) await removeFile(tempPath).catch(() => {})
            if (finalPath && finalFileCreated) await removeFile(finalPath).catch(() => {})
            if (assetId)
              await database(sailsInstance)
                .collection('mediaAssets')
                .deleteOne({ _id: assetId })
                .catch(() => {})
            return reject(
              error.status ? error : new Error('GymGuide could not safely store this file.'),
            )
          }
        },
      )
    })
  },

  delete: async function deleteMedia(sailsInstance, id) {
    if (!UUID_PATTERN.test(id || '')) throw ApiError.badRequest('The media ID is invalid.')
    return referenceLock.run(async () => {
      const db = database(sailsInstance)
      const asset = await db.collection('mediaAssets').findOne({ _id: id, status: 'ready' })
      if (!asset) throw ApiError.notFound('Media not found.')
      if (await isReferenced(db, id)) throw referenceConflict()
      const marking = await db
        .collection('mediaAssets')
        .updateOne(
          { _id: id, status: 'ready' },
          { $set: { status: 'deleting', updatedAt: Date.now() } },
        )
      if (marking.modifiedCount !== 1)
        throw ApiError.conflict('Media changed during deletion. Refresh and try again.')
      if (!validStorageName(asset.storageName)) {
        await db.collection('mediaAssets').updateOne({ _id: id }, { $set: { status: 'ready' } })
        throw ApiError.conflict('The media record has an invalid storage reference.')
      }
      let fileRemoved = false
      try {
        await removeFile(path.join(paths(sailsInstance).files, asset.storageName))
        fileRemoved = true
        await db.collection('mediaAssets').deleteOne({ _id: id, status: 'deleting' })
      } catch {
        if (!fileRemoved)
          await db
            .collection('mediaAssets')
            .updateOne({ _id: id, status: 'deleting' }, { $set: { status: 'ready' } })
        throw new Error('GymGuide could not remove the media file.')
      }
      return { id, deleted: true }
    })
  },

  stream: async function stream(sailsInstance, req, res, id) {
    if (!UUID_PATTERN.test(id || '')) throw ApiError.badRequest('The media ID is invalid.')
    const db = database(sailsInstance)
    const asset = await db.collection('mediaAssets').findOne({ _id: id, status: 'ready' })
    if (!asset || !validStorageName(asset.storageName)) throw ApiError.notFound('Media not found.')
    const admin = await isAdmin(req, db)
    if (!admin && !(await isPublishedReference(db, asset)))
      throw ApiError.notFound('Media not found.')
    const filePath = path.join(paths(sailsInstance).files, asset.storageName)
    let stats
    try {
      stats = await fs.promises.stat(filePath)
    } catch {
      throw ApiError.notFound('Media file not found.')
    }
    if (!stats.isFile() || stats.size !== asset.size)
      throw ApiError.notFound('Media file not found.')

    const range = parseRange(req.headers.range, stats.size)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Type', asset.mimeType)
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Cache-Control', 'private, max-age=0, must-revalidate')
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
    )
    res.set('ETag', `"${asset.sha256}"`)
    res.set('Last-Modified', new Date(asset.updatedAt).toUTCString())
    if (range === false) {
      res.set('Content-Range', `bytes */${stats.size}`)
      return res.status(416).end()
    }
    if (!range) {
      res.set('Content-Length', String(stats.size))
      if (req.method === 'HEAD') return res.status(200).end()
      return fs
        .createReadStream(filePath)
        .on('error', () => res.destroy())
        .pipe(res)
    }
    const length = range.end - range.start + 1
    res.set('Content-Length', String(length))
    res.set('Content-Range', `bytes ${range.start}-${range.end}/${stats.size}`)
    if (req.method === 'HEAD') return res.status(206).end()
    return fs
      .createReadStream(filePath, { start: range.start, end: range.end })
      .on('error', () => res.destroy())
      .pipe(res.status(206))
  },

  cleanupInterruptedUploads: async function cleanupInterruptedUploads(sailsInstance) {
    const location = await ensureDirectories(sailsInstance)
    const db = database(sailsInstance)
    const interrupted = await db
      .collection('mediaAssets')
      .find({ status: { $in: ['uploading', 'deleting'] } })
      .toArray()
    for (const asset of interrupted) {
      if (asset.status === 'deleting' && (await isReferenced(db, String(asset._id)))) {
        const exists =
          validStorageName(asset.storageName) &&
          (await fs.promises.access(path.join(location.files, asset.storageName)).then(
            () => true,
            () => false,
          ))
        if (exists) {
          await db
            .collection('mediaAssets')
            .updateOne({ _id: asset._id }, { $set: { status: 'ready', updatedAt: Date.now() } })
          continue
        }
        throw new Error(`Media ${asset._id} is referenced but its file is missing.`)
      }
      if (validStorageName(asset.storageName))
        await removeFile(path.join(location.files, asset.storageName))
      await db.collection('mediaAssets').deleteOne({ _id: asset._id, status: asset.status })
    }
    const pending = await fs.promises.readdir(location.incoming, { withFileTypes: true })
    await Promise.all(
      pending.map((entry) =>
        fs.promises.rm(path.join(location.incoming, entry.name), { recursive: true, force: true }),
      ),
    )
  },
}
