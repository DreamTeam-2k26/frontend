<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Info } from 'lucide-vue-next'
import ChatAvatar from './ChatAvatar.vue'
import MessageComposer from './MessageComposer.vue'
import MessageList from './MessageList.vue'

const { room, messages, meId, typing, disabled, maxFileMb } = defineProps({
  room: { type: Object, required: true },
  // { items, hasMore, loaded } ou null enquanto não há histórico.
  messages: { type: Object, default: null },
  meId: { type: Number, default: null },
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

    return names.length === 1
      ? `${names[0]} está digitando...`
      : `${names.join(', ')} estão digitando...`
  }

  return `${room.member_count} participante${room.member_count === 1 ? '' : 's'}`
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
  <section class="window" :aria-label="`Conversa ${room.name}`">
    <header class="window__header">
      <button
        type="button"
        class="window__back"
        aria-label="Voltar às conversas"
        @click="emit('back')"
      >
        <ArrowLeft :size="20" aria-hidden="true" />
      </button>
      <ChatAvatar :name="room.name" :src="room.image" :size="40" />
      <div class="window__title">
        <h2>{{ room.name }}</h2>
        <small :class="{ window__typing: typing.length }" aria-live="polite">{{ subtitle }}</small>
      </div>
      <button
        type="button"
        class="window__info"
        aria-label="Detalhes da sala"
        @click="emit('info')"
      >
        <Info :size="20" aria-hidden="true" />
      </button>
    </header>

    <MessageList
      :key="room.id"
      :messages="messages?.items ?? []"
      :me-id="meId"
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
  background-color: var(--color-background);
}

.window__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.window__title {
  flex: 1;
  min-width: 0;
}

.window__title h2 {
  overflow: hidden;
  font-size: 1rem;
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
  background-color: var(--color-surface);
}

/* Só no celular existe a lista como tela separada. */
@media (min-width: 768px) {
  .window__back {
    display: none;
  }
}
</style>
