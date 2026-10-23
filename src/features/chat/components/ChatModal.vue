<script setup>
import { onMounted, useTemplateRef } from 'vue'
import { X } from 'lucide-vue-next'

const { title } = defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])

const dialog = useTemplateRef('dialog')

// <dialog> nativo: foco preso, Esc fecha e leitores de tela entendem como modal.
onMounted(() => dialog.value?.showModal())

function onBackdropClick(event) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog ref="dialog" class="modal" @cancel.prevent="emit('close')" @click="onBackdropClick">
    <div class="modal__box">
      <header class="modal__header">
        <h2 class="modal__title">{{ title }}</h2>
        <button type="button" class="modal__close" aria-label="Fechar" @click="emit('close')">
          <X :size="20" aria-hidden="true" />
        </button>
      </header>
      <div class="modal__body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="modal__footer">
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  width: min(32rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  margin: auto;
  padding: 0;
  border: none;
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background-color: var(--color-background);
  box-shadow: var(--shadow-md);
}

.modal::backdrop {
  background-color: rgb(17 24 39 / 45%);
}

.modal__box {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 2rem);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.modal__title {
  font-size: 1.125rem;
}

.modal__close {
  display: inline-flex;
  padding: 0.375rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.modal__close:hover {
  background-color: var(--color-surface);
}

.modal__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: no-preference) {
  .modal[open] {
    animation: modal-in 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .modal[open]::backdrop {
    animation: backdrop-in 0.24s ease-out;
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.97);
  }
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}
</style>
