<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PRIORITIES } from '@/utils/kanban'
import { calendarTaskRoute, isCalendarOverdue } from '@/utils/calendar'
const props = defineProps({
  task: { type: Object, required: true },
  projectId: { type: [String, Number], required: true },
  columns: { type: Map, required: true },
  today: { type: String, required: true },
})
const column = computed(() => props.columns.get(String(props.task.column)))
const priority = computed(
  () => PRIORITIES.find((item) => item.value === props.task.priority)?.label || 'Não informada',
)
const late = computed(() => isCalendarOverdue(props.task, props.columns, props.today))
</script>
<template>
  <RouterLink
    class="calendar-task"
    :class="`calendar-task--${column?.category || 'todo'}`"
    :to="calendarTaskRoute(projectId, task.id)"
  >
    <span class="calendar-task__title">{{ task.title }}</span>
    <span class="calendar-task__meta"
      >{{ column?.name || 'Status não disponível' }} · Prioridade {{ priority }}</span
    >
    <span v-if="late" class="calendar-task__late">Atrasada</span>
  </RouterLink>
</template>
<style scoped>
.calendar-task {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: var(--space-2);
  color: var(--color-text);
  text-decoration: none;
  background: var(--color-bg-subtle);
  border-left: 3px solid var(--color-text-secondary);
  border-radius: var(--radius-sm);
  min-width: 0;
}
.calendar-task--in_progress {
  border-left-color: var(--color-warning);
}
.calendar-task--done {
  border-left-color: var(--color-success);
}
.calendar-task:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-bg-card));
}
.calendar-task__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.calendar-task__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.calendar-task__late {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
</style>
