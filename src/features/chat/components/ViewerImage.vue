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

@media (prefers-reduced-motion: no-preference) {
  .viewer-image {
    animation: image-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
}

@keyframes image-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}
</style>
