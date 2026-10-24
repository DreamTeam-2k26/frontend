<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useModalDialog } from '@/composables/useModalDialog'
defineProps({ title: { type: String, required: true }, busy: Boolean })
const emit = defineEmits(['close'])
const dialog = ref(null)
// Abre ao montar, sai animado e devolve o foco a quem abriu.
useModalDialog(dialog)
</script>
<template>
  <dialog
    ref="dialog"
    class="team-dialog dialog-motion"
    aria-labelledby="team-dialog-title"
    :aria-busy="busy"
    @cancel.prevent="!busy && emit('close')"
  >
    <header>
      <h2 id="team-dialog-title">{{ title }}</h2>
      <button type="button" aria-label="Fechar" :disabled="busy" @click="emit('close')">
        <X :size="20" aria-hidden="true" />
      </button>
    </header>
    <slot />
  </dialog>
</template>
<style scoped>
.team-dialog {
  margin: auto;
  width: min(32rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  color: var(--color-text);
}
.team-dialog::backdrop {
  background: color-mix(in srgb, var(--color-text) 55%, transparent);
}
header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
h2 {
  font-size: var(--font-size-lg);
}
button {
  min-width: 2rem;
  min-height: 2rem;
  display: grid;
  place-items: center;
}
</style>
