<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMuscleGroupEquipment } from '@/api/catalog'
import PageHeading from '@/components/shared/PageHeading.vue'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeRecord } from '@/localization/demo-content'
import { useLocale } from '@/localization/locale'

const route = useRoute()
const muscleGroupId = computed(() => String(route.params.id || ''))
const { locale, t } = useLocale()
const { data, isLoading, error, load } = useAsyncData(getMuscleGroupEquipment, (problem) =>
  apiErrorMessageKey(problem),
)
const errorMessage = computed(() => (error.value ? t(error.value) : ''))
const muscleGroup = computed(() => localizeRecord(data.value?.muscleGroup, locale.value, 'muscle'))
const equipment = computed(
  () => data.value?.equipment?.map((item) => localizeRecord(item, locale.value, 'equipment')) || [],
)

watch(muscleGroupId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view">
    <PageHeading
      :title="muscleGroup?.name || t('muscle.fallback')"
      :description="muscleGroup?.description || t('muscle.description')"
    />

    <StatePanel
      v-if="isLoading"
      :title="t('muscle.loading')"
      :message="t('muscle.loadingMessage')"
    />
    <StatePanel
      v-else-if="error"
      :title="t('muscle.errorTitle')"
      :message="errorMessage"
      tone="error"
      :action-label="t('common.retry')"
      @action="load(muscleGroupId)"
    />
    <StatePanel
      v-else-if="!data?.equipment?.length"
      :title="t('muscle.emptyTitle')"
      :message="t('muscle.emptyMessage')"
    />
    <section v-else class="card-grid" :aria-label="t('muscle.listLabel')">
      <SelectionCard
        v-for="item in equipment"
        :key="item.id"
        :to="{
          name: 'equipment',
          params: { id: item.id },
          query: { fromMuscle: data.muscleGroup.id },
        }"
        :title="item.name"
        :description="item.description"
        :detail="t('muscle.unitCount', { count: item.unitCount })"
      />
    </section>
    <p v-if="muscleGroup?.isDemo" class="demo-note">{{ t('muscle.demoNote') }}</p>
  </div>
</template>
