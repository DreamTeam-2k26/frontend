<script setup>
import ChatAvatar from './ChatAvatar.vue'

// Conteúdo da notificação de mensagem nova (renderizado dentro do vue3-toastify).
defineProps({
  room: { type: String, required: true },
  author: { type: String, required: true },
  avatar: { type: String, default: null },
  preview: { type: String, default: '' },
})
</script>

<template>
  <div class="chat-toast">
    <ChatAvatar :name="author" :src="avatar" :size="40" />
    <div class="chat-toast__text">
      <strong>{{ room }}</strong>
      <span>{{ author }}: {{ preview }}</span>
    </div>
    <button type="button" class="chat-toast__open">Abrir</button>
  </div>
</template>

<style>
/* Global de propósito: o vue3-toastify renderiza o cartão fora deste componente. */
.Toastify__toast.chat-toast-card {
  min-height: 0;
  padding: 0.75rem 0.875rem;
  overflow: hidden;
  color: var(--color-text);
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 1rem);
  background: var(--color-background);
  box-shadow: var(--shadow-md);
  cursor: pointer;
}

.chat-toast-card .Toastify__toast-body {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0;
}

.chat-toast-card .Toastify__toast-body > div {
  width: 100%;
  min-width: 0;
}

/* Um pouco mais larga que o padrão (320px) para caber nome da sala e prévia. */
.Toastify__toast-container--top-center:has(.chat-toast-card) {
  width: min(26rem, calc(100vw - 2rem));
}

.chat-toast-card .Toastify__progress-bar {
  height: 3px;
  background: var(--color-primary);
  opacity: 0.85;
}

.chat-toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.chat-toast__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.chat-toast__text strong {
  overflow: hidden;
  font-size: 0.9375rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-toast__text span {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-toast__open {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  color: var(--color-bg-page, #ffffff);
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 999px;
  background-color: var(--color-primary);
  transition: background-color 0.15s ease;
}

.chat-toast__open:hover {
  background-color: var(--color-primary-hover);
}
</style>
