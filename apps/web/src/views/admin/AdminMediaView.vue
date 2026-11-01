<script setup>
import { onMounted, ref } from 'vue'
import { deleteAdminMedia, getAdmin, uploadAdminMedia } from '@/api/admin'
import { useLocale } from '@/localization/locale'
import { apiErrorMessageKey } from '@/localization/api-error'

const assets = ref([])
const selectedFile = ref(null)
const progress = ref(0)
const uploading = ref(false)
const error = ref('')
const notice = ref('')
const { locale, t } = useLocale()

async function load() {
  try {
    assets.value = await getAdmin('media')
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  }
}
async function upload() {
  if (!selectedFile.value) return
  uploading.value = true
  progress.value = 0
  error.value = ''
  notice.value = ''
  try {
    await uploadAdminMedia(selectedFile.value, (value) => {
      progress.value = value
    })
    selectedFile.value = null
    notice.value = 'admin.mediaUploaded'
    await load()
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  } finally {
    uploading.value = false
  }
}
async function remove(asset) {
  error.value = ''
  notice.value = ''
  try {
    await deleteAdminMedia(asset.id)
    notice.value = 'admin.mediaDeleted'
    await load()
  } catch (problem) {
    error.value = apiErrorMessageKey(problem)
  }
}
function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`
}
onMounted(load)
</script>

<template>
  <section>
    <div class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">{{ t('admin.content') }}</p>
        <h1>{{ t('admin.mediaTitle') }}</h1>
        <p class="admin-muted">{{ t('admin.mediaDescription') }}</p>
      </div>
    </div>
    <p v-if="notice" class="admin-success" role="status">{{ t(notice) }}</p>
    <p v-if="error" class="admin-alert" role="alert">{{ t(error) }}</p>
    <form class="admin-panel media-upload-form" @submit.prevent="upload">
      <label
        >{{ t('admin.chooseMedia')
        }}<input
          type="file"
          accept="video/mp4,image/jpeg,image/png,image/webp"
          @change="selectedFile = $event.target.files?.[0] || null"
      /></label>
      <button class="admin-button admin-button-primary" :disabled="!selectedFile || uploading">
        {{ uploading ? t('admin.uploading', { percent: progress }) : t('admin.uploadMedia') }}
      </button>
      <progress
        v-if="uploading"
        max="100"
        :value="progress"
        :aria-label="t('admin.uploadProgress')"
      />
    </form>
    <div v-if="!assets.length" class="admin-panel admin-message">{{ t('admin.noMedia') }}</div>
    <div class="media-grid">
      <article v-for="asset in assets" :key="asset.id" class="admin-panel media-card">
        <img v-if="asset.mediaType === 'image'" :src="asset.contentUrl" :alt="asset.originalName" />
        <video v-else :src="asset.contentUrl" controls preload="metadata" />
        <strong>{{ asset.originalName }}</strong
        ><span>{{ asset.mimeType }} · {{ formatSize(asset.size) }}</span>
        <time :datetime="new Date(asset.createdAt).toISOString()">{{
          new Date(asset.createdAt).toLocaleString(locale)
        }}</time>
        <button class="admin-button admin-button-danger" @click="remove(asset)">
          {{ t('admin.deleteIfUnused') }}
        </button>
      </article>
    </div>
  </section>
</template>
