<script setup>
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'

const {
  title,
  message = '',
  confirmLabel = 'Excluir',
  busy = false,
} = defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Excluir' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <BaseModal :title="title" size="sm" @close="!busy && emit('cancel')">
    <p class="confirm__message">{{ message }}</p>
    <template #footer>
      <BaseButton variant="ghost" :disabled="busy" @click="emit('cancel')">Cancelar</BaseButton>
      <BaseButton class="confirm__danger" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm__message {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

/* Ação destrutiva com a cor de erro; o rótulo já diz o que acontece. */
.confirm__danger.button--primary {
  color: var(--color-bg-card);
  background-color: var(--color-danger);
}

.confirm__danger.button--primary:hover:not(.button--disabled) {
  color: var(--color-bg-card);
  background-color: color-mix(in srgb, var(--color-danger) 85%, var(--color-text));
}
</style>
