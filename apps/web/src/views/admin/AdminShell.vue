<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminSession, signOut } from '@/api/admin'
import { adminContentResources, adminContentResourcePath } from '@/admin/admin-content-resources'
import { useLocale } from '@/localization/locale'

const user = ref(null)
const router = useRouter()
const { t } = useLocale()
const links = [
  { label: 'admin.dashboard', to: '/admin/dashboard' },
  ...Object.entries(adminContentResources).map(([resource, label]) => ({
    label,
    to: adminContentResourcePath(resource),
  })),
  { label: 'admin.positions', to: '/admin/floor-plans/edit' },
  { label: 'admin.media', to: '/admin/media' },
  { label: 'admin.settings', to: '/admin/settings' },
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
      <RouterLink class="admin-brand" to="/admin/dashboard">
        <span class="admin-brand-name">GymGuide</span><span>{{ t('admin.badge') }}</span>
      </RouterLink>
      <nav :aria-label="t('admin.navigation')">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="admin-nav-link">
          {{ t(link.label) }}
        </RouterLink>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user">
          <strong>{{ user?.username || 'Admin' }}</strong
          ><span>{{
            user?.role === 'gym-admin' ? t('admin.roleAdmin') : t('admin.roleStaff')
          }}</span>
        </div>
        <RouterLink class="admin-return-link" to="/">{{ t('admin.return') }} ↗</RouterLink>
        <button class="admin-button admin-button-quiet" @click="logout">
          {{ t('admin.logout') }}
        </button>
      </div>
    </aside>
    <main class="admin-main"><RouterView /></main>
  </div>
</template>
