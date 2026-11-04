module.exports = {
  tableName: 'gymEquipment',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    slug: { type: 'string', required: true, unique: true, minLength: 1, maxLength: 120 },
    gymId: { type: 'string', required: true, minLength: 1, maxLength: 80 },
    equipmentTypeId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    displayName: { type: 'string', required: true, minLength: 1, maxLength: 160 },
    translations: { type: 'json', defaultsTo: {} },
    isAvailable: { type: 'boolean', defaultsTo: true },
    isActive: { type: 'boolean', defaultsTo: true },
    isDemo: { type: 'boolean', defaultsTo: false },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
}
