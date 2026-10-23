<script setup>
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
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
// Mensagens que chegaram com a sala aberta (recebem a animação de entrada).
const freshIds = reactive(new Set())

function statusOf(message) {
  if (message.pending) return 'pending'

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

    result.push({
      kind: 'message',
      key: message._key ?? message.id,
      message,
      showAuthor: authorId !== lastAuthor,
    })
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
  () => {
    const last = messages[messages.length - 1]

    return last ? (last._key ?? last.id) : undefined
  },
  async (key, previous) => {
    if (key === undefined || key === previous) return

    const last = messages[messages.length - 1]
    const follow = nearBottom.value || last?.author?.id === meId

    if (previous !== undefined) freshIds.add(key)

    await nextTick()

    if (previous === undefined) scrollToBottom()
    else if (follow) followBottom()
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

// O balão novo cresce em altura (empurrando as mensagens de cima); acompanha o fim durante a animação.
function followBottom(duration = 500) {
  const el = scroller.value
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (!el) return

  if (reduced) return scrollToBottom()

  const start = performance.now()

  function frame(time) {
    el.scrollTop = el.scrollHeight

    if (time - start < duration && scroller.value) requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}

onMounted(() => scrollToBottom())
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
          :fresh="freshIds.has(row.key)"
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
  padding: 1rem 1.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  background-color: var(--chat-deep, var(--chat-bg, var(--color-background)));
}

.list__items {
  display: flex;
  flex-direction: column;
  gap: 0;
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
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  border-radius: 999px;
  background-color: color-mix(
    in srgb,
    var(--color-primary) 7%,
    var(--chat-bg, var(--color-background))
  );
}

.list__older:hover:not(:disabled) {
  color: var(--color-text);
}

.list__day {
  align-self: center;
  margin: 0.5rem 0 1.75rem;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

@media (prefers-reduced-motion: no-preference) {
  .list {
    animation: list-in 0.25s ease-out;
  }
}

@keyframes list-in {
  from {
    opacity: 0;
    transform: translateY(0.375rem);
  }
}

.list__older {
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}
</style>
