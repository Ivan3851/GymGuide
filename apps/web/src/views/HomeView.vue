<script setup>
import { computed, inject, onMounted, watch } from 'vue'
import { getMuscleGroups } from '@/api/catalog'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { apiErrorMessageKey } from '@/localization/api-error'
import { API_HEALTH_KEY } from '@/composables/api-health-key'
import paljoLogo from '@/assets/brand/paljo-fitness-logo.png'
import { localizeRecords } from '@/localization/content'
import { useLocale } from '@/localization/locale'

const { isConnected, hasChecked } = inject(API_HEALTH_KEY)
const { locale, t } = useLocale()
const { data, isLoading, error, load } = useAsyncData(getMuscleGroups, (problem) =>
  apiErrorMessageKey(problem),
)
const muscleGroups = computed(() => localizeRecords(data.value, locale.value))
const errorMessage = computed(() => (error.value ? t(error.value) : ''))
onMounted(() => load())
watch(isConnected, (connected) => {
  if (connected && error.value) load()
})
</script>

<template>
  <div class="home-view">
    <section class="home-hero" aria-labelledby="hero-title">
      <div class="hero-brand-lockup">
        <img class="hero-logo" :src="paljoLogo" alt="Paljo Fitness" />
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
      </div>
      <div class="hero-copy">
        <h1 id="hero-title">
          {{ t('home.titleFirst') }}<br /><span>{{ t('home.titleSecond') }}</span>
        </h1>
        <p class="hero-description">{{ t('home.description') }}</p>
      </div>
    </section>

    <section class="browse-section" aria-labelledby="muscle-groups-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ t('app.member') }}</p>
          <h2 id="muscle-groups-title">{{ t('home.start') }}</h2>
        </div>
        <span v-if="data" class="result-count">{{ t('home.groups', { count: data.length }) }}</span>
      </div>

      <StatePanel v-if="isLoading" :title="t('home.loading')" :message="t('home.loadingMessage')" />
      <StatePanel
        v-else-if="error"
        :title="t('home.errorTitle')"
        :message="errorMessage"
        tone="error"
        :action-label="t('common.retry')"
        @action="load()"
      />
      <StatePanel
        v-else-if="!data?.length"
        :title="t('home.emptyTitle')"
        :message="t('home.emptyMessage')"
      />
      <div v-else class="card-grid muscle-grid">
        <SelectionCard
          v-for="muscleGroup in muscleGroups"
          :key="muscleGroup.id"
          :to="{ name: 'muscle-group', params: { id: muscleGroup.id } }"
          :title="muscleGroup.name"
          :description="muscleGroup.description"
        />
      </div>
    </section>

    <footer class="home-footer">
      <span
        class="status-dot"
        :class="{ 'status-dot-offline': hasChecked && !isConnected }"
        aria-hidden="true"
      ></span>
      <span v-if="isConnected">{{ t('home.connected') }}</span>
      <span v-else-if="hasChecked">{{ t('home.disconnected') }}</span>
      <span v-else>{{ t('home.connecting') }}</span>
    </footer>
  </div>
</template>
