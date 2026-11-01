export function exerciseMarkerClasses(marker, selectedEquipmentId) {
  return {
    'exercise-map-marker-match': marker.matchesExercise,
    'exercise-map-marker-other': !marker.matchesExercise,
    'exercise-map-marker-selected': selectedEquipmentId === marker.gymEquipment.id,
  }
}
