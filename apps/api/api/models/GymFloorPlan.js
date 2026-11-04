module.exports = {
  tableName: 'gymFloorPlans',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, maxLength: 120 },
    gymId: { type: 'string', required: true, maxLength: 80 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    imageMediaId: { type: 'string', required: true, maxLength: 36 },
    translations: { type: 'json', defaultsTo: {} },
    sortOrder: { type: 'number', required: true, min: 0 },
    isActive: { type: 'boolean', defaultsTo: true },
    createdAt: { type: 'number', required: true },
    updatedAt: { type: 'number', required: true },
  },
}
