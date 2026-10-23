<script setup>
import { computed, useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })

const {
  label,
  error = '',
  id,
} = defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  id: { type: String, default: undefined },
})

const generatedId = useId()
const attrs = useAttrs()
const inputId = computed(() => id ?? generatedId)
const errorId = computed(() => `${inputId.value}-error`)
</script>

<template>
  <div class="field">
    <label class="field__label" :for="inputId">{{ label }}</label>
    <input
      v-bind="$attrs"
      :id="inputId"
      v-model="model"
      class="field__input"
      :class="{ 'field__input--filled': model !== '', 'field__input--invalid': error }"
      :aria-invalid="error ? true : (attrs['aria-invalid'] ?? false)"
      :aria-describedby="
        [attrs['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') ||
        undefined
      "
    />
    <small v-if="error" :id="errorId" class="field__error" aria-live="polite">{{ error }}</small>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.field__label {
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-base);
}

.field__input {
  width: 100%;
  min-width: 0;
  min-height: calc(var(--space-10) + var(--space-1));
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);
  color: var(--color-text);
  caret-color: var(--color-primary);
  background-color: var(--color-input-bg);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field__input::placeholder {
  color: var(--color-text-secondary);
  opacity: 1;
}

.field__input--filled {
  border-color: var(--color-secondary);
}

.field__input:hover:not(:disabled):not([readonly]) {
  border-color: var(--color-primary);
}

.field__input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.field__input[aria-invalid='true'],
.field__input[aria-invalid='true']:hover:not(:disabled):not([readonly]) {
  border-color: var(--color-danger);
}

.field__input[aria-invalid='true']:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 20%, transparent);
}

.field__input[readonly] {
  background-color: var(--color-bg-subtle);
}

.field__input:disabled {
  color: var(--color-text-secondary);
  -webkit-text-fill-color: var(--color-text-secondary);
  background-color: var(--color-bg-subtle);
  border-color: var(--color-disabled);
  cursor: not-allowed;
  opacity: 1;
}

.field__input:autofill {
  -webkit-text-fill-color: var(--color-text);
  box-shadow: 0 0 0 1000px var(--color-input-bg) inset;
}

.field__input:autofill:focus {
  outline: var(--focus-ring);
  outline-offset: 2px;
}

.field__input[aria-invalid='true']:autofill:focus {
  outline-color: var(--color-danger);
}

.field__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}
</style>
