<script setup>
import { computed } from 'vue'
import { Check, CheckCheck, Clock, Pencil, Reply, Trash2 } from 'lucide-vue-next'
import { formatTime } from '../lib/format'
import AttachmentView from './AttachmentView.vue'
import ChatAvatar from './ChatAvatar.vue'

const {
  message,
  own = false,
  showAuthor = false,
  status = null,
  fresh = false,
} = defineProps({
  message: { type: Object, required: true },
  own: { type: Boolean, default: false },
  // Em salas coletivas mostra nome/foto de quem escreveu (só nas mensagens dos outros).
  showAuthor: { type: Boolean, default: false },
  // 'sent' | 'delivered' | 'read' (só nas mensagens próprias).
  status: { type: String, default: null },
  // Mensagem recém-chegada nesta sessão: entra com animação (as do histórico aparecem direto).
  fresh: { type: Boolean, default: false },
})

const emit = defineEmits(['reply', 'edit', 'delete', 'open-image'])

const STATUS_LABEL = {
  sent: 'Enviada',
  delivered: 'Recebida',
  read: 'Lida',
  pending: 'Enviando...',
}

const authorName = computed(() => message.author?.name ?? 'Usuário removido')
const hasActions = computed(() => !message.is_deleted)
// Foto sem texto nem resposta: a bolha vira só uma moldura fina em volta da imagem.
const isPhoto = computed(
  () =>
    Boolean(message.file?.is_image) && !message.body && !message.reply_to && !message.is_deleted,
)
const canEdit = computed(() => own && !message.is_deleted && !message.file)

function replyPreview(reply) {
  if (reply.is_deleted) return 'Mensagem apagada'

  return reply.body || (reply.has_file ? 'Anexo' : '')
}
</script>

<template>
  <li
    class="message"
    :class="{
      'message--own': own,
      'message--fresh': fresh,
      'message--pending': status === 'pending',
    }"
  >
    <div class="message__inner">
      <ChatAvatar
        class="message__avatar"
        :class="{ 'message__avatar--hidden': !showAuthor }"
        :name="authorName"
        :src="message.author?.avatar ?? null"
        :size="36"
      />

      <div class="message__main">
        <p v-if="showAuthor && !own" class="message__head">
          <span class="message__author">{{ authorName }}</span>
        </p>

        <div class="message__row">
          <div
            class="message__bubble"
            :class="{
              'message__bubble--deleted': message.is_deleted,
              'message__bubble--photo': isPhoto,
              'message__bubble--tail': showAuthor,
            }"
          >
            <blockquote v-if="message.reply_to && !message.is_deleted" class="message__reply">
              <strong>{{ message.reply_to.author?.name ?? 'Usuário removido' }}</strong>
              <span>{{ replyPreview(message.reply_to) }}</span>
            </blockquote>

            <p v-if="message.is_deleted" class="message__text">Mensagem apagada</p>
            <template v-else>
              <AttachmentView
                v-if="message.file"
                :message-id="message.id"
                :file="message.file"
                @open="emit('open-image', message)"
              />
              <p v-if="message.body" class="message__text">{{ message.body }}</p>
            </template>

            <span class="message__meta">
              <span v-if="message.edited_at && !message.is_deleted">editada</span>
              <time :datetime="message.created">{{ formatTime(message.created) }}</time>
              <Transition name="tick" mode="out-in">
                <component
                  :is="
                    status === 'pending' ? Clock : status === 'sent' || !status ? Check : CheckCheck
                  "
                  v-if="own && !message.is_deleted"
                  :key="status"
                  :size="14"
                  :class="{ message__read: status === 'read' }"
                  :aria-label="STATUS_LABEL[status] ?? STATUS_LABEL.sent"
                  :title="STATUS_LABEL[status] ?? STATUS_LABEL.sent"
                  role="img"
                />
              </Transition>
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
      </div>
    </div>
  </li>
</template>

<style scoped>
/* Visual minimalista: balões suaves sem borda, nome e hora acima, tons derivados da cor primária. */
.message {
  display: grid;
  grid-template-rows: 1fr;
  max-width: 100%;
}

