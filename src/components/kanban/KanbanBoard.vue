<script setup>
import { useTemplateRef } from 'vue'
import { Plus } from 'lucide-vue-next'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'
import { useBoardDrag } from '@/composables/useBoardDrag'

defineProps({
  columns: { type: Array, required: true },
  // Map columnId -> tarefas visíveis.
  visibleByColumn: { type: Map, required: true },
  // Map columnId -> todas as tarefas (para contagem real).
  tasksByColumn: { type: Map, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
})

const emit = defineEmits({
  'open-task': (id) => id != null,
  'add-task': (columnId) => columnId != null,
  'manage-column': (payload) => payload?.column != null && Boolean(payload.action),
  'add-column': null,
  // index: posição entre os cards visíveis sem a tarefa; null = fim da coluna.
  'move-task': (payload) => payload?.taskId != null && payload?.columnId != null,
})

const board = useTemplateRef('board')
const { drag, onPointerDown } = useBoardDrag(board, {
  onDrop: (taskId, columnId, index) => emit('move-task', { taskId, columnId, index }),
})
</script>

<template>
  <div
    ref="board"
    class="kanban-board"
    role="region"
    aria-label="Colunas do quadro"
    tabindex="0"
    @pointerdown="onPointerDown"
  >
    <KanbanColumn
      v-for="(column, index) in columns"
      :key="column.id"
      :column="column"
      :tasks="visibleByColumn.get(column.id) ?? []"
      :total="tasksByColumn.get(column.id)?.length ?? 0"
      :today="today"
      :filtered="filtered"
      :can-manage="canManage"
      :first="index === 0"
      :last="index === columns.length - 1"
      :columns="columns"
      :drag-task-id="drag.taskId"
      :drop-index="drag.columnId === column.id ? drag.index : null"
      @open-task="emit('open-task', $event)"
      @add-task="emit('add-task', column.id)"
      @move-task="emit('move-task', $event)"
      @manage="emit('manage-column', { column, action: $event })"
    />
    <button v-if="canManage" type="button" class="kanban-board__add" @click="emit('add-column')">
      <Plus :size="18" aria-hidden="true" /> Nova coluna
    </button>
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
.kanban-board__add {
  display: inline-flex;
  flex: 0 0 14rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 3.5rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.kanban-board__add:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-hover);
}
.kanban-board:focus-visible {
  outline-offset: 2px;
}
</style>
