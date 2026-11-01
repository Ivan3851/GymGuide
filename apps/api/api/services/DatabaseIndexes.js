const indexDefinitions = {
  gyms: [{ keys: { slug: 1 }, options: { unique: true, name: 'uq_gyms_slug' } }],
  adminUsers: [
    { keys: { username: 1 }, options: { unique: true, name: 'uq_admin_username' } },
    {
      keys: { email: 1 },
      options: {
        unique: true,
        name: 'uq_admin_email',
        partialFilterExpression: { email: { $type: 'string' } },
      },
    },
  ],
  mediaAssets: [
    { keys: { storageName: 1 }, options: { unique: true, name: 'uq_media_storage_name' } },
    { keys: { status: 1, mediaType: 1, createdAt: -1 }, options: { name: 'ix_media_admin_list' } },
  ],
  gymFloorPlans: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_floor_plans_slug' } },
    {
      keys: { gymId: 1, isActive: 1, sortOrder: 1 },
      options: { name: 'ix_floor_plans_member_list' },
    },
    { keys: { imageMediaId: 1 }, options: { name: 'ix_floor_plan_media_reference' } },
  ],
  floorPlanMarkers: [
    {
      keys: { floorPlanId: 1, gymEquipmentId: 1 },
      options: { unique: true, name: 'uq_floor_marker_equipment' },
    },
    { keys: { gymId: 1, floorPlanId: 1 }, options: { name: 'ix_floor_markers_by_plan' } },
    { keys: { gymEquipmentId: 1 }, options: { name: 'ix_floor_markers_by_unit' } },
  ],
  muscleGroups: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_muscle_groups_slug' } },
    { keys: { isActive: 1, sortOrder: 1 }, options: { name: 'ix_muscle_groups_active_order' } },
  ],
  equipmentTypes: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_equipment_types_slug' } },
    { keys: { isActive: 1, sortOrder: 1 }, options: { name: 'ix_equipment_types_active_order' } },
  ],
  exercises: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_exercises_slug' } },
    { keys: { isActive: 1, sortOrder: 1 }, options: { name: 'ix_exercises_active_order' } },
  ],
  exerciseVariations: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_variations_slug' } },
    {
      keys: { exerciseId: 1, isActive: 1, sortOrder: 1 },
      options: { name: 'ix_variations_exercise_order' },
    },
  ],
  exerciseMuscles: [
    {
      keys: { exerciseId: 1, muscleGroupId: 1, role: 1 },
      options: { unique: true, name: 'uq_exercise_muscle_role' },
    },
    { keys: { muscleGroupId: 1, exerciseId: 1 }, options: { name: 'ix_muscle_exercises' } },
  ],
  exerciseEquipment: [
    {
      keys: { exerciseId: 1, equipmentTypeId: 1 },
      options: { unique: true, name: 'uq_exercise_equipment' },
    },
    { keys: { equipmentTypeId: 1, exerciseId: 1 }, options: { name: 'ix_equipment_exercises' } },
  ],
  gymEquipment: [
    { keys: { slug: 1 }, options: { unique: true, name: 'uq_gym_equipment_slug' } },
    {
      keys: { gymId: 1, equipmentTypeId: 1, isAvailable: 1 },
      options: { name: 'ix_gym_inventory_by_type' },
    },
    { keys: { gymId: 1, isActive: 1 }, options: { name: 'ix_gym_inventory_active' } },
  ],
}

module.exports = {
  ensure: async function ensure(sailsInstance) {
    const db = sailsInstance.hooks.orm.datastores.default.manager.client.db()

    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      const collection = db.collection(collectionName)
      for (const index of indexes) {
        await collection.createIndex(index.keys, index.options)
      }
    }
  },
}
