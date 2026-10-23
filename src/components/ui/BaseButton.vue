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

defineOptions({ inheritAttrs: false })

const unavailable = computed(() => disabled || loading)
const classes = computed(() => [
  'button',
  `button--${variant}`,
  { 'button--block': block, 'button--disabled': unavailable.value },
])

function guardInteraction(event) {
  if (unavailable.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}
</script>

<template>
  <RouterLink v-if="to" v-slot="{ href, navigate }" :to="to" custom>
    <a
      v-bind="$attrs"
      :href="unavailable ? undefined : href"
      :class="classes"
      :aria-disabled="unavailable || undefined"
      :aria-busy="loading"
      :tabindex="unavailable ? -1 : $attrs.tabindex"
      @click.capture="guardInteraction"
      @click="navigate"
    >
      <span v-if="loading" class="button__spinner" aria-hidden="true" />
      <span class="button__content"><slot /></span>
    </a>
  </RouterLink>
  <button
    v-else
    v-bind="$attrs"
    :type="type"
    :class="classes"
    :disabled="unavailable"
    :aria-busy="loading"
  >
    <span v-if="loading" class="button__spinner" aria-hidden="true" />
    <span class="button__content"><slot /></span>
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 2.75rem;
  min-width: 0;
  max-width: 100%;
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-base);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
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

.button--primary:hover:not(.button--disabled) {
  color: var(--color-on-primary);
  background-color: var(--color-button-primary-hover);
}

.button--secondary {
  color: var(--color-text);
  background-color: var(--color-background);
  border-color: var(--color-border);
}

.button--secondary:hover:not(.button--disabled) {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.button--ghost {
  color: var(--color-primary);
  background-color: transparent;
}

.button--ghost:hover:not(.button--disabled) {
  color: var(--color-primary-hover);
  background-color: var(--color-bg-hover);
}

.button--disabled,
.button--disabled:hover {
  cursor: not-allowed;
  opacity: 0.6;
}

.button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  overflow-wrap: anywhere;
}

.button__spinner {
  flex-shrink: 0;
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
