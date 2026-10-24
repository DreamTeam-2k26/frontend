<script setup>
import { useId, useTemplateRef } from 'vue'
import { X } from 'lucide-vue-next'
import { useModalDialog } from '@/composables/useModalDialog'
import { useScrollLock } from '@/composables/useScrollLock'

// <dialog> nativo: foco preso, Esc fecha e leitores de tela entendem como modal.
const {
  title = '',
  size = 'md',
  hideHeader = false,
} = defineProps({
  // Título visível; com hideHeader, use o slot `header` e aponte aria-labelledby.
  title: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md', 'lg'].includes(value) },
  hideHeader: { type: Boolean, default: false },
  labelledby: { type: String, default: undefined },
})

const emit = defineEmits(['close'])
useScrollLock()

const dialog = useTemplateRef('dialog')
const titleId = useId()
// Devolve o foco para quem abriu o modal (ex.: o card) quando a saída termina.
useModalDialog(dialog)

function onBackdropClick(event) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal dialog-motion"
    :class="`modal--${size}`"
    :aria-labelledby="labelledby ?? (title ? titleId : undefined)"
    @cancel.prevent="emit('close')"
    @click="onBackdropClick"
  >
    <header v-if="!hideHeader" class="modal__header">
      <h2 :id="titleId" class="modal__title">{{ title }}</h2>
      <button type="button" class="modal__close" aria-label="Fechar" @click="emit('close')">
        <X :size="20" aria-hidden="true" />
      </button>
    </header>
    <slot name="header" />
    <div class="modal__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="modal__footer">
      <slot name="footer" />
    </footer>
  </dialog>
</template>

<style scoped>
.modal {
  display: flex;
  flex-direction: column;
  margin: auto;
  max-height: calc(100dvh - 2rem);
  padding: 0;
  color: var(--color-text);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.modal:not([open]) {
  display: none;
}

.modal::backdrop {
  background: var(--color-overlay);
}

.modal--sm {
  width: min(26rem, calc(100% - 2rem));
}

.modal--md {
  width: min(34rem, calc(100% - 2rem));
}

.modal--lg {
  width: min(40rem, calc(100% - 2rem));
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6) 0;
}

.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.modal__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-10) + var(--space-1));
  height: calc(var(--space-10) + var(--space-1));
  margin-right: calc(-1 * var(--space-2));
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.modal__close:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.modal__body {
  flex: 1;
  min-height: 0;
  padding: var(--space-5) var(--space-6);
  overflow-y: auto;
}

.modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}

/* Celular: ocupa a tela inteira. */
@media (max-width: 599px) {
  .modal {
    width: 100%;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  .modal__header,
  .modal__body,
  .modal__footer {
    padding-inline: var(--space-4);
  }
}
</style>
