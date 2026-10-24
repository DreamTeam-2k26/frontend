<script setup>
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import {
  ArrowRightLeft,
  CalendarDays,
  CalendarX2,
  CircleCheck,
  ExternalLink,
  Link,
  ListChecks,
  MessageSquare,
  PanelRight,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { PRIORITIES, dueInfo } from '@/utils/kanban'

const {
  task,
  today,
  done = false,
  columns = [],
} = defineProps({
  task: { type: Object, required: true },
  // Data de hoje (YYYY-MM-DD) calculada uma vez pela página.
  today: { type: String, required: true },
  // Coluna de categoria "done": tarefa concluída.
  done: { type: Boolean, default: false },
  // Colunas do quadro, para "Mover para coluna" (alternativa ao arrasto).
  columns: { type: Array, default: () => [] },
})

// action: 'open-tab' | 'copy-link' | 'delete' | 'move:<id da coluna>'
const emit = defineEmits({
  open: (id) => id != null,
  action: (payload) => payload?.taskId != null && typeof payload.action === 'string',
})

const priority = computed(() => PRIORITIES.find((item) => item.value === task.priority))
const due = computed(() => dueInfo(task.due_date, today, done))
const late = computed(() => !done && task.is_overdue)
const checklistComplete = computed(
  () => task.checklist_total > 0 && task.checklist_done === task.checklist_total,
)

const menuItems = computed(() => [
  { id: 'open', label: 'Abrir', icon: PanelRight, shortcut: 'Enter' },
  { id: 'open-tab', label: 'Abrir em nova aba', icon: ExternalLink },
  { id: 'copy-link', label: 'Copiar link', icon: Link },
  { id: 'sep-1', separator: true },
  {
    id: 'move',
    label: 'Mover para coluna',
    icon: ArrowRightLeft,
    children: columns.map((column) => ({
      id: `move:${column.id}`,
      label: column.name,
      tone: column.category,
      checked: column.id === task.column,
    })),
  },
  { id: 'sep-2', separator: true },
  { id: 'delete', label: 'Excluir tarefa', icon: Trash2, danger: true, shortcut: 'Del' },
])

function onMenu(id) {
  if (id === 'open') emit('open', task.id)
  else emit('action', { taskId: task.id, action: id })
}

// Atalhos com o card em foco: Delete/Backspace pede para excluir (Enter já abre pelo botão do título).
function onKeydown(event) {
  if (event.target.closest('[data-no-drag]')) return
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    emit('action', { taskId: task.id, action: 'delete' })
  }
}

// Card que chega em "Concluído" comemora com um pulso curto no check.
const celebrating = shallowRef(false)
let celebrateTimer = 0
watch(
  () => done,
  (isDone, wasDone) => {
    if (!isDone || wasDone) return
    celebrating.value = true
    clearTimeout(celebrateTimer)
    celebrateTimer = setTimeout(() => (celebrating.value = false), 700)
  },
)
onBeforeUnmount(() => clearTimeout(celebrateTimer))
</script>

