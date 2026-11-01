module.exports = {
  tableName: 'mediaAssets',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    originalName: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    storageName: { type: 'string', required: true, unique: true, maxLength: 80 },
    mimeType: {
      type: 'string',
      required: true,
      isIn: ['video/mp4', 'image/jpeg', 'image/png', 'image/webp'],
    },
    mediaType: { type: 'string', required: true, isIn: ['video', 'image'] },
    size: { type: 'number', required: true, min: 1 },
    sha256: { type: 'string', required: true, maxLength: 64 },
    status: { type: 'string', required: true, isIn: ['uploading', 'ready', 'deleting'] },
    uploadedBy: { type: 'string', required: true },
    createdAt: { type: 'number', required: true },
    updatedAt: { type: 'number', required: true },
  },
}
