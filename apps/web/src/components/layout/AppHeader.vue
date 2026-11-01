<script setup>
import paljoLogo from '@/assets/brand/paljo-fitness-logo.png'
import { useLocale } from '@/localization/locale'
import { useRoute } from 'vue-router'

const { locale, setLocale, t } = useLocale()
const route = useRoute()
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" to="/" :aria-label="t('app.home')">
      <img class="brand-logo" :src="paljoLogo" alt="Paljo Fitness" />
      <span class="brand-copy">
        <span class="brand-name">GymGuide</span>
        <span class="header-note">{{ t('app.tagline') }}</span>
      </span>
    </RouterLink>
    <nav class="member-horizontal-nav" :aria-label="t('menu.navigation')">
      <RouterLink to="/" :aria-current="route.name === 'home' ? 'page' : undefined">
        {{ t('menu.home') }}
      </RouterLink>
      <RouterLink to="/map" :aria-current="route.name === 'gym-map' ? 'page' : undefined">
        {{ t('menu.map') }}
      </RouterLink>
    </nav>
    <div class="language-control" role="group" :aria-label="t('app.language')">
      <button type="button" :aria-pressed="locale === 'mk-MK'" @click="setLocale('mk-MK')">
        MK
      </button>
      <button type="button" :aria-pressed="locale === 'en'" @click="setLocale('en')">EN</button>
    </div>
  </header>
</template>
