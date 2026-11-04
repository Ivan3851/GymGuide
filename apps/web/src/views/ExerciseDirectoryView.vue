<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { getExerciseDirectory } from '@/api/catalog'
import PageHeading from '@/components/shared/PageHeading.vue'
import SelectionCard from '@/components/shared/SelectionCard.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { API_HEALTH_KEY } from '@/composables/api-health-key'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeRecord } from '@/localization/content'
import { useLocale } from '@/localization/locale'
import { buildExerciseDirectoryGroups } from '@/directory/exercise-directory'

const { isConnected } = inject(API_HEALTH_KEY)
const { locale, t } = useLocale()
const { data, isLoading, error, load } = useAsyncData(getExerciseDirectory, (problem) =>
  apiErrorMessageKey(problem),
)
const selectedMuscleGroupId = ref('')
const errorMessage = computed(() => (error.value ? t(error.value) : ''))
const muscleGroups = computed(() =>
  (data.value?.topLevelMuscleGroups || []).map((group) =>
    localizeRecord(group, locale.value, 'muscle'),
  ),
)
const groupedExercises = computed(() =>
  buildExerciseDirectoryGroups(data.value, selectedMuscleGroupId.value).map((group) => ({
    muscleGroup: group.muscleGroup
      ? localizeRecord(group.muscleGroup, locale.value, 'muscle')
      : null,
    exercises: group.exercises.map((exercise) => ({
      ...localizeRecord(exercise, locale.value, 'exercise'),
      primaryMuscleGroup: exercise.primaryMuscleGroup
        ? localizeRecord(exercise.primaryMuscleGroup, locale.value, 'muscle')
        : null,
    })),
  })),
)
const exerciseCount = computed(() =>
  groupedExercises.value.reduce((total, group) => total + group.exercises.length, 0),
)

onMounted(() => load())
watch(isConnected, (connected) => {
  if (connected && error.value) load()
})
</script>

<template>
  <div class="browse-view exercise-directory">
    <PageHeading :title="t('directory.title')" :description="t('directory.description')" />

    <label class="directory-filter">
      <span>{{ t('directory.filter') }}</span>
      <select v-model="selectedMuscleGroupId">
        <option value="">{{ t('directory.all') }}</option>
        <option v-for="group in muscleGroups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </label>

    <StatePanel
      v-if="isLoading"
      :title="t('directory.loading')"
      :message="t('directory.loadingMessage')"
    />
    <StatePanel
      v-else-if="error"
      :title="t('directory.errorTitle')"
      :message="errorMessage"
      tone="error"
      :action-label="t('common.retry')"
      @action="load()"
    />
    <StatePanel
      v-else-if="!exerciseCount"
      :title="t('directory.emptyTitle')"
      :message="t('directory.emptyMessage')"
    />
    <div v-else class="directory-groups">
      <section
        v-for="group in groupedExercises"
        :key="group.muscleGroup?.id || 'unassigned'"
        class="directory-group"
      >
        <h2>{{ group.muscleGroup?.name || t('directory.other') }}</h2>
        <div class="card-grid">
          <SelectionCard
            v-for="exercise in group.exercises"
            :key="exercise.id"
            :to="{ name: 'exercise', params: { id: exercise.id } }"
            :title="exercise.name"
            :description="exercise.summary"
            :detail="exercise.primaryMuscleGroup?.name || ''"
          />
        </div>
      </section>
    </div>
  </div>
</template>
