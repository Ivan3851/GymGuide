import { adminContentResources } from './admin-content-resources.js'

export const adminResourceDefinitions = {
  'muscle-groups': {
    titleKey: adminContentResources['muscle-groups'],
    fields: [
      ['name', 'admin.name', 'localized-text'],
      ['description', 'admin.description', 'localized-textarea'],
      ['parentId', 'admin.parentMuscleGroup', 'optional-select', 'muscle-groups'],
      ['sortOrder', 'admin.sortOrder', 'number'],
    ],
  },
  'equipment-types': {
    titleKey: adminContentResources['equipment-types'],
    fields: [
      ['name', 'admin.name', 'localized-text'],
      ['description', 'admin.description', 'localized-textarea'],
      ['sortOrder', 'admin.sortOrder', 'number'],
    ],
  },
  'gym-equipment': {
    titleKey: adminContentResources['gym-equipment'],
    fields: [
      ['equipmentTypeId', 'admin.equipmentType', 'select', 'equipment-types'],
      ['displayName', 'admin.name', 'localized-text'],
      ['isAvailable', 'admin.available', 'checkbox'],
    ],
  },
  exercises: {
    titleKey: adminContentResources.exercises,
    fields: [
      ['name', 'admin.name', 'localized-text'],
      ['summary', 'admin.summary', 'localized-textarea'],
      ['instructions', 'admin.instructions', 'localized-list'],
      ['benefits', 'admin.benefits', 'localized-list'],
      ['tips', 'admin.tips', 'localized-list'],
      ['commonMistakes', 'admin.commonMistakes', 'localized-list'],
      ['sortOrder', 'admin.sortOrder', 'number'],
    ],
  },
  variations: {
    titleKey: adminContentResources.variations,
    fields: [
      ['exerciseId', 'admin.parentExercise', 'select', 'exercises'],
      ['name', 'admin.name', 'localized-text'],
      ['description', 'admin.description', 'localized-textarea'],
      ['instructions', 'admin.instructions', 'localized-list'],
      ['sortOrder', 'admin.sortOrder', 'number'],
    ],
  },
  'floor-plans': {
    titleKey: adminContentResources['floor-plans'],
    fields: [
      ['name', 'admin.name', 'localized-text'],
      ['imageMediaId', 'admin.floorPlanImage', 'select', 'images'],
      ['sortOrder', 'admin.sortOrder', 'number'],
    ],
  },
}