<template>
  <article
    class="task-card"
    :class="{
      'task-card--done': done,
      'task-card--late': late,
      'task-card--celebrate': celebrating,
    }"
    :data-task-id="task.id"
    @keydown="onKeydown"
  >
    <div class="task-card__top">
      <span class="task-card__id">
        <CircleCheck v-if="done" class="task-card__done-icon" :size="14" aria-hidden="true" />
        #{{ task.id }}
        <span v-if="done" class="visually-hidden">(concluída)</span>
      </span>
      <span
        v-if="priority"
        class="task-card__priority"
        :class="`task-card__priority--${priority.value}`"
      >
        <span class="visually-hidden">Prioridade</span> {{ priority.label }}
      </span>
      <ActionMenu
        class="task-card__menu"
        data-no-drag
        :label="`Ações da tarefa ${task.title}`"
        :items="menuItems"
        @select="onMenu"
      />
    </div>

    <h3 class="task-card__title">
      <button type="button" class="task-card__open" @click="emit('open', task.id)">
        {{ task.title }}
      </button>
    </h3>
    <p v-if="task.description" class="task-card__description">{{ task.description }}</p>

    <div class="task-card__meta">
      <span
        v-if="due.label"
        class="task-card__chip"
        :class="{ 'task-card__chip--late': late, 'task-card__chip--soon': due.tone === 'soon' }"
        :title="due.relative ? `Prazo: ${due.label} (${due.relative})` : `Prazo: ${due.label}`"
      >
        <component :is="late ? CalendarX2 : CalendarDays" :size="14" aria-hidden="true" />
        <span class="visually-hidden">Prazo:</span> {{ due.label }}
        <span v-if="late" class="visually-hidden">(atrasada)</span>
      </span>
      <span
        v-if="task.checklist_total"
        class="task-card__chip"
        :class="{ 'task-card__chip--complete': checklistComplete }"
        :title="`Checklist: ${task.checklist_done} de ${task.checklist_total} itens`"
      >
        <ListChecks :size="14" aria-hidden="true" />
        <span class="visually-hidden">Checklist:</span>
        {{ task.checklist_done }}/{{ task.checklist_total }}
      </span>
      <span
        v-if="task.comments_count"
        class="task-card__chip"
        :title="`${task.comments_count} comentários`"
      >
        <MessageSquare :size="14" aria-hidden="true" />
        <span class="visually-hidden">Comentários:</span> {{ task.comments_count }}
      </span>
      <span class="task-card__assignee" :title="task.assignee_name || 'Sem responsável'">
        <UserAvatar v-if="task.assignee" :name="task.assignee_name || ''" size="sm" />
        <span v-else class="task-card__nobody"><UserRound :size="14" aria-hidden="true" /></span>
        <span class="visually-hidden">
          Responsável: {{ task.assignee ? task.assignee_name : 'ninguém' }}
        </span>
      </span>
    </div>
  </article>
</template>

<style scoped>
.task-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  user-select: none;
  -webkit-touch-callout: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.task-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
}
.task-card:focus-within {
  border-color: var(--color-primary);
}
/* Card de origem durante o arrasto e clone que segue o ponteiro (useBoardDrag). */
.task-card--dragging {
  opacity: 0.35;
}
.task-card--ghost {
  cursor: grabbing;
  box-shadow: var(--shadow-lg);
}
.task-card__top {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 1.75rem;
}
.task-card__id {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-right: auto;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.task-card__done-icon {
  color: var(--color-status-done);
}
.task-card--celebrate .task-card__done-icon {
  animation: done-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.task-card__priority {
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
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
/* Em repouso o badge de prioridade ocupa o canto; no hover/foco ele desliza para a esquerda e o
   ⋯ aparece no lugar dele (como no GitHub). O ⋯ fica acima da camada clicável do card. */
.task-card__menu {
  position: absolute;
  top: 50%;
  right: calc(-1 * var(--space-1));
  z-index: 1;
  opacity: 0;
  transform: translateY(-50%) scale(0.85);
  transition:
    opacity 0.16s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.task-card:hover .task-card__menu,
.task-card:focus-within .task-card__menu,
.task-card__menu:has([aria-expanded='true']) {
  opacity: 1;
  transform: translateY(-50%) scale(1);
  pointer-events: auto;
}
.task-card:hover .task-card__priority,
.task-card:focus-within .task-card__priority,
.task-card__top:has([aria-expanded='true']) .task-card__priority {
  transform: translateX(-2.25rem);
}
@media (hover: none) {
  .task-card__menu {
    opacity: 1;
    transform: translateY(-50%);
    pointer-events: auto;
  }
  .task-card__priority {
    transform: translateX(-2.25rem);
  }
}
.task-card__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}
.task-card__open {
  padding: 0;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: inherit;
}
/* O card inteiro abre a tarefa. */
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
.task-card__description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.task-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
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
.task-card__chip--complete {
  color: var(--color-status-done);
}
.task-card__assignee {
  display: inline-flex;
  margin-left: auto;
}
.task-card__nobody {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-8);
  height: var(--space-8);
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-full);
}

@keyframes done-pop {
  0% {
    transform: scale(0.4);
  }
  60% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}
</style>
