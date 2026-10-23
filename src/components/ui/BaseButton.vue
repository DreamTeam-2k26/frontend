<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const {
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  block = false,
  to,
} = defineProps({
  type: { type: String, default: 'button' },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost'].includes(value),
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  // Se informado, vira link do router.
  to: { type: [String, Object], default: undefined },
})

const classes = computed(() => ['button', `button--${variant}`, { 'button--block': block }])
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading">
    <span v-if="loading" class="button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 500;
  line-height: 1.5;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.button--block {
  width: 100%;
}

.button--primary {
  color: var(--color-on-primary);
  background-color: var(--color-button-primary-bg);
}

.button--primary:hover:not(:disabled) {
  color: var(--color-on-primary);
  background-color: var(--color-button-primary-hover);
}

.button--secondary {
  color: var(--color-text);
  background-color: var(--color-background);
  border-color: var(--color-border);
}

.button--secondary:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.button--ghost {
  color: var(--color-primary);
}

.button--ghost:hover:not(:disabled) {
  color: var(--color-primary-hover);
  background-color: var(--color-bg-hover);
}

.button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