.message__inner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-height: 0;
  max-width: 100%;
  padding-bottom: 1.25rem;
}

.message--own .message__inner {
  flex-direction: row-reverse;
}

.message__avatar--hidden {
  visibility: hidden;
}

.message__main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  max-width: min(34rem, 85%);
}

.message--own .message__main {
  align-items: flex-end;
}

.message__head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.25rem;
}

.message__author {
  color: var(--color-text);
  font-size: 0.875rem;
}

.message__meta {
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
  gap: 0.375rem;
  color: var(--color-text-secondary);
  font-size: 0.6875rem;
}

.message__meta svg.message__read {
  color: #2563eb;
}

/* Foto: a hora fica sobre a imagem (canto inferior direito). */
.message__bubble--photo {
  position: relative;
}

.message__bubble--photo .message__meta {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  padding: 0.0625rem 0.375rem;
  color: #ffffff;
  border-radius: 999px;
  background-color: rgb(0 0 0 / 50%);
}

.message__bubble--photo .message__meta svg.message__read {
  color: #60a5fa;
}

.message__row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.message--own .message__row {
  flex-direction: row-reverse;
}

.message__bubble {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.4375rem 0.875rem;
  color: var(--color-text);
  border-radius: 1rem;
  background-color: var(--bubble-bg);
  --bubble-bg: color-mix(in srgb, var(--color-primary) 7%, var(--chat-bg, var(--color-background)));
}

.message--own .message__bubble {
  --bubble-bg: color-mix(
    in srgb,
    var(--color-primary) 13%,
    var(--chat-bg, var(--color-background))
  );
}

/* Rabinho de balão de fala apontando para a foto de perfil (só na 1ª mensagem da sequência). */
.message__bubble--tail {
  position: relative;
  border-top-left-radius: 0;
}

.message--own .message__bubble--tail {
  border-top-left-radius: 1rem;
  border-top-right-radius: 0;
}

.message__bubble--tail::before {
  position: absolute;
  top: 0;
  left: -0.5rem;
  width: 0.5rem;
  height: 0.75rem;
  content: '';
  background-color: var(--bubble-bg);
  clip-path: polygon(100% 0, 100% 100%, 0 0);
}

.message--own .message__bubble--tail::before {
  right: -0.5rem;
  left: auto;
  clip-path: polygon(0 0, 0 100%, 100% 0);
}

.message__bubble--photo {
  width: fit-content;
  padding: 0.1875rem;
}

.message__bubble--deleted {
  color: var(--color-text-secondary);
  font-style: italic;
}

.message__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message__reply {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.message__reply span {
  overflow: hidden;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
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

/* Animações: a mensagem nova abre espaço (as de cima sobem) e desliza para o lugar, com fade. */
@media (prefers-reduced-motion: no-preference) {
  .message--fresh {
    animation: message-grow 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .message--fresh .message__inner {
    overflow: hidden;
  }

  .message--fresh .message__main {
    animation: message-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .message--own.message--fresh .message__main {
    animation-name: message-in-own;
  }
}

@keyframes message-grow {
  from {
    grid-template-rows: 0fr;
  }
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translate(-0.5rem, 1rem);
  }
}

@keyframes message-in-own {
  from {
    opacity: 0;
    transform: translate(0.5rem, 1rem);
  }
}

/* Enviando: o balão fica translúcido até o servidor confirmar, aí "assenta". */
.message--pending .message__bubble {
  opacity: 0.6;
}

.message__bubble {
  transition:
    background-color 0.2s ease,
    opacity 0.35s ease;
}

.tick-enter-active {
  transition:
    transform 0.28s cubic-bezier(0.3, 1.6, 0.5, 1),
    opacity 0.2s ease-out;
}

.tick-leave-active {
  transition:
    transform 0.12s ease-in,
    opacity 0.12s ease-in;
}

.tick-enter-from,
.tick-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.message__actions button {
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.message__actions button:active {
  transform: scale(0.88);
}
</style>
