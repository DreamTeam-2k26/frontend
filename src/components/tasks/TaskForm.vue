<script setup>
import { nextTick, useId, useTemplateRef } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useForm } from '@/composables/useForm'
import { PRIORITIES, todayISO } from '@/utils/kanban'
import { required } from '@/utils/validators'

const TITLE_MAX = 200

const {
  columns,
  members,
  columnId = null,
  saving = false,
  fieldErrors = {},
} = defineProps({
  columns: { type: Array, required: true },
  // Participantes do projeto (únicos responsáveis possíveis).
  members: { type: Array, required: true },
  // Coluna inicial (botão da coluna); sem ela, a primeira do quadro.
  columnId: { type: Number, default: null },
  saving: { type: Boolean, default: false },
  fieldErrors: { type: Object, default: () => ({}) },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.title && payload?.column),
  close: null,
})

const form = useTemplateRef('form')
const formId = useId()
const today = todayISO()
const { values, errors, validateField, handleSubmit } = useForm(
  {
    title: '',
    description: '',
    column: String(columnId ?? columns[0]?.id ?? ''),
    priority: 'medium',
    assignee: '',
    due_date: '',
  },
  {
    title: [
      required('Informe o título da tarefa.'),
      (value) => (value.trim().length > TITLE_MAX ? `Use no máximo ${TITLE_MAX} caracteres.` : ''),
    ],
    column: [required('Escolha a coluna.')],
    due_date: [(value) => (value && value < today ? 'O prazo não pode ser anterior a hoje.' : '')],
  },
)

const submit = handleSubmit((data) => {
  if (saving) return
  emit('submit', {
    title: data.title.trim(),
    description: data.description.trim(),
    column: Number(data.column),
    priority: data.priority,
    assignee: data.assignee ? Number(data.assignee) : null,
    due_date: data.due_date || null,
  })
})

function save() {
  submit()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}

const fieldError = (name) => errors[name] || fieldErrors[name] || ''
</script>

<template>
  <BaseModal title="Nova tarefa" size="md" @close="!saving && emit('close')">
    <form
      :id="formId"
      ref="form"
      class="task-form"
      novalidate
      :aria-busy="saving"
      @submit.prevent="save"
    >
      <BaseInput
        v-model="values.title"
        label="Título"
        name="title"
        required
        :maxlength="TITLE_MAX"
        autofocus
        :disabled="saving"
        :error="fieldError('title')"
        @blur="validateField('title')"
      />

      <div class="task-form__field">
        <label :for="`${formId}-description`" class="task-form__label">
          Descrição (opcional)
        </label>
        <textarea
          :id="`${formId}-description`"
          v-model="values.description"
          class="task-form__control"
          rows="3"
          :disabled="saving"
          :aria-invalid="Boolean(fieldErrors.description)"
        />
        <small v-if="fieldErrors.description" class="task-form__error">{{
          fieldErrors.description
        }}</small>
      </div>

      <div class="task-form__grid">
        <div class="task-form__field">
          <label :for="`${formId}-column`" class="task-form__label">Coluna</label>
          <select
            :id="`${formId}-column`"
            v-model="values.column"
            class="task-form__control"
            :disabled="saving"
            :aria-invalid="Boolean(fieldError('column'))"
          >
            <option v-for="column in columns" :key="column.id" :value="String(column.id)">
              {{ column.name }}
            </option>
          </select>
          <small v-if="fieldError('column')" class="task-form__error">{{
            fieldError('column')
          }}</small>
        </div>

        <div class="task-form__field">
          <label :for="`${formId}-priority`" class="task-form__label">Prioridade</label>
          <select
            :id="`${formId}-priority`"
            v-model="values.priority"
            class="task-form__control"
            :disabled="saving"
          >
            <option v-for="priority in PRIORITIES" :key="priority.value" :value="priority.value">
              {{ priority.label }}
            </option>
          </select>
        </div>

        <div class="task-form__field">
          <label :for="`${formId}-assignee`" class="task-form__label">Responsável</label>
          <select
            :id="`${formId}-assignee`"
            v-model="values.assignee"
            class="task-form__control"
            :disabled="saving"
            :aria-invalid="Boolean(fieldErrors.assignee)"
          >
            <option value="">Sem responsável</option>
            <option v-for="member in members" :key="member.id" :value="String(member.user)">
              {{ member.user_name || member.user_email }}
            </option>
          </select>
          <small v-if="fieldErrors.assignee" class="task-form__error">{{
            fieldErrors.assignee
          }}</small>
        </div>

        <BaseInput
          v-model="values.due_date"
          label="Prazo (opcional)"
          name="due_date"
          type="date"
          :min="today"
          :disabled="saving"
          :error="fieldError('due_date')"
          @blur="validateField('due_date')"
        />
      </div>
    </form>
    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">Criar tarefa</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.task-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
.task-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.task-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.task-form__control {
  min-height: calc(var(--space-10) + var(--space-1));
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
}
.task-form__control[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.task-form__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
@media (max-width: 599px) {
  .task-form__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
