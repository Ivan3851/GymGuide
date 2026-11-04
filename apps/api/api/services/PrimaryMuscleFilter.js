function exerciseIdsForPrimaryDescendants(exerciseIds, primaryRelations, includedMuscleIds) {
  const includedExercises = new Set(
    primaryRelations
      .filter((relation) => includedMuscleIds.has(relation.muscleGroupId))
      .map((relation) => relation.exerciseId),
  )
  return [...new Set(exerciseIds.map(String))].filter((id) => includedExercises.has(id))
}

module.exports = { exerciseIdsForPrimaryDescendants }
