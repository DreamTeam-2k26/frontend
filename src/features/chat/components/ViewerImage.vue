<script setup>
import { ImageOff } from 'lucide-vue-next'
import { useAttachmentPreview } from '../composables/useAttachment'

const { messageId, name } = defineProps({
  messageId: { type: Number, required: true },
  name: { type: String, default: '' },
})

const { url, failed } = useAttachmentPreview(messageId)
</script>

<template>
  <img v-if="url" class="viewer-image" :src="url" :alt="name" draggable="false" />
  <p v-else-if="failed" class="viewer-image__state">
    <ImageOff :size="28" aria-hidden="true" />
    Imagem indisponível
  </p>
  <p v-else class="viewer-image__state">Carregando imagem...</p>
</template>

<style scoped>
.viewer-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0.25rem;
  user-select: none;
}

.viewer-image__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: rgb(255 255 255 / 80%);
}
</style>
