<script setup>
import { useLocale } from '@/localization/locale'

const { t } = useLocale()

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  backTo: { type: [String, Object], default: '/' },
  backLabel: { type: String, default: '' },
})
</script>

<template>
  <section class="page-heading">
    <RouterLink class="back-link" :to="backTo">
      <span aria-hidden="true">←</span>
      {{ backLabel || t('common.back') }}
    </RouterLink>
    <h1>{{ title }}</h1>
    <p v-if="description" class="page-description">{{ description }}</p>
  </section>
</template>
