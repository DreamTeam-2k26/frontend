<script setup>
import { ref, useId } from 'vue'
import { useModalDialog } from '@/composables/useModalDialog'
const props = defineProps({ title: { type: String, required: true }, busy: Boolean })
const emit = defineEmits(['close'])
const dialog = ref(null)
const titleId = useId()
useModalDialog(dialog, {
  fallbackFocus: () => document.getElementById('new-folder')?.focus(),
})
</script>

<template>
  <dialog
    ref="dialog"
    class="folder-dialog dialog-motion"
    :aria-labelledby="titleId"
    :aria-busy="busy"
    @cancel.prevent="!props.busy && emit('close')"
  >
    <h2 :id="titleId">{{ title }}</h2>
    <slot />
  </dialog>
</template>

<style scoped>
.folder-dialog {
  margin: auto;
  width: min(34rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-bg-card);
}
.folder-dialog::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}
h2 {
  margin-bottom: var(--space-5);
  font-size: var(--font-size-lg);
  overflow-wrap: anywhere;
}
.folder-dialog :deep(.dialog-actions) {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}
.folder-dialog :deep(.operation-error) {
  margin-block: var(--space-3);
  color: var(--color-danger);
  overflow-wrap: anywhere;
}
.folder-dialog :deep(p) {
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
</style>
