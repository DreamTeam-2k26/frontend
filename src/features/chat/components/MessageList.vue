<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { ChevronUp } from 'lucide-vue-next'
import { dayKey, formatDay } from '../lib/format'
import ImageViewer from './ImageViewer.vue'
import { messageStatus } from '../lib/receipts'
import MessageItem from './MessageItem.vue'

const { messages, meId, members, presence, loadingOlder, hasMore, loading, error } = defineProps({
  messages: { type: Array, required: true },
  meId: { type: Number, default: null },
  members: { type: Array, default: () => [] },
  presence: { type: Object, default: () => ({}) },
  hasMore: { type: Boolean, default: false },
  loadingOlder: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['load-older', 'reply', 'edit', 'delete'])

const scroller = useTemplateRef('scroller')
const nearBottom = ref(true)
const viewerId = ref(null)

function statusOf(message) {
  return messageStatus(message, { members, presence, authorId: meId })
}

// Fotos da sala (sem as apagadas), na ordem da conversa, para navegar no visualizador.
const photos = computed(() =>
  messages.filter((message) => message.file?.is_image && !message.is_deleted),
)

// Agrupa por dia e decide quando repetir nome/foto (mensagens seguidas do mesmo autor).
const rows = computed(() => {
  const result = []
  let lastDay = null
  let lastAuthor = null

  for (const message of messages) {
    const day = dayKey(message.created)

    if (day !== lastDay) {
      result.push({ kind: 'day', key: `day-${day}`, label: formatDay(message.created) })
      lastDay = day
      lastAuthor = null
    }

    const authorId = message.author?.id ?? null

    result.push({ kind: 'message', key: message.id, message, showAuthor: authorId !== lastAuthor })
    lastAuthor = authorId
  }

  return result
})

function onScroll() {
  const el = scroller.value

  nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function scrollToBottom() {
  const el = scroller.value

  if (el) el.scrollTop = el.scrollHeight
}

// Nova mensagem: acompanha o fim da conversa só se a pessoa já estava lá (ou se a mensagem é dela).
watch(
  () => messages[messages.length - 1]?.id,
  async (id, previous) => {
    if (id === undefined || id === previous) return

    const last = messages[messages.length - 1]
    const follow = nearBottom.value || last?.author?.id === meId

    await nextTick()

    if (follow || previous === undefined) scrollToBottom()
  },
)

// Mensagens antigas entram no topo: mantém a posição visível em vez de pular.
async function loadOlder() {
  const el = scroller.value
  const before = el.scrollHeight - el.scrollTop

  emit('load-older')

  const stop = watch(
    () => messages.length,
    async () => {
      await nextTick()
      el.scrollTop = el.scrollHeight - before
      stop()
    },
  )
}

onMounted(scrollToBottom)
</script>

<template>
  <div ref="scroller" class="list" @scroll.passive="onScroll">
    <p v-if="loading && !messages.length" class="list__state" role="status">
      Carregando mensagens...
    </p>
    <p v-else-if="error && !messages.length" class="list__state list__state--error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="!messages.length" class="list__state">Nenhuma mensagem ainda. Diga olá!</p>

    <button
      v-if="hasMore"
      type="button"
      class="list__older"
      :disabled="loadingOlder"
      @click="loadOlder"
    >
      <ChevronUp :size="16" aria-hidden="true" />
      {{ loadingOlder ? 'Carregando...' : 'Carregar mensagens anteriores' }}
    </button>

    <ul class="list__items" aria-live="polite" aria-label="Mensagens">
      <template v-for="row in rows" :key="row.key">
        <li v-if="row.kind === 'day'" class="list__day" role="separator">
          <span>{{ row.label }}</span>
        </li>
        <MessageItem
          v-else
          :message="row.message"
          :own="row.message.author?.id === meId"
          :status="row.message.author?.id === meId ? statusOf(row.message) : null"
          :show-author="row.showAuthor"
          @reply="emit('reply', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @open-image="viewerId = $event.id"
        />
      </template>
    </ul>

    <ImageViewer
      v-if="viewerId !== null && photos.some((photo) => photo.id === viewerId)"
      :items="photos"
      :current-id="viewerId"
      @change="viewerId = $event"
      @close="viewerId = null"
    />
  </div>
</template>

<style scoped>
.list {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  background-color: var(--color-surface);
}

.list__items {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.list__state {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.list__state--error {
  color: var(--color-danger);
}

.list__older {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0 auto 1rem;
  padding: 0.375rem 0.875rem;
  color: var(--color-primary);
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-background);
}

.list__day {
  align-self: center;
  margin: 0.5rem 0;
  padding: 0.125rem 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  border-radius: 999px;
  background-color: var(--color-border);
}
</style>
