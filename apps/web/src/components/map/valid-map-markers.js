export function validMapMarkers(markers = []) {
  return markers.filter(
    (marker) =>
      Number.isFinite(marker.x) &&
      Number.isFinite(marker.y) &&
      marker.x >= 0 &&
      marker.x <= 1 &&
      marker.y >= 0 &&
      marker.y <= 1 &&
      Boolean(marker.gymEquipment?.id),
  )
}
