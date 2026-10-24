<script setup>
import { computed, nextTick, useId, useTemplateRef } from 'vue'
import { UserRound } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useForm } from '@/composables/useForm'
import { PRIORITIES, todayISO } from '@/utils/kanban'
import { required } from '@/utils/validators'

const TITLE_MAX = 200

const {
  columns,
  members,
  defaults = {},
  saving = false,
  fieldErrors = {},
} = defineProps({
  columns: { type: Array, required: true },
  // Participantes do projeto (únicos responsáveis possíveis).
  members: { type: Array, required: true },
  // Valores iniciais vindos da faixa clicada: { column?, priority?, assignee? }
  defaults: { type: Object, default: () => ({}) },
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
    column: defaults.column ?? columns[0]?.id ?? null,
    priority: defaults.priority ?? 'medium',
    assignee: defaults.assignee ?? null,
    due_date: '',
  },
  {
    title: [
      required('Dê um título para a tarefa.'),
      (value) => (value.trim().length > TITLE_MAX ? `Use no máximo ${TITLE_MAX} caracteres.` : ''),
    ],
    column: [required('Escolha a coluna.')],
    due_date: [(value) => (value && value < today ? 'O prazo não pode ser anterior a hoje.' : '')],
  },
)

const columnOptions = computed(() =>
  columns.map((column) => ({ value: column.id, label: column.name, dot: column.category })),
)
const priorityOptions = PRIORITIES.map((priority) => ({ ...priority, dot: priority.value }))
const assigneeOptions = computed(() => [
  { value: null, label: 'Sem responsável', icon: UserRound },
  ...members.map((member) => ({
    value: member.user,
    label: member.user_name || member.user_email,
    avatar: { name: member.user_name || member.user_email, src: member.user_profile_picture || '' },
  })),
])

const submit = handleSubmit((data) => {
  if (saving) return
  emit('submit', {
    title: data.title.trim(),
    description: data.description.trim(),
    column: data.column,
    priority: data.priority,
    assignee: data.assignee,
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
      @keydown.ctrl.enter.prevent="save"
      @keydown.meta.enter.prevent="save"
    >
      <BaseInput
        v-model="values.title"
        label="Título"
        name="title"
        placeholder="O que precisa ser feito?"
        required
        :maxlength="TITLE_MAX"
        autofocus
        :disabled="saving"
        :error="fieldError('title')"
        @blur="values.title && validateField('title')"
      />

      <div class="task-form__field">
        <label :for="`${formId}-description`" class="task-form__label">Descrição</label>
        <textarea
          :id="`${formId}-description`"
          v-model="values.description"
          class="task-form__textarea"
          rows="3"
          placeholder="Detalhes, contexto ou critérios de conclusão (opcional)"
          :disabled="saving"
          :aria-invalid="Boolean(fieldErrors.description)"
        />
        <small v-if="fieldErrors.description" class="task-form__error">
          {{ fieldErrors.description }}
        </small>
      </div>

      <div class="task-form__grid">
        <div>
          <BaseSelect
            v-model="values.column"
            label="Status"
            :options="columnOptions"
            :disabled="saving"
            :invalid="Boolean(fieldError('column'))"
          />
          <small v-if="fieldError('column')" class="task-form__error">{{
            fieldError('column')
          }}</small>
        </div>
        <BaseSelect
          v-model="values.priority"
          label="Prioridade"
          :options="priorityOptions"
          :disabled="saving"
        />
        <div>
          <BaseSelect
            v-model="values.assignee"
            label="Responsável"
            :options="assigneeOptions"
            :disabled="saving"
            :invalid="Boolean(fieldErrors.assignee)"
          />
          <small v-if="fieldErrors.assignee" class="task-form__error">{{
            fieldErrors.assignee
          }}</small>
        </div>
        <BaseDatePicker
          v-model="values.due_date"
          label="Prazo"
          name="due_date"
          :calendar-title="values.title || 'Prazo da tarefa'"
          :calendar-description="values.description"
          :min="today"
          :disabled="saving"
          :error="fieldError('due_date')"
          @blur="validateField('due_date')"
        />
      </div>
    </form>
    <template #footer>
      <span class="task-form__hint" aria-hidden="true">Ctrl + Enter para criar</span>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">Criar tarefa</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.task-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.task-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.task-form__textarea {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.task-form__textarea:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.task-form__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.task-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}
.task-form__error {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.task-form__hint {
  margin-right: auto;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  align-self: center;
}
@media (max-width: 599px) {
  .task-form__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .task-form__hint {
    display: none;
  }
}
</style>
