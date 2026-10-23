<script setup>
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })

const { label, error = '', id } = defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  id: { type: String, default: undefined },
})

const generatedId = useId()
const inputId = computed(() => id ?? generatedId)
const errorId = computed(() => `${inputId.value}-error`)
</script>

<template>
  <div class="field">
    <label class="field__label" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      v-model="model"
      class="field__input"
      :class="{ 'field__input--invalid': error }"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? errorId : undefined"
      v-bind="$attrs"
    />
    <small v-if="error" :id="errorId" class="field__error">{{ error }}</small>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.field__input {
  padding: 0.625rem 0.75rem;
  background-color: var(--color-background);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field__input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.field__input--invalid {
  border-color: var(--color-danger);
}

.field__input--invalid:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 20%, transparent);
}

.field__error {
  color: var(--color-danger);
  font-size: 0.8125rem;
}
</style>
