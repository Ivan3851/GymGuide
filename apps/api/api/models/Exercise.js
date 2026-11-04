module.exports = {
  tableName: 'exercises',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, minLength: 1, maxLength: 120 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 160 },
    summary: { type: 'string', defaultsTo: '', maxLength: 700 },
    instructions: { type: 'json', required: true },
    benefits: { type: 'json', defaultsTo: [] },
    tips: { type: 'json', defaultsTo: [] },
    commonMistakes: { type: 'json', defaultsTo: [] },
    translations: { type: 'json', defaultsTo: {} },
    sortOrder: { type: 'number', required: true, min: 0 },
    videoMediaId: { type: 'string', allowNull: true },
    imageMediaIds: { type: 'json', defaultsTo: [] },
    isActive: { type: 'boolean', defaultsTo: true },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
