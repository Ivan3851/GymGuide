module.exports = {
  tableName: 'gyms',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, minLength: 1, maxLength: 80 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    status: { type: 'string', required: true, isIn: ['active', 'inactive'] },
    settings: {
      type: 'json',
      defaultsTo: { memberInactivityTimeoutSeconds: 60 },
    },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
