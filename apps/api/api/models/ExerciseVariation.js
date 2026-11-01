module.exports = {
  tableName: 'exerciseVariations',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, minLength: 1, maxLength: 140 },
    exerciseId: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 160 },
    description: { type: 'string', required: true, maxLength: 500 },
    instructions: { type: 'json', required: true },
    sortOrder: { type: 'number', required: true, min: 0 },
    isActive: { type: 'boolean', defaultsTo: true },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
