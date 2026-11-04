export function selectPrimaryMuscle(primaryId, secondaryIds = []) {
  return {
    primaryIds: primaryId ? [primaryId] : [],
    secondaryIds: [...new Set(secondaryIds)].filter((id) => id !== primaryId),
  }
}
