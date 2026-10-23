<script setup>
import { computed, ref } from 'vue'
import { Download, FileText, ImageOff } from 'lucide-vue-next'
import { useAttachmentPreview, saveAttachment } from '../composables/useAttachment'
import { formatSize } from '../lib/format'

const { messageId, file } = defineProps({
  messageId: { type: Number, required: true },
  // { name, size, content_type, is_image }
  file: { type: Object, required: true },
})

const { url, failed } = file.is_image
  ? useAttachmentPreview(messageId)
  : { url: ref(null), failed: ref(false) }
const emit = defineEmits(['open'])
const saving = ref(false)

// Tamanho máximo da miniatura (px). A caixa é calculada aqui, com proporção exata, porque só com
// max-width/max-height o navegador deixava a bolha mais larga que a foto (fotos em pé, por ex.).
const MAX_WIDTH = 288
const MAX_HEIGHT = 256
const size = ref(null)
const imageStyle = computed(() =>
  size.value ? { width: `${size.value.width}px`, height: `${size.value.height}px` } : null,
)

function onImageLoad(event) {
  const { naturalWidth, naturalHeight } = event.target
  if (!naturalWidth || !naturalHeight) return
  const scale = Math.min(1, MAX_WIDTH / naturalWidth, MAX_HEIGHT / naturalHeight)
  size.value = {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  }
}

async function download() {
  saving.value = true

  try {
    await saveAttachment(messageId, file.name)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="attachment">
    <template v-if="file.is_image">
      <button
        v-if="url"
        type="button"
        class="attachment__image-button"
        :aria-label="`Abrir imagem ${file.name}`"
        @click="emit('open')"
      >
        <img
          class="attachment__image"
          :src="url"
          :alt="file.name"
          :style="imageStyle"
          @load="onImageLoad"
        />
      </button>
      <div v-else-if="failed" class="attachment__placeholder">
        <ImageOff :size="20" aria-hidden="true" />
        <span>Imagem indisponível</span>
      </div>
      <div v-else class="attachment__placeholder attachment__placeholder--loading">
        Carregando imagem...
      </div>
    </template>

    <button v-else type="button" class="attachment__file" :disabled="saving" @click="download">
      <FileText :size="22" aria-hidden="true" />
      <span class="attachment__meta">
        <span class="attachment__name">{{ file.name }}</span>
        <small>{{ formatSize(file.size) }}</small>
      </span>
      <Download :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.attachment__image-button {
  display: block;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.attachment__image {
  display: block;
  max-width: 100%;
  min-width: 3rem;
  object-fit: cover;
}

.attachment__placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 10rem;
  padding: 1.5rem 1rem;
  font-size: 0.8125rem;
  border-radius: var(--radius-md);
  background-color: color-mix(in srgb, currentColor 8%, transparent);
}

.attachment__file {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  max-width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-radius: var(--radius-md);
  background-color: color-mix(in srgb, currentColor 8%, transparent);
}

.attachment__file:hover:not(:disabled) {
  background-color: color-mix(in srgb, currentColor 14%, transparent);
}

.attachment__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attachment__name {
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
