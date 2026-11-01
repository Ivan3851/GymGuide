<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  tone: { type: String, default: 'neutral' },
  actionLabel: { type: String, default: '' },
})

defineEmits(['action'])
</script>

<template>
  <section class="state-panel" :class="`state-panel-${tone}`" aria-live="polite">
    <h2>{{ title }}</h2>
    <p v-if="message">{{ message }}</p>
    <button
      v-if="actionLabel"
      class="button button-secondary"
      type="button"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </section>
</template>
