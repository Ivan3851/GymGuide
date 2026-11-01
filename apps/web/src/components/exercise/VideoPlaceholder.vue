<script setup>
import { useLocale } from '@/localization/locale'

const { t } = useLocale()
</script>

<template>
  <section class="video-placeholder" :aria-label="t('video.label')">
    <div class="video-placeholder-icon" aria-hidden="true">▶</div>
    <p class="eyebrow">{{ t('video.eyebrow') }}</p>
    <h2>{{ t('video.title') }}</h2>
    <p>{{ t('video.message') }}</p>
  </section>
</template>
