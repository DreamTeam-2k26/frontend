<script setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { Paperclip, SendHorizontal, X } from 'lucide-vue-next'
import { shouldCompress } from '../lib/image'

const MAX_LENGTH = 2000

const { disabled, replyTo, editing, maxFileMb } = defineProps({
  disabled: { type: Boolean, default: false },
  // Mensagem sendo respondida ({ id, author, body }) ou editada.
  replyTo: { type: Object, default: null },
  editing: { type: Object, default: null },
  maxFileMb: { type: Number, default: 10 },
})

const emit = defineEmits(['send', 'send-file', 'edit', 'typing', 'cancel'])

const text = ref('')
const input = useTemplateRef('input')
const fileInput = useTemplateRef('fileInput')
const fileError = ref('')

const canSend = computed(() => text.value.trim().length > 0 && !disabled)
const remaining = computed(() => MAX_LENGTH - text.value.length)

// Ao começar a editar, carrega o texto da mensagem no campo.
watch(
  () => editing?.id,
  async (id) => {
    if (id === undefined) return

    text.value = editing.body ?? ''
    await nextTick()
    input.value?.focus()
  },
)

watch(
  () => replyTo?.id,
  async (id) => {
    if (id !== undefined) {
      await nextTick()
      input.value?.focus()
    }
  },
)

function submit() {
  if (!canSend.value) return

  if (editing) emit('edit', { id: editing.id, body: text.value.trim() })
  else emit('send', { body: text.value.trim(), replyTo: replyTo?.id ?? null })

  text.value = ''
}

function onKeydown(event) {
  // Enter envia; Shift+Enter quebra linha (e não envia durante composição de IME).
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape' && (editing || replyTo)) {
    cancel()
  }
}

function onInput() {
  if (!editing) emit('typing')
}

function cancel() {
  if (editing) text.value = ''

  emit('cancel')
}

function onFile(event) {
  const [file] = event.target.files
  event.target.value = '' // permite escolher o mesmo arquivo de novo

  fileError.value = ''

  if (!file) return

  // Foto grande passa: o envio a reduz antes (lib/image.js).
  if (!shouldCompress(file) && file.size > maxFileMb * 1024 * 1024) {
    fileError.value = `O arquivo passa do limite de ${maxFileMb} MB.`

    return
  }

  emit('send-file', { file, replyTo: replyTo?.id ?? null })
}

function replyLabel(message) {
  return message.is_deleted ? 'Mensagem apagada' : message.body || (message.file ? 'Anexo' : '')
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <Transition name="context">
      <div v-if="editing || replyTo" class="composer__context">
        <span class="composer__context-text">
          <strong>{{
            editing ? 'Editando mensagem' : `Respondendo a ${replyTo.author?.name ?? 'usuário'}`
          }}</strong>
          <span v-if="replyTo">{{ replyLabel(replyTo) }}</span>
        </span>
        <button type="button" aria-label="Cancelar" @click="cancel">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
    </Transition>

    <p v-if="fileError" class="composer__error" role="alert">{{ fileError }}</p>

    <div class="composer__row">
      <button
        v-if="!editing"
        type="button"
        class="composer__icon"
        aria-label="Anexar arquivo"
        title="Anexar arquivo"
        :disabled="disabled"
        @click="fileInput.click()"
      >
        <Paperclip :size="20" aria-hidden="true" />
      </button>
      <input ref="fileInput" type="file" class="composer__file" tabindex="-1" @change="onFile" />

      <textarea
        ref="input"
        v-model="text"
        class="composer__input"
        rows="1"
        :maxlength="MAX_LENGTH"
        placeholder="Escreva uma mensagem"
        aria-label="Mensagem"
        :disabled="disabled"
        @keydown="onKeydown"
        @input="onInput"
      />

      <button
        type="submit"
        class="composer__send"
        :disabled="!canSend"
        aria-label="Enviar"
        title="Enviar"
      >
        <SendHorizontal :size="20" aria-hidden="true" />
      </button>
    </div>

    <small v-if="remaining < 200" class="composer__count">{{ remaining }}</small>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 1.5rem 1rem;
  border-top: 1px solid var(--color-border);
  background-color: var(--chat-bg, var(--color-background));
}

.composer__context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
}

.composer__context-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.composer__context-text span {
  overflow: hidden;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.composer__context button {
  display: inline-flex;
  padding: 0.25rem;
  color: var(--color-text-secondary);
}

.composer__error {
  color: var(--color-danger);
  font-size: 0.8125rem;
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.composer__file {
  display: none;
}

.composer__input {
  flex: 1;
  max-height: 8rem;
  padding: 0.625rem 0.875rem;
  resize: none;
  field-sizing: content;
  border: none;
  border-radius: 1.25rem;
  background-color: color-mix(
    in srgb,
    var(--color-primary) 6%,
    var(--chat-bg, var(--color-background))
  );
}

.composer__input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.composer__icon,
.composer__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
}

.composer__icon {
  color: var(--color-text-secondary);
}

.composer__icon:hover:not(:disabled) {
  background-color: var(--color-surface);
}

.composer__send {
  color: #ffffff;
  background-color: var(--color-primary);
}

.composer__send:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.composer__count {
  align-self: flex-end;
  color: var(--color-text-secondary);
}

.composer__icon,
.composer__send {
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.15s ease;
}

.composer__send:active:not(:disabled),
.composer__icon:active:not(:disabled) {
  transform: scale(0.88);
}

.composer__send:not(:disabled) {
  transform: scale(1);
}

.composer__send:disabled {
  transform: scale(0.92);
}

.composer__input {
  transition:
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

@media (prefers-reduced-motion: no-preference) {
  .context-enter-active,
  .context-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .context-enter-from,
  .context-leave-to {
    opacity: 0;
    transform: translateY(0.375rem);
  }
}
</style>
