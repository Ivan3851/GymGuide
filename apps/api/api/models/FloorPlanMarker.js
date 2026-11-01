module.exports = {
  tableName: 'floorPlanMarkers',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    gymId: { type: 'string', required: true, maxLength: 80 },
    floorPlanId: { type: 'string', required: true, maxLength: 140 },
    gymEquipmentId: { type: 'string', required: true, maxLength: 140 },
    x: { type: 'number', required: true, min: 0, max: 1 },
    y: { type: 'number', required: true, min: 0, max: 1 },
    createdAt: { type: 'number', required: true },
    updatedAt: { type: 'number', required: true },
  },
}
