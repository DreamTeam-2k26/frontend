<script setup>
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'

defineProps({
  columns: { type: Array, required: true },
  // Map columnId -> tarefas visíveis.
  visibleByColumn: { type: Map, required: true },
  // Map columnId -> todas as tarefas (para contagem real).
  tasksByColumn: { type: Map, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
})

const emit = defineEmits({ 'open-task': (id) => id != null })
</script>

<template>
  <div class="kanban-board" role="region" aria-label="Colunas do quadro" tabindex="0">
    <KanbanColumn
      v-for="column in columns"
      :key="column.id"
      :column="column"
      :tasks="visibleByColumn.get(column.id) ?? []"
      :total="tasksByColumn.get(column.id)?.length ?? 0"
      :today="today"
      :filtered="filtered"
      @open-task="emit('open-task', $event)"
    />
  </div>
</template>

<style scoped>
/* Rolagem horizontal só no quadro; a página não rola para o lado. */
.kanban-board {
  /* Contém os textos .visually-hidden dentro da área com rolagem. */
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  min-width: 0;
  padding-bottom: var(--space-3);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
}
.kanban-board > * {
  scroll-snap-align: start;
}
.kanban-board:focus-visible {
  outline-offset: 2px;
}
</style>
