<script setup>
import { reactive } from 'vue'
import { CalendarDays, CalendarX2, ChevronDown, ListChecks, MessageSquare } from 'lucide-vue-next'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { PRIORITIES, dueInfo } from '@/utils/kanban'

// Visão Lista: as mesmas faixas do quadro (agrupamento, filtros e ordem), em tabela.
const { lanes, columnsById, today } = defineProps({
  lanes: { type: Array, required: true },
  columnsById: { type: Map, required: true },
  today: { type: String, required: true },
})

const emit = defineEmits({ 'open-task': (id) => id != null })

// Grupos recolhidos (estado só desta visão).
const collapsed = reactive({})

const priorityLabel = (value) => PRIORITIES.find((item) => item.value === value)?.label ?? ''
const columnOf = (task) => columnsById.get(task.column)
const isDone = (task) => columnOf(task)?.category === 'done'
const dueOf = (task) => dueInfo(task.due_date, today, isDone(task))
</script>

<template>
  <div class="task-list">
    <section v-for="lane in lanes" :key="lane.id" class="task-list__group">
      <button
        type="button"
        class="task-list__group-header"
        :aria-expanded="!collapsed[lane.id]"
        :aria-controls="`list-${lane.id}`"
        @click="collapsed[lane.id] = !collapsed[lane.id]"
      >
        <ChevronDown class="task-list__chevron" :size="16" aria-hidden="true" />
        <span class="task-list__dot" :class="`task-list__dot--${lane.tone}`" aria-hidden="true" />
        <span class="task-list__group-title">{{ lane.title }}</span>
        <span class="task-list__count">{{ lane.tasks.length }}</span>
      </button>

      <div v-show="!collapsed[lane.id]" :id="`list-${lane.id}`" class="task-list__body">
        <p v-if="!lane.tasks.length" class="task-list__empty">Nenhuma tarefa neste grupo.</p>
        <table v-else class="task-list__table">
          <caption class="visually-hidden">
            Tarefas em
            {{
              lane.title
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Tarefa</th>
              <th scope="col">Status</th>
              <th scope="col">Responsável</th>
              <th scope="col">Prioridade</th>
              <th scope="col">Prazo</th>
              <th scope="col"><span class="visually-hidden">Checklist e comentários</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in lane.tasks"
              :key="task.id"
              class="task-list__row"
              :class="{ 'task-list__row--done': isDone(task) }"
            >
              <th scope="row" class="task-list__title-cell">
                <span class="task-list__title-wrap">
                  <span class="task-list__id">#{{ task.id }}</span>
                  <button type="button" class="task-list__open" @click="emit('open-task', task.id)">
                    {{ task.title }}
                  </button>
                </span>
              </th>
              <td>
                <span class="task-list__status">
                  <span
                    class="task-list__dot"
                    :class="`task-list__dot--${columnOf(task)?.category}`"
                    aria-hidden="true"
                  />
                  {{ columnOf(task)?.name }}
                </span>
              </td>
              <td>
                <span class="task-list__person">
                  <template v-if="task.assignee">
                    <UserAvatar
                      :name="task.assignee_name || ''"
                      size="sm"
                      class="task-list__avatar"
                    />
                    {{ task.assignee_name }}
                  </template>
                  <span v-else class="task-list__muted">Sem responsável</span>
                </span>
              </td>
              <td>
                <span class="task-list__priority" :class="`task-list__priority--${task.priority}`">
                  {{ priorityLabel(task.priority) }}
                </span>
              </td>
              <td>
                <span
                  v-if="task.due_date"
                  class="task-list__due"
                  :class="{ 'task-list__due--late': !isDone(task) && task.is_overdue }"
                >
                  <component
                    :is="!isDone(task) && task.is_overdue ? CalendarX2 : CalendarDays"
                    :size="14"
                    aria-hidden="true"
                  />
                  {{ dueOf(task).label }}
                  <span v-if="!isDone(task) && task.is_overdue" class="visually-hidden"
                    >(atrasada)</span
                  >
                </span>
                <span v-else class="task-list__muted">Sem prazo</span>
              </td>
              <td class="task-list__extras">
                <span
                  v-if="task.checklist_total"
                  :title="`Checklist: ${task.checklist_done} de ${task.checklist_total}`"
                >
                  <ListChecks :size="14" aria-hidden="true" />
                  {{ task.checklist_done }}/{{ task.checklist_total }}
                </span>
                <span v-if="task.comments_count" :title="`${task.comments_count} comentários`">
                  <MessageSquare :size="14" aria-hidden="true" />
                  {{ task.comments_count }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.task-list__group {
  overflow: hidden;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.task-list__group-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 3rem;
  padding: 0 var(--space-4);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: left;
  background: var(--color-bg-subtle);
}
.task-list__group-header:hover {
  background: var(--color-bg-hover);
}
.task-list__chevron {
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}
.task-list__group-header[aria-expanded='false'] .task-list__chevron {
  transform: rotate(-90deg);
}
.task-list__count {
  padding: 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  background: var(--color-bg-card);
  border-radius: var(--radius-full);
}
.task-list__body {
  overflow-x: auto;
}
.task-list__empty {
  padding: var(--space-5) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.task-list__table {
  min-width: 46rem;
  font-size: var(--font-size-sm);
  table-layout: fixed;
}
/* Larguras fixas: as colunas alinham entre os grupos. */
.task-list__table th:nth-child(1) {
  width: 36%;
}
.task-list__table th:nth-child(2) {
  width: 16%;
}
.task-list__table th:nth-child(3) {
  width: 18%;
}
.task-list__table th:nth-child(4) {
  width: 11%;
}
.task-list__table th:nth-child(5) {
  width: 10%;
}
.task-list__table th:nth-child(6) {
  width: 9%;
}
.task-list__table th,
.task-list__table td {
  padding: var(--space-2) var(--space-4);
  text-align: left;
  vertical-align: middle;
  border-top: 1px solid var(--color-border);
}
.task-list__table thead th {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.task-list__row {
  position: relative;
  transition: background-color 0.12s ease;
}
.task-list__row:hover {
  background: var(--color-bg-hover);
}
.task-list__title-cell {
  font-weight: var(--font-weight-medium);
}
.task-list__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.task-list__title-wrap .task-list__open {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-list__id {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}
.task-list__open {
  color: var(--color-text);
  font: inherit;
  text-align: left;
}
/* A linha inteira abre a tarefa. */
.task-list__open::after {
  content: '';
  position: absolute;
  inset: 0;
}
.task-list__open:focus-visible {
  outline: none;
}
.task-list__open:focus-visible::after {
  outline: var(--focus-ring);
  outline-offset: -2px;
}
.task-list__row--done .task-list__open {
  color: var(--color-text-secondary);
}
.task-list__status,
.task-list__person,
.task-list__due,
.task-list__extras span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}
.task-list__extras {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.task-list__extras span + span {
  margin-left: var(--space-3);
}
.task-list__avatar {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.625rem;
}
.task-list__muted {
  color: var(--color-text-secondary);
}
.task-list__due--late {
  color: var(--color-status-late);
  font-weight: var(--font-weight-semibold);
}
.task-list__priority {
  padding: 0.125rem var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.task-list__priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.task-list__priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}
.task-list__priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.task-list__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.task-list__dot--in_progress,
.task-list__dot--medium {
  background: var(--color-warning);
}
.task-list__dot--done,
.task-list__dot--low {
  background: var(--color-status-done);
}
.task-list__dot--high {
  background: var(--color-danger);
}
.task-list__dot--person {
  background: var(--color-primary);
}
.task-list__dot--none {
  background: transparent;
  border: 1px dashed var(--color-text-secondary);
}
</style>
