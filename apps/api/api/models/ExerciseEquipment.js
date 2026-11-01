module.exports = {
  tableName: 'exerciseEquipment',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    exerciseId: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    equipmentTypeId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
