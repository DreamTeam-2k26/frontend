<script setup>
import { computed, useId } from 'vue'
import { Link2, ListPlus, TriangleAlert } from 'lucide-vue-next'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { PRIORITY_OPTIONS, TASK_TITLE_MAX } from '@/utils/brainstorm'

// Uma proposta de tarefa da decisão: marcar/desmarcar, editar campos ou vincular a uma tarefa existente.
const {
  card,
  tasks,
  members,
  disabled = false,
  error = '',
} = defineProps({
  // Ver cardsFromAnalysis (utils/brainstorm.js).
  card: { type: Object, required: true },
  tasks: { type: Array, required: true },
  members: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits({ update: (patch) => patch && typeof patch === 'object' })

const ids = { check: useId(), description: useId(), due: useId() }
const taskOptions = computed(() => tasks.map((task) => ({ value: task.id, label: task.title })))
const memberOptions = computed(() => [
  { value: null, label: 'Sem responsável' },
  ...members.map((member) => ({
    value: member.user,
    label: member.user_name || member.user_email,
  })),
])
const suggested = computed(() => tasks.find((task) => task.id === card.existingTaskId))
const missingTitle = computed(() => card.selected && card.mode === 'new' && !card.title.trim())
const missingTask = computed(
  () => card.selected && card.mode === 'existing' && !card.existingTaskId,
)
</script>

<template>
  <li
    class="task-card"
    :class="{ 'task-card--selected': card.selected, 'task-card--error': error }"
  >
    <div class="task-card__head">
      <input
        :id="ids.check"
        type="checkbox"
        class="task-card__check"
        :checked="card.selected"
        :disabled="disabled"
        @change="emit('update', { selected: $event.target.checked })"
      />
      <label :for="ids.check" class="task-card__label">
        {{ card.title || 'Nova tarefa' }}
        <span class="task-card__state">{{
          card.selected ? 'Selecionada' : 'Não será criada'
        }}</span>
      </label>
    </div>

    <p v-if="card.existingTaskId && card.mode === 'new'" class="task-card__warning">
      <TriangleAlert :size="14" aria-hidden="true" />
      A IA viu uma tarefa parecida no Kanban{{ suggested ? `: “${suggested.title}”` : '' }}.
      Considere vincular.
    </p>

    <fieldset v-if="card.selected" class="task-card__fields" :disabled="disabled">
      <legend class="visually-hidden">Como aplicar “{{ card.title }}”</legend>
      <div class="task-card__modes" role="radiogroup" aria-label="Criar ou vincular">
        <button
          type="button"
          role="radio"
          class="task-card__mode"
          :class="{ 'task-card__mode--active': card.mode === 'new' }"
          :aria-checked="card.mode === 'new'"
          @click="emit('update', { mode: 'new' })"
        >
          <ListPlus :size="15" aria-hidden="true" /> Criar tarefa nova
        </button>
        <button
          type="button"
          role="radio"
          class="task-card__mode"
          :class="{ 'task-card__mode--active': card.mode === 'existing' }"
          :aria-checked="card.mode === 'existing'"
          :disabled="!tasks.length"
          @click="emit('update', { mode: 'existing' })"
        >
          <Link2 :size="15" aria-hidden="true" /> Vincular existente
        </button>
      </div>

      <template v-if="card.mode === 'new'">
        <BaseInput
          :model-value="card.title"
          label="Título"
          :maxlength="TASK_TITLE_MAX"
          :error="missingTitle ? 'Informe o título.' : ''"
          @update:model-value="emit('update', { title: $event })"
        />
        <div class="task-card__field">
          <label :for="ids.description" class="task-card__field-label">Descrição</label>
          <textarea
            :id="ids.description"
            class="task-card__textarea"
            rows="2"
            :value="card.description"
            @input="emit('update', { description: $event.target.value })"
          />
        </div>
        <div class="task-card__grid">
          <BaseSelect
            :model-value="card.priority"
            label="Prioridade"
            :options="PRIORITY_OPTIONS"
            @change="emit('update', { priority: $event })"
          />
          <BaseSelect
            :model-value="card.assignee"
            label="Responsável"
            :options="memberOptions"
            @change="emit('update', { assignee: $event })"
          />
          <div class="task-card__field">
            <label :for="ids.due" class="task-card__field-label">Prazo</label>
            <input
              :id="ids.due"
              type="date"
              class="task-card__date"
              :value="card.dueDate"
              @input="emit('update', { dueDate: $event.target.value })"
            />
          </div>
        </div>
      </template>
      <BaseSelect
        v-else
        :model-value="card.existingTaskId"
        label="Tarefa do Kanban"
        placeholder="Escolha a tarefa"
        :options="taskOptions"
        :invalid="missingTask"
        @change="emit('update', { existingTaskId: $event })"
      />
    </fieldset>
    <p v-if="error" class="task-card__error" role="alert">{{ error }}</p>
  </li>
</template>

<style scoped>
.task-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.task-card--selected {
  border-color: var(--color-primary);
}
.task-card--error {
  border-color: var(--color-danger);
}
.task-card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.task-card__check {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.125rem;
  accent-color: var(--color-primary);
}
.task-card__label {
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
  cursor: pointer;
}
.task-card__state {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
}
.task-card__warning {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-warning);
  font-size: var(--font-size-xs);
}
.task-card__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.task-card__modes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.task-card__mode {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.25rem;
  padding: 0 var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.task-card__mode:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.task-card__mode--active {
  color: var(--color-text);
  border-color: var(--color-primary);
  background: var(--color-bg-subtle);
}
.task-card__mode:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.task-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.task-card__field-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.task-card__textarea,
.task-card__date {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}
.task-card__date {
  min-height: 2.75rem;
}
.task-card__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}
.task-card__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
@media (max-width: 700px) {
  .task-card__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
