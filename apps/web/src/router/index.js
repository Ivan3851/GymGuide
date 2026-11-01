import { createRouter, createWebHistory } from 'vue-router'
import EquipmentView from '@/views/EquipmentView.vue'
import ExerciseView from '@/views/ExerciseView.vue'
import HomeView from '@/views/HomeView.vue'
import MuscleGroupView from '@/views/MuscleGroupView.vue'
import GymMapView from '@/views/GymMapView.vue'
import { adminRoutes } from './admin-views'
import { getAdminSession } from '@/api/admin'
import { adminResourceRouteTarget } from '@/admin/admin-resource-route'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/muscle-groups/:id/equipment',
      name: 'muscle-group',
      component: MuscleGroupView,
    },
    {
      path: '/equipment/:id/exercises',
      name: 'equipment',
      component: EquipmentView,
    },
    {
      path: '/exercises/:id',
      name: 'exercise',
      component: ExerciseView,
    },
    { path: '/map', name: 'gym-map', component: GymMapView },
    ...adminRoutes,
  ],
})

router.beforeEach(async (to) => {
  if (to.name === 'admin-resource') {
    const resourceTarget = adminResourceRouteTarget(to.params.resource)
    if (resourceTarget !== true) return resourceTarget
  }
  if (!to.meta.requiresAdmin && !to.meta.adminGuest) return true
  try {
    await getAdminSession()
    return to.meta.adminGuest ? { name: 'admin-dashboard' } : true
  } catch {
    return to.meta.requiresAdmin ? { name: 'admin-login', query: { redirect: to.fullPath } } : true
  }
})

export default router
