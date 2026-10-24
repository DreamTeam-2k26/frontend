<script setup>
import { computed, shallowRef, useAttrs, useId } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })

const {
  label,
  error = '',
  id,
  icon,
} = defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  id: { type: String, default: undefined },
  // Ícone Lucide decorativo à esquerda do campo (opcional).
  icon: { type: [Object, Function], default: undefined },
})

const generatedId = useId()
const attrs = useAttrs()
const inputId = computed(() => id ?? generatedId)
const errorId = computed(() => `${inputId.value}-error`)

// Campos de senha ganham o botão de mostrar/ocultar.
const isPassword = computed(() => attrs.type === 'password')
const revealed = shallowRef(false)
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : attrs.type))
</script>

<template>
  <div class="field">
    <label class="field__label" :for="inputId">{{ label }}</label>
    <div class="field__control">
      <component :is="icon" v-if="icon" class="field__icon" :size="18" aria-hidden="true" />
      <input
        v-bind="$attrs"
        :id="inputId"
        v-model="model"
        :type="inputType"
        class="field__input"
        :class="{
          'field__input--filled': model !== '',
          'field__input--invalid': error,
          'field__input--with-icon': icon,
          'field__input--with-action': isPassword,
        }"
        :aria-invalid="error ? true : (attrs['aria-invalid'] ?? false)"
        :aria-describedby="
          [attrs['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') ||
          undefined
        "
      />
      <button
        v-if="isPassword"
        type="button"
        class="field__action"
        :aria-label="revealed ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="revealed"
        :aria-controls="inputId"
        :disabled="attrs.disabled === '' || attrs.disabled === true"
        @click="revealed = !revealed"
      >
        <component :is="revealed ? EyeOff : Eye" :size="18" aria-hidden="true" />
      </button>
    </div>
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

.field__control {
  position: relative;
  display: flex;
  align-items: center;
}

.field__icon {
  position: absolute;
  left: var(--space-3);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.field__input--with-icon {
  padding-left: calc(var(--space-3) + 18px + var(--space-2));
}

.field__input--with-action {
  padding-right: calc(var(--space-10) + var(--space-1));
}

/* Ocupa a altura do campo para manter o alvo de toque de 44px. */
.field__action {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-10) + var(--space-1));
  height: 100%;
  color: var(--color-text-secondary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  transition: color 0.15s ease;
}

.field__action:hover:not(:disabled) {
  color: var(--color-text);
}

.field__action:focus-visible {
  outline-offset: -2px;
}

.field__action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.field__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}
</style>
