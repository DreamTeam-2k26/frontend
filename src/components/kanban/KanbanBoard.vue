<script setup>
import { useTemplateRef } from 'vue'
import ColumnComposer from '@/components/kanban/ColumnComposer.vue'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'
import { useBoardDrag } from '@/composables/useBoardDrag'

const composerOpen = defineModel('composerOpen', { type: Boolean, default: false })

defineProps({
  // Faixas de buildLanes (tarefas visíveis, já filtradas e ordenadas).
  lanes: { type: Array, required: true },
  // Map laneId -> total de tarefas da faixa sem filtro.
  totals: { type: Map, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
  // Gestão de colunas (dono/administrador, agrupamento por status).
  canManage: { type: Boolean, default: false },
  columns: { type: Array, required: true },
  columnsById: { type: Map, required: true },
  composerSaving: { type: Boolean, default: false },
  composerError: { type: String, default: '' },
  // Soltar escolhe a posição só em ordem manual, agrupado por status.
  reorderable: { type: Boolean, default: true },
})

const emit = defineEmits({
  'open-task': (id) => id != null,
  'add-task': (lane) => lane?.id != null,
  'task-action': (payload) => payload?.taskId != null,
  'manage-column': (payload) => payload?.column != null && Boolean(payload.action),
  // index: posição entre os cards visíveis sem a tarefa movida
  'move-task': (payload) => payload?.taskId != null && payload?.laneId != null,
  'create-column': (payload) => Boolean(payload?.name),
})

const board = useTemplateRef('board')
const { drag, onPointerDown } = useBoardDrag(board, {
  onDrop: (taskId, laneId, index) => emit('move-task', { taskId, laneId, index }),
})
</script>

<template>
  <div
    ref="board"
    class="kanban-board"
    role="region"
    aria-label="Quadro de tarefas"
    tabindex="0"
    @pointerdown="onPointerDown"
  >
    <TransitionGroup name="lane">
      <KanbanColumn
        v-for="(lane, index) in lanes"
        :key="lane.id"
        :lane="lane"
        :total="totals.get(lane.id) ?? 0"
        :today="today"
        :filtered="filtered"
        :can-manage="canManage && lane.kind === 'column'"
        :reorderable="reorderable && lane.kind === 'column'"
        :first="index === 0"
        :last="index === lanes.length - 1"
        :columns="columns"
        :columns-by-id="columnsById"
        :drag-task-id="drag.taskId"
        :drop-index="drag.laneId === lane.id ? drag.index : null"
        @open-task="emit('open-task', $event)"
        @add-task="emit('add-task', lane)"
        @task-action="emit('task-action', $event)"
        @manage="emit('manage-column', { column: lane.column, ...$event })"
      />
    </TransitionGroup>
    <ColumnComposer
      v-if="canManage"
      v-model:open="composerOpen"
      :saving="composerSaving"
      :error="composerError"
      @create="emit('create-column', $event)"
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
  padding-bottom: var(--space-4);
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

/* Colunas novas crescem no lugar; reordenar desliza. */
.lane-move {
  transition: transform var(--motion-slow) var(--ease-flow);
}
.lane-enter-active {
  animation: lane-in var(--motion-slow) var(--ease-flow);
}
.lane-leave-active {
  transition:
    opacity var(--motion-quick) var(--ease-flow-exit),
    transform var(--motion-quick) var(--ease-flow-exit);
}
.lane-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
@keyframes lane-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}
</style>
