<script setup>
import { computed } from 'vue'
import { Check, CheckCheck, Pencil, Reply, Trash2 } from 'lucide-vue-next'
import { formatTime } from '../lib/format'
import AttachmentView from './AttachmentView.vue'
import ChatAvatar from './ChatAvatar.vue'

const {
  message,
  own = false,
  showAuthor = false,
} = defineProps({
  message: { type: Object, required: true },
  own: { type: Boolean, default: false },
  // Em salas coletivas mostra nome/foto de quem escreveu (só nas mensagens dos outros).
  showAuthor: { type: Boolean, default: false },
})

const emit = defineEmits(['reply', 'edit', 'delete'])

const authorName = computed(() => message.author?.name ?? 'Usuário removido')
const hasActions = computed(() => !message.is_deleted)
const canEdit = computed(() => own && !message.is_deleted && !message.file)

function replyPreview(reply) {
  if (reply.is_deleted) return 'Mensagem apagada'

  return reply.body || (reply.has_file ? 'Anexo' : '')
}
</script>

<template>
  <li class="message" :class="{ 'message--own': own }">
    <ChatAvatar
      v-if="!own"
      class="message__avatar"
      :class="{ 'message__avatar--hidden': !showAuthor }"
      :name="authorName"
      :src="message.author?.avatar ?? null"
      :size="32"
    />

    <div class="message__column">
      <div class="message__bubble" :class="{ 'message__bubble--deleted': message.is_deleted }">
        <p v-if="showAuthor && !own" class="message__author">{{ authorName }}</p>

        <blockquote v-if="message.reply_to && !message.is_deleted" class="message__reply">
          <strong>{{ message.reply_to.author?.name ?? 'Usuário removido' }}</strong>
          <span>{{ replyPreview(message.reply_to) }}</span>
        </blockquote>

        <p v-if="message.is_deleted" class="message__text">Mensagem apagada</p>
        <template v-else>
          <AttachmentView v-if="message.file" :message-id="message.id" :file="message.file" />
          <p v-if="message.body" class="message__text">{{ message.body }}</p>
        </template>

        <span class="message__meta">
          <span v-if="message.edited_at && !message.is_deleted">editada</span>
          <time :datetime="message.created">{{ formatTime(message.created) }}</time>
          <component
            :is="message.read ? CheckCheck : Check"
            v-if="own && !message.is_deleted"
            :size="14"
            :class="{ message__read: message.read }"
            :aria-label="message.read ? 'Lida por todos' : 'Enviada'"
            role="img"
          />
        </span>
      </div>

      <div v-if="hasActions" class="message__actions">
        <button
          type="button"
          aria-label="Responder"
          title="Responder"
          @click="emit('reply', message)"
        >
          <Reply :size="15" aria-hidden="true" />
        </button>
        <button
          v-if="canEdit"
          type="button"
          aria-label="Editar"
          title="Editar"
          @click="emit('edit', message)"
        >
          <Pencil :size="15" aria-hidden="true" />
        </button>
        <button
          v-if="own"
          type="button"
          aria-label="Apagar"
          title="Apagar"
          class="message__danger"
          @click="emit('delete', message)"
        >
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </div>
    </div>
  </li>
</template>

<style scoped>
.message {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 100%;
}

.message--own {
  flex-direction: row-reverse;
}

.message__avatar--hidden {
  visibility: hidden;
}

.message__column {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  max-width: min(32rem, 85%);
}

.message--own .message__column {
  flex-direction: row-reverse;
}

.message__bubble {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
  background-color: var(--color-background);
}

.message--own .message__bubble {
  color: #ffffff;
  border-color: transparent;
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  background-color: var(--color-primary);
}

.message__bubble--deleted {
  font-style: italic;
  opacity: 0.7;
}

.message__author {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.message__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message__reply {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  border-left: 3px solid currentColor;
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}

.message__reply span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0.85;
}

.message__meta {
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
  gap: 0.375rem;
  font-size: 0.6875rem;
  opacity: 0.75;
}

.message__read {
  color: #bfdbfe;
}

.message__actions {
  display: flex;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message:hover .message__actions,
.message:focus-within .message__actions {
  opacity: 1;
}

/* Sem hover (toque): as ações ficam sempre visíveis, discretas. */
@media (hover: none) {
  .message__actions {
    opacity: 0.7;
  }
}

.message__actions button {
  display: inline-flex;
  padding: 0.375rem;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.message__actions button:hover {
  color: var(--color-text);
  background-color: var(--color-border);
}

.message__actions .message__danger:hover {
  color: var(--color-danger);
}
</style>
