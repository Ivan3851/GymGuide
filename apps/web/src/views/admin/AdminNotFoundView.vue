<script setup>
import { useLocale } from '@/localization/locale'

const { t } = useLocale()
</script>

<template>
  <section class="admin-panel admin-not-found" role="status">
    <p class="admin-eyebrow">404</p>
    <h1>{{ t('admin.notFound') }}</h1>
    <RouterLink class="admin-button admin-button-primary" to="/admin/dashboard">
      {{ t('admin.returnDashboard') }}
    </RouterLink>
  </section>
</template>
