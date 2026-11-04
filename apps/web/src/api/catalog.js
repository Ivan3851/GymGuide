import { getJson } from './client'

export const getMuscleGroups = () => getJson('/api/v1/muscle-groups')

export const getExerciseDirectory = () => getJson('/api/v1/exercises')

export const getMuscleGroupEquipment = (id) =>
  getJson(`/api/v1/muscle-groups/${encodeURIComponent(id)}/equipment`)

export const getEquipmentExercises = (id, muscleGroupId = '') => {
  const query = muscleGroupId ? `?muscleGroupId=${encodeURIComponent(muscleGroupId)}` : ''
  return getJson(`/api/v1/equipment/${encodeURIComponent(id)}/exercises${query}`)
}

export const getExercise = (id) => getJson(`/api/v1/exercises/${encodeURIComponent(id)}`)

export const getExerciseVariations = (id) =>
  getJson(`/api/v1/exercises/${encodeURIComponent(id)}/variations`)

export const getGymMapFloorPlans = () =>
  getJson('/api/v1/floor-plans?includeUnavailable=true&includeMissingImages=true')
