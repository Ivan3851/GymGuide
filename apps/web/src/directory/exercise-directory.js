function idOf(group) {
  return String(group?.id ?? '')
}

export function descendantIds(groups, rootId) {
  const children = new Map()
  for (const group of groups || []) {
    if (!group.parentId) continue
    const childIds = children.get(String(group.parentId)) || []
    childIds.push(idOf(group))
    children.set(String(group.parentId), childIds)
  }
  const result = new Set([String(rootId)])
  const queue = [String(rootId)]
  while (queue.length) {
    for (const childId of children.get(queue.shift()) || []) {
      if (result.has(childId)) continue
      result.add(childId)
      queue.push(childId)
    }
  }
  return result
}

export function buildExerciseDirectoryGroups(data, selectedMuscleGroupId = '') {
  if (!data) return []
  const groups = data.muscleGroups || []
  const byId = new Map(groups.map((group) => [idOf(group), group]))
  const roots = data.topLevelMuscleGroups || groups.filter((group) => !group.parentId)
  const exercises = data.exercises || []

  if (selectedMuscleGroupId) {
    const included = descendantIds(groups, selectedMuscleGroupId)
    const selected = byId.get(String(selectedMuscleGroupId))
    if (!selected) return []
    return groups
      .filter((group) => included.has(idOf(group)))
      .map((group) => ({
        muscleGroup: group,
        exercises: exercises.filter((exercise) => exercise.primaryMuscleGroup?.id === group.id),
      }))
      .filter((group) => group.exercises.length)
  }

  const result = roots.map((group) => ({
    muscleGroup: group,
    exercises: exercises.filter((exercise) => exercise.primaryGroupRootId === group.id),
  }))
  const unassigned = exercises.filter(
    (exercise) => !exercise.primaryMuscleGroup || !byId.has(exercise.primaryMuscleGroup.id),
  )
  if (unassigned.length) result.push({ muscleGroup: null, exercises: unassigned })
  return result.filter((group) => group.exercises.length)
}
