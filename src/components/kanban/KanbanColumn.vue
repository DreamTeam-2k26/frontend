<script setup>
import { computed } from 'vue'
import TaskCard from '@/components/kanban/TaskCard.vue'

const {
  column,
  tasks,
  total,
  today,
  filtered = false,
} = defineProps({
  column: { type: Object, required: true },
  // Tarefas visíveis (já filtradas e ordenadas).
  tasks: { type: Array, required: true },
  // Total de tarefas da coluna sem filtro.
  total: { type: Number, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
})

const emit = defineEmits({ 'open-task': (id) => id != null })

const done = computed(() => column.category === 'done')
const headingId = computed(() => `kanban-column-${column.id}`)
const countLabel = computed(() =>
  filtered
    ? `${tasks.length} de ${total} tarefas`
    : `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`,
)
const emptyText = computed(() =>
  filtered && total
    ? 'Nenhuma tarefa desta coluna corresponde aos filtros.'
    : 'Nenhuma tarefa aqui.',
)
</script>

<template>
  <section class="kanban-column" :aria-labelledby="headingId">
    <header class="kanban-column__header">
      <span
        class="kanban-column__dot"
        :class="`kanban-column__dot--${column.category}`"
        aria-hidden="true"
      />
      <h2 :id="headingId" class="kanban-column__title">{{ column.name }}</h2>
      <span class="kanban-column__count" :title="countLabel">
        <span aria-hidden="true">{{ filtered ? `${tasks.length}/${total}` : total }}</span>
        <span class="visually-hidden">{{ countLabel }}</span>
      </span>
    </header>

    <ul v-if="tasks.length" class="kanban-column__list">
      <li v-for="task in tasks" :key="task.id">
        <TaskCard :task="task" :today="today" :done="done" @open="emit('open-task', $event)" />
      </li>
    </ul>
    <p v-else class="kanban-column__empty">{{ emptyText }}</p>
  </section>
</template>

<style scoped>
.kanban-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 0 0 18.5rem;
  width: 18.5rem;
  max-width: calc(100vw - 3rem);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.kanban-column__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2rem;
  padding: 0 var(--space-1);
}
.kanban-column__dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.kanban-column__dot--in_progress {
  background: var(--color-status-doing);
}
.kanban-column__dot--done {
  background: var(--color-status-done);
}
.kanban-column__title {
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.kanban-column__count {
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.kanban-column__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.kanban-column__empty {
  padding: var(--space-6) var(--space-3);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
