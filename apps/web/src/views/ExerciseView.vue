<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getExercise, getExerciseVariations } from '@/api/catalog'
import VideoPlaceholder from '@/components/exercise/VideoPlaceholder.vue'
import ExerciseFloorPlan from '@/components/exercise/ExerciseFloorPlan.vue'
import PageHeading from '@/components/shared/PageHeading.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { apiErrorMessageKey } from '@/localization/api-error'
import { localizeRecord, localizeRecords } from '@/localization/content'
import { useLocale } from '@/localization/locale'

const route = useRoute()
const exerciseId = computed(() => String(route.params.id || ''))
const backTo = computed(() =>
  route.query.fromEquipment
    ? {
        name: 'equipment',
        params: { id: String(route.query.fromEquipment) },
        query: route.query.fromMuscle ? { fromMuscle: String(route.query.fromMuscle) } : {},
      }
    : '/',
)

async function loadExercise(id) {
  const [exercise, variations] = await Promise.all([getExercise(id), getExerciseVariations(id)])
  return { exercise, variations }
}

const { locale, t } = useLocale()
const { data, isLoading, error, load } = useAsyncData(loadExercise, (problem) =>
  apiErrorMessageKey(problem),
)
const errorMessage = computed(() => (error.value ? t(error.value) : ''))
const exercise = computed(() => {
  const source = data.value?.exercise
  if (!source) return null
  const localized = localizeRecord(source, locale.value, 'exercise')
  return {
    ...localized,
    muscles: {
      primary: localizeRecords(source.muscles.primary, locale.value, 'muscle'),
      secondary: localizeRecords(source.muscles.secondary, locale.value, 'muscle'),
    },
  }
})
const variations = computed(
  () => localizeRecords(data.value?.variations, locale.value, 'variation') || [],
)
watch(exerciseId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view exercise-view">
    <PageHeading
      :title="exercise?.name || t('exercise.fallback')"
      :description="exercise?.summary || ''"
      :back-to="backTo"
      :back-label="t('exercise.back')"
    />

    <StatePanel
      v-if="isLoading"
      :title="t('exercise.loading')"
      :message="t('exercise.loadingMessage')"
    />
    <StatePanel
      v-else-if="error"
      :title="t('exercise.errorTitle')"
      :message="errorMessage"
      tone="error"
      :action-label="t('common.retry')"
      @action="load(exerciseId)"
    />
    <template v-else-if="exercise">
      <video
        v-if="exercise.video?.status === 'available'"
        class="exercise-video"
        :src="exercise.video.contentUrl"
        controls
        playsinline
        preload="metadata"
      >
        {{ t('exercise.videoFallback') }}
      </video>
      <VideoPlaceholder v-else />

      <section
        v-if="exercise.images?.length"
        class="exercise-images"
        :aria-label="t('exercise.images')"
      >
        <img
          v-for="image in exercise.images"
          :key="image.id"
          :src="image.contentUrl"
          :alt="t('exercise.imageAlt', { name: exercise.name })"
          loading="lazy"
        />
      </section>

      <section v-if="exercise.instructions?.length" class="detail-section">
        <p class="eyebrow section-index">{{ t('exercise.sectionGuide') }}</p>
        <h2>{{ t('exercise.steps') }}</h2>
        <ol class="step-list">
          <li v-for="(instruction, index) in exercise.instructions" :key="instruction">
            <span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span>{{ instruction }}</span>
          </li>
        </ol>
      </section>

      <section class="detail-columns">
        <div class="detail-section">
          <p class="eyebrow section-index">{{ t('exercise.sectionMuscles') }}</p>
          <h2>{{ t('exercise.muscles') }}</h2>
          <h3>{{ t('exercise.primary') }}</h3>
          <div class="tag-list">
            <span v-for="muscle in exercise.muscles.primary" :key="muscle.id" class="tag">
              {{ muscle.name }}
            </span>
          </div>
          <template v-if="exercise.muscles.secondary.length">
            <h3>{{ t('exercise.secondary') }}</h3>
            <div class="tag-list">
              <span
                v-for="muscle in exercise.muscles.secondary"
                :key="muscle.id"
                class="tag tag-muted"
              >
                {{ muscle.name }}
              </span>
            </div>
          </template>
        </div>
        <div v-if="exercise.benefits?.length" class="detail-section">
          <p class="eyebrow section-index">{{ t('exercise.sectionBenefits') }}</p>
          <h2>{{ t('exercise.benefits') }}</h2>
          <ul class="text-list">
            <li v-for="benefit in exercise.benefits" :key="benefit">{{ benefit }}</li>
          </ul>
        </div>
      </section>

      <section
        v-if="exercise.tips?.length || exercise.commonMistakes?.length"
        class="detail-columns"
      >
        <div v-if="exercise.tips?.length" class="detail-section">
          <p class="eyebrow section-index">{{ t('exercise.sectionForm') }}</p>
          <h2>{{ t('exercise.tips') }}</h2>
          <ul class="text-list">
            <li v-for="tip in exercise.tips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
        <div v-if="exercise.commonMistakes?.length" class="detail-section detail-section-warning">
          <p class="eyebrow section-index">{{ t('exercise.sectionMistakes') }}</p>
          <h2>{{ t('exercise.mistakes') }}</h2>
          <ul class="text-list">
            <li v-for="mistake in exercise.commonMistakes" :key="mistake">{{ mistake }}</li>
          </ul>
        </div>
      </section>

      <section class="detail-section">
        <p class="eyebrow section-index">{{ t('exercise.sectionOptions') }}</p>
        <h2>{{ t('exercise.variations') }}</h2>
        <StatePanel
          v-if="!variations.length"
          :title="t('exercise.noVariations')"
          :message="t('exercise.noVariationsMessage')"
        />
        <div v-else class="variation-list">
          <article v-for="variation in variations" :key="variation.id" class="variation-card">
            <h3>{{ variation.name }}</h3>
            <p>{{ variation.description }}</p>
            <ol class="variation-steps">
              <li v-for="instruction in variation.instructions" :key="instruction">
                {{ instruction }}
              </li>
            </ol>
          </article>
        </div>
      </section>

      <ExerciseFloorPlan :locations="exercise.equipmentLocations" />
    </template>
  </div>
</template>
