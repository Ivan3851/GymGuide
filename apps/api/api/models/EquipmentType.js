module.exports = {
  tableName: 'equipmentTypes',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, minLength: 1, maxLength: 100 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    description: { type: 'string', required: true, maxLength: 500 },
    sortOrder: { type: 'number', required: true, min: 0 },
    isActive: { type: 'boolean', defaultsTo: true },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
