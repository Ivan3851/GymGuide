<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getExercise, getExerciseVariations } from '@/api/catalog'
import VideoPlaceholder from '@/components/exercise/VideoPlaceholder.vue'
import ExerciseFloorPlan from '@/components/exercise/ExerciseFloorPlan.vue'
import PageHeading from '@/components/shared/PageHeading.vue'
import StatePanel from '@/components/shared/StatePanel.vue'
import { useAsyncData } from '@/composables/useAsyncData'

const route = useRoute()
const exerciseId = computed(() => String(route.params.id || ''))
const backTo = computed(() =>
  route.query.fromEquipment
    ? { name: 'equipment', params: { id: String(route.query.fromEquipment) } }
    : '/',
)

async function loadExercise(id) {
  const [exercise, variations] = await Promise.all([getExercise(id), getExerciseVariations(id)])
  return { exercise, variations }
}

const { data, isLoading, error, load } = useAsyncData(loadExercise)
watch(exerciseId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="browse-view exercise-view">
    <PageHeading
      :title="data?.exercise?.name || 'Exercise guide'"
      description="A fictional demo guide for exploring GymGuide. Follow the equipment instructions at your gym."
      :back-to="backTo"
      back-label="Exercises"
    />

    <StatePanel v-if="isLoading" title="Loading exercise…" message="Preparing the demo guide." />
    <StatePanel
      v-else-if="error"
      title="Exercise could not be loaded"
      :message="error"
      tone="error"
      action-label="Try again"
      @action="load(exerciseId)"
    />
    <template v-else-if="data?.exercise">
      <video
        v-if="data.exercise.video?.status === 'available'"
        class="exercise-video"
        :src="data.exercise.video.contentUrl"
        controls
        playsinline
        preload="metadata"
      >
        Your browser does not support HTML video.
      </video>
      <VideoPlaceholder v-else />
      <section
        v-if="data.exercise.images?.length"
        class="exercise-images"
        aria-label="Exercise images"
      >
        <img
          v-for="image in data.exercise.images"
          :key="image.id"
          :src="image.contentUrl"
          :alt="`${data.exercise.name} demonstration`"
          loading="lazy"
        />
      </section>

      <section class="detail-section">
        <h2>How to do it</h2>
        <ol class="step-list">
          <li v-for="(instruction, index) in data.exercise.instructions" :key="instruction">
            <span class="step-number">{{ index + 1 }}</span>
            <span>{{ instruction }}</span>
          </li>
        </ol>
      </section>

      <section class="detail-columns">
        <div class="detail-section">
          <h2>Muscles targeted</h2>
          <h3>Primary</h3>
          <div class="tag-list">
            <span v-for="muscle in data.exercise.muscles.primary" :key="muscle.id" class="tag">
              {{ muscle.name }}
            </span>
          </div>
          <template v-if="data.exercise.muscles.secondary.length">
            <h3>Also involved</h3>
            <div class="tag-list">
              <span
                v-for="muscle in data.exercise.muscles.secondary"
                :key="muscle.id"
                class="tag tag-muted"
              >
                {{ muscle.name }}
              </span>
            </div>
          </template>
        </div>

        <div class="detail-section">
          <h2>Why try it</h2>
          <ul class="text-list">
            <li v-for="benefit in data.exercise.benefits" :key="benefit">{{ benefit }}</li>
          </ul>
        </div>
      </section>

      <section class="detail-columns">
        <div class="detail-section">
          <h2>Helpful tips</h2>
          <ul class="text-list">
            <li v-for="tip in data.exercise.tips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
        <div class="detail-section">
          <h2>Common mistakes</h2>
          <ul class="text-list">
            <li v-for="mistake in data.exercise.commonMistakes" :key="mistake">{{ mistake }}</li>
          </ul>
        </div>
      </section>

      <section class="detail-section">
        <h2>Variations</h2>
        <StatePanel
          v-if="!data.variations.length"
          title="No variations listed"
          message="Variations can be added to the catalog later."
        />
        <div v-else class="variation-list">
          <article v-for="variation in data.variations" :key="variation.id" class="variation-card">
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

      <ExerciseFloorPlan :locations="data.exercise.equipmentLocations" />

      <p class="demo-note">
        Demo catalog · Replace this sample guidance with gym-approved content.
      </p>
    </template>
  </div>
</template>
