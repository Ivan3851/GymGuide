import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import AdminLoginView from '@/views/admin/AdminLoginView.vue'
import AdminResourceView from '@/views/admin/AdminResourceView.vue'
import AdminMediaView from '@/views/admin/AdminMediaView.vue'
import AdminFloorPlanEditorView from '@/views/admin/AdminFloorPlanEditorView.vue'
import AdminSettingsView from '@/views/admin/AdminSettingsView.vue'
import AdminShell from '@/views/admin/AdminShell.vue'

export const adminRoutes = [
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginView,
    meta: { adminGuest: true },
  },
  {
    path: '/admin',
    component: AdminShell,
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin-dashboard', component: AdminDashboardView },
      { path: 'content/:resource', name: 'admin-resource', component: AdminResourceView },
      { path: 'media', name: 'admin-media', component: AdminMediaView },
      { path: 'settings', name: 'admin-settings', component: AdminSettingsView },
      {
        path: 'floor-plans/:id/edit',
        name: 'admin-floor-plan-editor',
        component: AdminFloorPlanEditorView,
      },
      {
        path: 'floor-plans/edit',
        name: 'admin-floor-plan-editor-new',
        component: AdminFloorPlanEditorView,
      },
    ],
  },
]
