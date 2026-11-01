<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminSession, signOut } from '@/api/admin'

const user = ref(null)
const router = useRouter()
const links = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Muscle groups', to: '/admin/content/muscle-groups' },
  { label: 'Equipment types', to: '/admin/content/equipment-types' },
  { label: 'Gym equipment', to: '/admin/content/gym-equipment' },
  { label: 'Exercises', to: '/admin/content/exercises' },
  { label: 'Variations', to: '/admin/content/variations' },
  { label: 'Floor plans', to: '/admin/content/floor-plans' },
  { label: 'Positions', to: '/admin/floor-plans/edit' },
  { label: 'Media library', to: '/admin/media' },
  { label: 'Gym settings', to: '/admin/settings' },
]

onMounted(async () => {
  try {
    user.value = await getAdminSession()
  } catch {
    await router.replace('/admin/login')
  }
})

async function logout() {
  await signOut()
  await router.replace('/admin/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink class="admin-brand" to="/admin/dashboard">GymGuide <span>ADMIN</span></RouterLink>
      <nav aria-label="Administration">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="admin-nav-link">{{
          link.label
        }}</RouterLink>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user">
          <strong>{{ user?.username || 'Admin' }}</strong
          ><span>{{ user?.role || 'Gym staff' }}</span>
        </div>
        <button class="admin-button admin-button-quiet" @click="logout">Log out</button>
        <RouterLink class="admin-return-link" to="/">Return to member kiosk ↗</RouterLink>
      </div>
    </aside>
    <main class="admin-main"><RouterView /></main>
  </div>
</template>
