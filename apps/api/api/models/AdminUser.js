module.exports = {
  tableName: 'adminUsers',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    username: { type: 'string', required: true, minLength: 3, maxLength: 80 },
    email: { type: 'string', allowNull: true, maxLength: 254 },
    passwordHash: { type: 'string', required: true },
    role: { type: 'string', isIn: ['gym-admin', 'gym-staff'], required: true },
    gymId: { type: 'string', required: true },
    isActive: { type: 'boolean', defaultsTo: true },
    createdAt: { type: 'number', required: true },
    updatedAt: { type: 'number', required: true },
  },
}
