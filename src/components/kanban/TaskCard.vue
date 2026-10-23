<script setup>
import { computed } from 'vue'
import { CalendarDays, CircleCheck, ListChecks } from 'lucide-vue-next'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { PRIORITIES, dueInfo } from '@/utils/kanban'

const {
  task,
  today,
  done = false,
} = defineProps({
  task: { type: Object, required: true },
  // Data de hoje (YYYY-MM-DD) calculada uma vez pela página.
  today: { type: String, required: true },
  // Coluna de categoria "done": tarefa concluída.
  done: { type: Boolean, default: false },
})

const emit = defineEmits({ open: (id) => id != null })

const priorityLabel = computed(
  () => PRIORITIES.find((item) => item.value === task.priority)?.label ?? '',
)
const due = computed(() => dueInfo(task.due_date, today, done))
const late = computed(() => !done && task.is_overdue)
const hasChecklist = computed(() => task.checklist_total > 0)
</script>

<template>
  <article class="task-card" :class="{ 'task-card--done': done, 'task-card--late': late }">
    <div class="task-card__top">
      <span class="task-card__id">#{{ task.id }}</span>
      <span
        v-if="priorityLabel"
        class="task-card__priority"
        :class="`task-card__priority--${task.priority}`"
      >
        {{ priorityLabel }}
      </span>
    </div>

    <h3 class="task-card__title">
      <button type="button" class="task-card__open" @click="emit('open', task.id)">
        {{ task.title }}
      </button>
    </h3>

    <div class="task-card__meta">
      <span v-if="done" class="task-card__chip task-card__chip--done">
        <CircleCheck :size="14" aria-hidden="true" /> Concluída
      </span>
      <span
        v-if="due.label"
        class="task-card__chip"
        :class="{ 'task-card__chip--late': late, 'task-card__chip--soon': due.tone === 'soon' }"
        :title="due.relative ? `Prazo: ${due.label} (${due.relative})` : `Prazo: ${due.label}`"
      >
        <CalendarDays :size="14" aria-hidden="true" />
        <span class="visually-hidden">Prazo:</span> {{ due.label }}
        <strong v-if="late">· Atrasada</strong>
      </span>
      <span
        v-if="hasChecklist"
        class="task-card__chip"
        :title="`Checklist: ${task.checklist_done} de ${task.checklist_total} itens`"
      >
        <ListChecks :size="14" aria-hidden="true" />
        <span class="visually-hidden">Checklist:</span>
        {{ task.checklist_done }}/{{ task.checklist_total }}
      </span>
      <span class="task-card__assignee">
        <template v-if="task.assignee">
          <UserAvatar :name="task.assignee_name || ''" size="sm" />
          <span class="visually-hidden">Responsável: {{ task.assignee_name }}</span>
        </template>
        <span v-else class="task-card__unassigned">Sem responsável</span>
      </span>
    </div>
  </article>
</template>

<style scoped>
.task-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.task-card:hover {
  border-color: var(--color-secondary);
  box-shadow: var(--shadow-md);
}
.task-card:focus-within {
  border-color: var(--color-primary);
}
.task-card--late {
  border-left: 3px solid var(--color-status-late);
}
.task-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 1.5rem;
}
.task-card__id {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.task-card__priority {
  padding: 0.125rem var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.task-card__priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.task-card__priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}
.task-card__priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.task-card__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}
.task-card__open {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
/* O card inteiro abre a tarefa; menus futuros ficam acima desta camada. */
.task-card__open::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.task-card__open:focus-visible {
  outline: none;
}
.task-card__open:focus-visible::after {
  outline: var(--focus-ring);
  outline-offset: 2px;
}
.task-card--done .task-card__open {
  color: var(--color-text-secondary);
}
.task-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.task-card__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.task-card__chip--soon {
  color: var(--color-warning);
}
.task-card__chip--late {
  color: var(--color-status-late);
  font-weight: var(--font-weight-semibold);
}
.task-card__chip--done {
  color: var(--color-status-done);
  font-weight: var(--font-weight-semibold);
}
.task-card__assignee {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
}
.task-card__unassigned {
  font-style: italic;
}
</style>
