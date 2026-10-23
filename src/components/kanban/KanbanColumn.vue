<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import TaskCard from '@/components/kanban/TaskCard.vue'

const {
  column,
  tasks,
  total,
  today,
  filtered = false,
  canManage = false,
  first = false,
  last = false,
  columns = [],
  dragTaskId = null,
  dropIndex = null,
} = defineProps({
  column: { type: Object, required: true },
  // Tarefas visíveis (já filtradas e ordenadas).
  tasks: { type: Array, required: true },
  // Total de tarefas da coluna sem filtro.
  total: { type: Number, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
  // Dono/administrador: mostra o menu de gestão (o servidor valida de novo).
  canManage: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
  columns: { type: Array, default: () => [] },
  // Arrasto em andamento: card arrastado e posição de soltura nesta coluna (null = fora dela).
  dragTaskId: { type: Number, default: null },
  dropIndex: { type: Number, default: null },
})

const emit = defineEmits({
  'open-task': (id) => id != null,
  'add-task': null,
  // index: posição entre os cards visíveis sem a tarefa movida; null = fim da coluna de destino.
  'move-task': (payload) => payload?.taskId != null && payload?.columnId != null,
  // action: 'rename' | 'move-left' | 'move-right' | 'delete'
  manage: (action) => ['rename', 'move-left', 'move-right', 'delete'].includes(action),
})

const menuItems = computed(() => [
  { id: 'rename', label: 'Renomear', icon: Pencil },
  { id: 'move-left', label: 'Mover para a esquerda', icon: ArrowLeft, disabled: first },
  { id: 'move-right', label: 'Mover para a direita', icon: ArrowRight, disabled: last },
  { id: 'delete', label: 'Excluir coluna', icon: Trash2, danger: true },
])

// Índice de cada card visível sem contar o card arrastado (para o indicador de soltura).
const dropSlots = computed(() => {
  const slots = new Map()
  for (const task of tasks) if (task.id !== dragTaskId) slots.set(task.id, slots.size)
  return slots
})
const isTarget = computed(() => dropIndex !== null)

function moveFromMenu(task, target) {
  const index = tasks.findIndex((item) => item.id === task.id)
  if (target === 'up') emit('move-task', { taskId: task.id, columnId: column.id, index: index - 1 })
  else if (target === 'down')
    emit('move-task', { taskId: task.id, columnId: column.id, index: index + 1 })
  else emit('move-task', { taskId: task.id, columnId: target, index: null })
}

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
  <section
    class="kanban-column"
    :class="{ 'kanban-column--target': isTarget }"
    :aria-labelledby="headingId"
    :data-column-id="column.id"
  >
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
      <ActionMenu
        v-if="canManage"
        class="kanban-column__menu"
        :label="`Ações da coluna ${column.name}`"
        :items="menuItems"
        @select="emit('manage', $event)"
      />
    </header>

    <ul v-if="tasks.length || isTarget" class="kanban-column__list">
      <li v-for="(task, index) in tasks" :key="task.id">
        <div
          v-if="isTarget && dropSlots.get(task.id) === dropIndex"
          class="kanban-column__drop"
          aria-hidden="true"
        />
        <TaskCard
          :task="task"
          :today="today"
          :done="done"
          :columns="columns"
          :can-move-up="index > 0"
          :can-move-down="index < tasks.length - 1"
          @open="emit('open-task', $event)"
          @move="moveFromMenu(task, $event)"
        />
      </li>
      <li v-if="isTarget && dropIndex === dropSlots.size" aria-hidden="true">
        <div class="kanban-column__drop" />
      </li>
    </ul>
    <p v-else class="kanban-column__empty">{{ emptyText }}</p>
    <button type="button" class="kanban-column__add" @click="emit('add-task')">
      <Plus :size="16" aria-hidden="true" /> Adicionar tarefa
      <span class="visually-hidden">em {{ column.name }}</span>
    </button>
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
  /* Altura mínima: espaço para o menu da coluna e para soltar cards. */
  min-height: 16rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.kanban-column--target {
  border-color: var(--color-primary);
}
.kanban-column__drop {
  height: 0.25rem;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary);
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
.kanban-column__menu {
  margin-left: auto;
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
.kanban-column__add {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 2.75rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.kanban-column__add:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
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
