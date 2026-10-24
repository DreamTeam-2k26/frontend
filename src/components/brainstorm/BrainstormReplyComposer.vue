<script setup>
import { nextTick, onMounted, useId, useTemplateRef } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useForm } from '@/composables/useForm'
import { REPLY_MAX } from '@/utils/brainstorm'
import { required } from '@/utils/validators'

// Campo de resposta (nova, resposta a outra ou edição). Quem usa decide o que fazer com o texto.
const {
  initial = '',
  label = 'Sua resposta',
  submitLabel = 'Responder',
  busy = false,
  autofocus = false,
  cancelable = false,
} = defineProps({
  initial: { type: String, default: '' },
  label: { type: String, default: 'Sua resposta' },
  submitLabel: { type: String, default: 'Responder' },
  busy: { type: Boolean, default: false },
  autofocus: { type: Boolean, default: false },
  cancelable: { type: Boolean, default: false },
})

const emit = defineEmits({ submit: (content) => Boolean(content), cancel: null })

const id = useId()
const field = useTemplateRef('field')
const { values, errors, handleSubmit } = useForm(
  { content: initial },
  {
    content: [
      required('Escreva a resposta.'),
      (value) => (value.length > REPLY_MAX ? `Use no máximo ${REPLY_MAX} caracteres.` : ''),
    ],
  },
)

const submit = handleSubmit((data) => {
  if (!busy) emit('submit', data.content.trim())
})

// O pai limpa depois de publicar com sucesso.
function clear() {
  values.content = ''
  errors.content = ''
}
defineExpose({ clear })

onMounted(() => {
  if (autofocus) nextTick(() => field.value?.focus())
})
</script>

<template>
  <form class="composer" novalidate @submit.prevent="submit" @keydown.ctrl.enter.prevent="submit">
    <label :for="id" class="visually-hidden">{{ label }}</label>
    <textarea
      :id="id"
      ref="field"
      v-model="values.content"
      class="composer__field"
      rows="3"
      :placeholder="label"
      :maxlength="REPLY_MAX"
      :disabled="busy"
      :aria-invalid="Boolean(errors.content)"
      :aria-describedby="errors.content ? `${id}-error` : undefined"
      @keydown.esc="cancelable && emit('cancel')"
    />
    <small v-if="errors.content" :id="`${id}-error`" class="composer__error">{{
      errors.content
    }}</small>
    <div class="composer__actions">
      <BaseButton v-if="cancelable" variant="ghost" :disabled="busy" @click="emit('cancel')"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" :loading="busy">{{ submitLabel }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.composer__field {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  resize: vertical;
}
.composer__field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.composer__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.composer__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
