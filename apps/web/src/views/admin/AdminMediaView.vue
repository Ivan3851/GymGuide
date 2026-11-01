<script setup>
import { onMounted, ref } from 'vue'
import { deleteAdminMedia, getAdmin, uploadAdminMedia } from '@/api/admin'

const assets = ref([])
const selectedFile = ref(null)
const progress = ref(0)
const uploading = ref(false)
const error = ref('')
const notice = ref('')

async function load() {
  try {
    assets.value = await getAdmin('media')
  } catch (problem) {
    error.value = problem.message
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
    notice.value = 'Media uploaded.'
    await load()
  } catch (problem) {
    error.value = problem.message
  } finally {
    uploading.value = false
  }
}
async function remove(asset) {
  error.value = ''
  notice.value = ''
  try {
    await deleteAdminMedia(asset.id)
    notice.value = 'Media deleted.'
    await load()
  } catch (problem) {
    error.value = problem.message
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
        <p class="admin-eyebrow">Content</p>
        <h1>Media library</h1>
        <p class="admin-muted">Local exercise and floor plan files.</p>
      </div>
    </div>
    <p v-if="notice" class="admin-success" role="status">{{ notice }}</p>
    <p v-if="error" class="admin-alert" role="alert">{{ error }}</p>
    <form class="admin-panel media-upload-form" @submit.prevent="upload">
      <label
        >Choose MP4, JPEG, PNG or WebP<input
          type="file"
          accept="video/mp4,image/jpeg,image/png,image/webp"
          @change="selectedFile = $event.target.files?.[0] || null"
      /></label>
      <button class="admin-button admin-button-primary" :disabled="!selectedFile || uploading">
        {{ uploading ? `Uploading ${progress}%` : 'Upload media' }}
      </button>
      <progress v-if="uploading" max="100" :value="progress" aria-label="Upload progress" />
    </form>
    <div v-if="!assets.length" class="admin-panel admin-message">No media uploaded yet.</div>
    <div class="media-grid">
      <article v-for="asset in assets" :key="asset.id" class="admin-panel media-card">
        <img v-if="asset.mediaType === 'image'" :src="asset.contentUrl" :alt="asset.originalName" />
        <video v-else :src="asset.contentUrl" controls preload="metadata" />
        <strong>{{ asset.originalName }}</strong
        ><span>{{ asset.mimeType }} · {{ formatSize(asset.size) }}</span>
        <time :datetime="new Date(asset.createdAt).toISOString()">{{
          new Date(asset.createdAt).toLocaleString()
        }}</time>
        <button class="admin-button admin-button-danger" @click="remove(asset)">
          Delete if unused
        </button>
      </article>
    </div>
  </section>
</template>
