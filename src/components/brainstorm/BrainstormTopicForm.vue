<script setup>
import { nextTick, useId, useTemplateRef } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useForm } from '@/composables/useForm'
import { CATEGORY_OPTIONS, TITLE_MAX } from '@/utils/brainstorm'
import { required } from '@/utils/validators'

// Criar ou editar discussão. O projeto vem da rota (quem chama); aqui só os campos do tópico.
const {
  topic = null,
  saving = false,
  fieldErrors = {},
} = defineProps({
  topic: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  fieldErrors: { type: Object, default: () => ({}) },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.title && payload?.context && payload?.category),
  close: null,
})

const form = useTemplateRef('form')
const formId = useId()

const { values, errors, validateField, handleSubmit } = useForm(
  {
    title: topic?.title ?? '',
    category: topic?.category ?? 'ideas',
    context: topic?.context ?? '',
    initialSuggestion: topic?.initial_suggestion ?? '',
  },
  {
    title: [
      required('Dê um título para a discussão.'),
      (value) => (value.trim().length > TITLE_MAX ? `Use no máximo ${TITLE_MAX} caracteres.` : ''),
    ],
    category: [required('Escolha a categoria.')],
    context: [required('Explique o contexto ou objetivo.')],
  },
)

const submit = handleSubmit((data) => {
  if (saving) return
  emit('submit', {
    title: data.title.trim(),
    category: data.category,
    context: data.context.trim(),
    initialSuggestion: data.initialSuggestion.trim(),
  })
})

function save() {
  submit()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}

const fieldError = (name) => errors[name] || fieldErrors[name] || ''
</script>

<template>
  <BaseModal
    :title="topic ? 'Editar discussão' : 'Nova discussão'"
    size="md"
    @close="!saving && emit('close')"
  >
    <form
      :id="formId"
      ref="form"
      class="topic-form"
      novalidate
      :aria-busy="saving"
      @submit.prevent="save"
    >
      <p v-if="fieldErrors.detail" class="topic-form__alert" role="alert">
        {{ fieldErrors.detail }}
      </p>
      <BaseInput
        v-model="values.title"
        label="Título"
        name="title"
        placeholder="Ex.: Qual será o tema da feira?"
        required
        autofocus
        :maxlength="TITLE_MAX"
        :disabled="saving"
        :error="fieldError('title')"
        @blur="values.title && validateField('title')"
      />
      <BaseSelect
        v-model="values.category"
        label="Categoria"
        :options="CATEGORY_OPTIONS"
        :disabled="saving"
        :invalid="Boolean(fieldError('category'))"
      />
      <div class="topic-form__field">
        <label :for="`${formId}-context`" class="topic-form__label">Contexto ou objetivo</label>
        <textarea
          :id="`${formId}-context`"
          v-model="values.context"
          class="topic-form__textarea"
          rows="4"
          required
          placeholder="O que precisa ser discutido e o que a equipe quer decidir?"
          :disabled="saving"
          :aria-invalid="Boolean(fieldError('context'))"
          :aria-describedby="fieldError('context') ? `${formId}-context-error` : undefined"
          @blur="values.context && validateField('context')"
        />
        <small
          v-if="fieldError('context')"
          :id="`${formId}-context-error`"
          class="topic-form__error"
        >
          {{ fieldError('context') }}
        </small>
      </div>
      <div class="topic-form__field">
        <label :for="`${formId}-suggestion`" class="topic-form__label"
          >Sugestão inicial (opcional)</label
        >
        <textarea
          :id="`${formId}-suggestion`"
          v-model="values.initialSuggestion"
          class="topic-form__textarea"
          rows="2"
          placeholder="Sua primeira ideia para começar a conversa."
          :disabled="saving"
        />
        <small v-if="fieldErrors.initial_suggestion" class="topic-form__error">
          {{ fieldErrors.initial_suggestion }}
        </small>
      </div>
    </form>
    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">
        {{ topic ? 'Salvar alterações' : 'Criar discussão' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.topic-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.topic-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.topic-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.topic-form__textarea {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  resize: vertical;
}
.topic-form__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.topic-form__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.topic-form__alert {
  padding: var(--space-2) var(--space-3);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
}
</style>
