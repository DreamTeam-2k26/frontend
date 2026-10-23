<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Ellipsis } from 'lucide-vue-next'
import { onlineCount } from '../lib/receipts'
import ChatAvatar from './ChatAvatar.vue'
import MessageComposer from './MessageComposer.vue'
import MessageList from './MessageList.vue'

const { room, messages, meId, typing, disabled, maxFileMb, members, presence } = defineProps({
  room: { type: Object, required: true },
  // { items, hasMore, loaded } ou null enquanto não há histórico.
  messages: { type: Object, default: null },
  meId: { type: Number, default: null },
  // Membros da sala e presença ao vivo (tiques de entrega e contador de online).
  members: { type: Array, default: () => [] },
  presence: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  loadingOlder: { type: Boolean, default: false },
  error: { type: String, default: '' },
  typing: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  maxFileMb: { type: Number, default: 10 },
})

const emit = defineEmits([
  'back',
  'info',
  'load-older',
  'send',
  'send-file',
  'edit',
  'delete',
  'typing',
])

const replyTo = ref(null)
const editing = ref(null)

// Trocar de sala descarta resposta/edição pendentes.
watch(
  () => room.id,
  () => {
    replyTo.value = null
    editing.value = null
  },
)

const subtitle = computed(() => {
  if (typing.length) {
    const names = typing.map((user) => user.name)

    return names.length === 1 ? `${names[0]} está digitando` : `${names.join(', ')} estão digitando`
  }

  const total = `${room.member_count} participante${room.member_count === 1 ? '' : 's'}`

  return members.length ? `${total} · ${onlineCount(members, presence)} online` : total
})

function startReply(message) {
  editing.value = null
  replyTo.value = message
}

function startEdit(message) {
  replyTo.value = null
  editing.value = message
}

function confirmDelete(message) {
  if (window.confirm('Apagar esta mensagem para todos?')) emit('delete', message.id)
}

function cancelContext() {
  replyTo.value = null
  editing.value = null
}

function onSend(payload) {
  emit('send', payload)
  replyTo.value = null
}

function onSendFile(payload) {
  emit('send-file', payload)
  replyTo.value = null
}

function onEdit(payload) {
  emit('edit', payload)
  editing.value = null
}
</script>

<template>
  <section class="window" :aria-label="`Sala ${room.name}`">
    <header class="window__header">
      <button type="button" class="window__back" aria-label="Voltar às salas" @click="emit('back')">
        <ArrowLeft :size="20" aria-hidden="true" />
      </button>
      <ChatAvatar
        :key="`avatar-${room.id}`"
        class="window__swap"
        :name="room.name"
        :src="room.image"
        :size="38"
      />
      <div :key="`title-${room.id}`" class="window__title window__swap">
        <h2>{{ room.name }}</h2>
        <small :class="{ window__typing: typing.length }" aria-live="polite"
          >{{ subtitle
          }}<span v-if="typing.length" class="dots" aria-hidden="true"><i></i><i></i><i></i></span
        ></small>
      </div>
      <button
        type="button"
        class="window__info"
        aria-label="Detalhes da sala"
        @click="emit('info')"
      >
        <Ellipsis :size="20" aria-hidden="true" />
      </button>
    </header>

    <MessageList
      :key="room.id"
      :messages="messages?.items ?? []"
      :me-id="meId"
      :members="members"
      :presence="presence"
      :has-more="messages?.hasMore ?? false"
      :loading="loading"
      :loading-older="loadingOlder"
      :error="error"
      @load-older="emit('load-older')"
      @reply="startReply"
      @edit="startEdit"
      @delete="confirmDelete"
    />

    <MessageComposer
      :disabled="disabled"
      :reply-to="replyTo"
      :editing="editing"
      :max-file-mb="maxFileMb"
      @send="onSend"
      @send-file="onSendFile"
      @edit="onEdit"
      @typing="emit('typing')"
      @cancel="cancelContext"
    />
  </section>
</template>

<style scoped>
.window {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--chat-bg, var(--color-background));
}

.window__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.window__title {
  flex: 1;
  min-width: 0;
}

.window__title h2 {
  overflow: hidden;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.window__title small {
  color: var(--color-text-secondary);
}

.window__typing {
  color: var(--color-primary) !important;
}

.window__back,
.window__info {
  display: inline-flex;
  padding: 0.5rem;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.window__back:hover,
.window__info:hover {
  color: var(--color-text);
  background-color: color-mix(
    in srgb,
    var(--color-primary) 8%,
    var(--chat-bg, var(--color-background))
  );
}

/* Só no celular existe a lista como tela separada. */
@media (min-width: 768px) {
  .window__back {
    display: none;
  }
}

.dots {
  display: inline-flex;
  gap: 0.1875rem;
  margin-left: 0.25rem;
  vertical-align: middle;
}

.dots i {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background-color: currentColor;
}

.window__back,
.window__info {
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

@media (prefers-reduced-motion: no-preference) {
  .window__swap {
    animation: swap-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .dots i {
    animation: dot-bounce 1.2s ease-in-out infinite;
  }

  .dots i:nth-child(2) {
    animation-delay: 0.15s;
  }

  .dots i:nth-child(3) {
    animation-delay: 0.3s;
  }
}

@keyframes swap-in {
  from {
    opacity: 0;
    transform: translateX(0.5rem);
  }
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-0.25rem);
  }
}
</style>
