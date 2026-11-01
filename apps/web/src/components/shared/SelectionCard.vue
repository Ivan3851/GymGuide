<script setup>
defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  detail: { type: String, default: '' },
})
</script>

<template>
  <RouterLink class="selection-card" :to="to">
    <span class="selection-card-content">
      <strong>{{ title }}</strong>
      <span v-if="description" class="selection-card-description">{{ description }}</span>
      <span v-if="detail" class="selection-card-detail">{{ detail }}</span>
    </span>
    <span class="selection-card-arrow" aria-hidden="true">→</span>
  </RouterLink>
</template>
