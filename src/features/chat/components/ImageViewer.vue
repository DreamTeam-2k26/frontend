<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-vue-next'
import { saveAttachment } from '../composables/useAttachment'
import { formatDay, formatTime } from '../lib/format'
import ChatAvatar from './ChatAvatar.vue'
import ViewerImage from './ViewerImage.vue'

// Visualizador de fotos em tela cheia (como no WhatsApp): fundo escuro, autor e hora no topo,
// setas / teclado para passar entre as fotos da sala, Esc ou clique fora para fechar.
const { items, currentId } = defineProps({
  // Mensagens com foto, da mais antiga para a mais nova.
  items: { type: Array, required: true },
  currentId: { type: Number, required: true },
})

const emit = defineEmits(['close', 'change'])

const closeButton = useTemplateRef('closeButton')
let previousFocus = null

const index = computed(() => items.findIndex((item) => item.id === currentId))
const current = computed(() => items[index.value] ?? null)
const previous = computed(() => items[index.value - 1] ?? null)
const next = computed(() => items[index.value + 1] ?? null)
const authorName = computed(() => current.value?.author?.name ?? 'Usuário removido')

function go(target) {
  if (target) emit('change', target.id)
}

function download() {
  if (current.value) saveAttachment(current.value.id, current.value.file?.name)
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowLeft') go(previous.value)
  else if (event.key === 'ArrowRight') go(next.value)
}

onMounted(async () => {
  previousFocus = document.activeElement
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (previousFocus instanceof HTMLElement) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="current"
      class="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de foto"
    >
      <header class="viewer__bar">
        <ChatAvatar :name="authorName" :src="current.author?.avatar ?? null" :size="36" />
        <div class="viewer__who">
          <strong>{{ authorName }}</strong>
          <span>{{ formatDay(current.created) }} às {{ formatTime(current.created) }}</span>
        </div>
        <button
          type="button"
          class="viewer__button"
          title="Baixar"
          aria-label="Baixar foto"
          @click="download"
        >
          <Download :size="20" aria-hidden="true" />
        </button>
        <button
          ref="closeButton"
          type="button"
          class="viewer__button"
          title="Fechar (Esc)"
          aria-label="Fechar"
          @click="emit('close')"
        >
          <X :size="22" aria-hidden="true" />
        </button>
      </header>

      <div class="viewer__stage" @click.self="emit('close')">
        <button
          v-if="previous"
          type="button"
          class="viewer__nav viewer__nav--prev"
          aria-label="Foto anterior"
          @click="go(previous)"
        >
          <ChevronLeft :size="28" aria-hidden="true" />
        </button>

        <ViewerImage :key="current.id" :message-id="current.id" :name="current.file?.name" />

        <button
          v-if="next"
          type="button"
          class="viewer__nav viewer__nav--next"
          aria-label="Próxima foto"
          @click="go(next)"
        >
          <ChevronRight :size="28" aria-hidden="true" />
        </button>
      </div>

      <p v-if="current.body" class="viewer__caption">{{ current.body }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: rgb(11 20 26 / 95%);
}

.viewer__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.viewer__who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.viewer__who strong,
.viewer__who span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.viewer__who span {
  font-size: 0.75rem;
  opacity: 0.7;
}

.viewer__button,
.viewer__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  border-radius: 50%;
}

.viewer__button {
  padding: 0.5rem;
}

.viewer__button:hover,
.viewer__nav:hover {
  background-color: rgb(255 255 255 / 15%);
}

.viewer__stage {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0 4rem 1rem;
}

.viewer__nav {
  position: absolute;
  top: 50%;
  padding: 0.625rem;
  background-color: rgb(255 255 255 / 10%);
  transform: translateY(-50%);
}

.viewer__nav--prev {
  left: 1rem;
}

.viewer__nav--next {
  right: 1rem;
}

.viewer__caption {
  max-width: 40rem;
  margin: 0 auto;
  padding: 0 1rem 1.25rem;
  text-align: center;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (width <= 40rem) {
  .viewer__stage {
    padding: 0 0.5rem 1rem;
  }

  .viewer__nav--prev {
    left: 0.25rem;
  }

  .viewer__nav--next {
    right: 0.25rem;
  }
}
</style>
