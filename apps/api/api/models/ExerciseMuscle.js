module.exports = {
  tableName: 'exerciseMuscles',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    exerciseId: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    muscleGroupId: { type: 'string', required: true, minLength: 1, maxLength: 80 },
    role: { type: 'string', required: true, isIn: ['primary', 'secondary'] },
    isDemo: { type: 'boolean', defaultsTo: false },
  },
}
