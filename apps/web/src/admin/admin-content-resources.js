export const adminContentResources = Object.freeze({
  'muscle-groups': 'admin.muscleGroups',
  'equipment-types': 'admin.equipmentTypes',
  'gym-equipment': 'admin.gymEquipment',
  exercises: 'admin.exercises',
  variations: 'admin.variations',
  'floor-plans': 'admin.floorPlans',
})

export const isAdminContentResource = (resource) => Object.hasOwn(adminContentResources, resource)

export const adminContentResourcePath = (resource) => `/admin/content/${resource}`
