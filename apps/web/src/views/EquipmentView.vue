<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getEquipmentExercises } from '@/api/catalog'
import PageHeading from '@/components/shared/PageHeading.vue'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeRecord } from '@/localization/demo-content'
import { useLocale } from '@/localization/locale'

const route = useRoute()
const equipmentId = computed(() => String(route.params.id || ''))
const backTo = computed(() =>
  route.query.fromMuscle
    ? { name: 'muscle-group', params: { id: String(route.query.fromMuscle) } }
    : '/',
)
const { locale, t } = useLocale()
const { data, isLoading, error, load } = useAsyncData(getEquipmentExercises, (problem) =>
  apiErrorMessageKey(problem),
)
const errorMessage = computed(() => (error.value ? t(error.value) : ''))
const equipmentType = computed(() =>
  localizeRecord(data.value?.equipmentType, locale.value, 'equipment'),
)
const exercises = computed(
  () =>
    data.value?.exercises?.map((exercise) => ({
      ...localizeRecord(exercise, locale.value, 'exercise'),
      muscles: exercise.muscles.map((muscle) => localizeRecord(muscle, locale.value, 'muscle')),
    })) || [],
)

watch(equipmentId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view">
    <PageHeading
      :title="equipmentType?.name || t('equipment.fallback')"
      :description="equipmentType?.description || t('equipment.description')"
      :back-to="backTo"
      :back-label="t('equipment.back')"
    />

    <StatePanel
      v-if="isLoading"
      :title="t('equipment.loading')"
      :message="t('equipment.loadingMessage')"
    />
    <StatePanel
      v-else-if="error"
      :title="t('equipment.errorTitle')"
      :message="errorMessage"
      tone="error"
      :action-label="t('common.retry')"
      @action="load(equipmentId)"
    />
    <StatePanel
      v-else-if="!data?.exercises?.length"
      :title="t('equipment.emptyTitle')"
      :message="t('equipment.emptyMessage')"
    />
    <section v-else class="card-grid" :aria-label="t('equipment.listLabel')">
      <SelectionCard
        v-for="exercise in exercises"
        :key="exercise.id"
        :to="{
          name: 'exercise',
          params: { id: exercise.id },
          query: { fromEquipment: equipmentId },
        }"
        :title="exercise.name"
        :description="exercise.summary"
        :detail="exercise.muscles.map((muscle) => muscle.name).join(' · ')"
      />
    </section>
    <p v-if="equipmentType?.isDemo" class="demo-note">{{ t('equipment.demoNote') }}</p>
  </div>
</template>
