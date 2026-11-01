import { getJson } from './client'

export const getMuscleGroups = () => getJson('/api/v1/muscle-groups')

export const getMuscleGroupEquipment = (id) =>
  getJson(`/api/v1/muscle-groups/${encodeURIComponent(id)}/equipment`)

export const getEquipmentExercises = (id) =>
  getJson(`/api/v1/equipment/${encodeURIComponent(id)}/exercises`)

export const getExercise = (id) => getJson(`/api/v1/exercises/${encodeURIComponent(id)}`)

export const getExerciseVariations = (id) =>
  getJson(`/api/v1/exercises/${encodeURIComponent(id)}/variations`)
