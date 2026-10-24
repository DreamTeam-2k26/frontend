<script setup>
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import TaskCard from '@/components/kanban/TaskCard.vue'

const NAME_MAX = 50

const {
  lane,
  total,
  today,
  filtered = false,
  canManage = false,
  first = false,
  last = false,
  columns = [],
  columnsById,
  dragTaskId = null,
  dropIndex = null,
  reorderable = true,
} = defineProps({
  // Faixa de buildLanes: { id, kind, value, title, tone, column?, tasks } (tarefas já filtradas e ordenadas)
  lane: { type: Object, required: true },
  // Total de tarefas da faixa sem filtro.
  total: { type: Number, required: true },
  today: { type: String, required: true },
  filtered: { type: Boolean, default: false },
  // Dono/administrador em faixa de coluna real: mostra a gestão (o servidor valida de novo).
  canManage: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
  columns: { type: Array, default: () => [] },
  columnsById: { type: Map, required: true },
  // Arrasto em andamento: card arrastado e posição de soltura nesta faixa (null = fora dela).
  dragTaskId: { type: Number, default: null },
  dropIndex: { type: Number, default: null },
  // Ordem manual em colunas reais: soltar escolhe a posição (mostra a linha de soltura).
  reorderable: { type: Boolean, default: true },
})

const emit = defineEmits({
  'open-task': (id) => id != null,
  'add-task': null,
  'task-action': (payload) => payload?.taskId != null,
  // { action: 'rename' | 'move-left' | 'move-right' | 'delete', name? }
  manage: (payload) => ['rename', 'move-left', 'move-right', 'delete'].includes(payload?.action),
})

const headingId = computed(() => `kanban-lane-${lane.id}`)
const isColumn = computed(() => lane.kind === 'column')
const isTarget = computed(() => dropIndex !== null)
const countLabel = computed(() =>
  filtered
    ? `${lane.tasks.length} de ${total} tarefas`
    : `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`,
)

// Índice de cada card visível sem contar o card arrastado (para o indicador de soltura).
const dropSlots = computed(() => {
  const slots = new Map()
  for (const task of lane.tasks) if (task.id !== dragTaskId) slots.set(task.id, slots.size)
  return slots
})

const menuItems = computed(() => [
  { id: 'rename', label: 'Renomear', icon: Pencil },
  { id: 'move-left', label: 'Mover para a esquerda', icon: ArrowLeft, disabled: first },
  { id: 'move-right', label: 'Mover para a direita', icon: ArrowRight, disabled: last },
  { id: 'sep', separator: true },
  { id: 'delete', label: 'Excluir coluna', icon: Trash2, danger: true },
])

// Renomear direto no cabeçalho: Enter salva, Esc cancela.
const renaming = shallowRef(false)
const draftName = shallowRef('')
const nameInput = useTemplateRef('nameInput')

async function startRename() {
  draftName.value = lane.title
  renaming.value = true
  await nextTick()
  nameInput.value?.select()
}

function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const name = draftName.value.trim().slice(0, NAME_MAX)
  if (name && name !== lane.title) emit('manage', { action: 'rename', name })
}

function onMenu(action) {
  if (action === 'rename') startRename()
  else emit('manage', { action })
}

// Durante um arrasto a faixa vazia convida a soltar; fora dele, explica o vazio.
const emptyText = computed(() => {
  if (dragTaskId !== null) return 'Solte a tarefa aqui.'
  if (filtered && total) return 'Nenhuma tarefa corresponde aos filtros.'
  return 'Nenhuma tarefa por aqui.'
})

const taskDone = (task) => columnsById.get(task.column)?.category === 'done'
</script>

<template>
  <section
    class="lane"
    :class="{ 'lane--target': isTarget }"
    :aria-labelledby="headingId"
    :data-lane-id="lane.id"
  >
    <header class="lane__header">
      <UserAvatar
        v-if="lane.kind === 'assignee' && lane.value != null"
        :name="lane.title"
        size="sm"
        class="lane__avatar"
      />
      <span v-else class="lane__dot" :class="`lane__dot--${lane.tone}`" aria-hidden="true" />

      <input
        v-if="renaming"
        ref="nameInput"
        v-model="draftName"
        class="lane__rename"
        :maxlength="NAME_MAX"
        aria-label="Nome da coluna"
        @keydown.enter.prevent="commitRename"
        @keydown.esc.stop.prevent="renaming = false"
        @blur="commitRename"
      />
      <h2
        v-else
        :id="headingId"
        class="lane__title"
        @dblclick="canManage && isColumn && startRename()"
      >
        {{ lane.title }}
      </h2>

      <span class="lane__count" :title="countLabel">
        <span aria-hidden="true">{{ filtered ? `${lane.tasks.length}/${total}` : total }}</span>
        <span class="visually-hidden">{{ countLabel }}</span>
      </span>

      <div class="lane__actions">
        <button
          type="button"
          class="lane__icon-button"
          :aria-label="`Adicionar tarefa em ${lane.title}`"
          @click="emit('add-task')"
        >
          <Plus :size="16" aria-hidden="true" />
        </button>
        <ActionMenu
          v-if="canManage && isColumn"
          :label="`Ações da coluna ${lane.title}`"
          :items="menuItems"
          @select="onMenu"
        />
      </div>
    </header>

    <TransitionGroup tag="ul" name="card" class="lane__list">
      <li
        v-for="task in lane.tasks"
        :key="task.id"
        class="lane__item"
        :class="{
          'lane__item--drop-before':
            reorderable && isTarget && dropSlots.get(task.id) === dropIndex,
        }"
      >
        <TaskCard
          :task="task"
          :today="today"
          :done="taskDone(task)"
          :columns="columns"
          @open="emit('open-task', $event)"
          @action="emit('task-action', $event)"
        />
      </li>
      <li
        v-if="reorderable && isTarget && dropIndex === dropSlots.size"
        key="drop-end"
        class="lane__drop"
        aria-hidden="true"
      />
    </TransitionGroup>

    <p v-if="!lane.tasks.length && !isTarget" class="lane__empty">
      {{ emptyText }}
    </p>

    <button type="button" class="lane__add" @click="emit('add-task')">
      <Plus :size="16" aria-hidden="true" /> Adicionar tarefa
      <span class="visually-hidden">em {{ lane.title }}</span>
    </button>
  </section>
</template>

<style scoped>
.lane {
  position: relative;
  display: flex;
  flex: 0 0 19rem;
  flex-direction: column;
  gap: var(--space-2);
  width: 19rem;
  max-width: calc(100vw - 3rem);
  min-height: 16rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.lane--target {
  border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg-subtle));
}
.lane__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.25rem;
  padding: 0 var(--space-1) var(--space-1);
}
.lane__avatar {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.625rem;
}
.lane__dot {
  position: relative;
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.lane__dot::after {
  content: '';
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}
.lane__dot--none {
  background: transparent;
  border: 1px dashed var(--color-text-secondary);
}

/* Cada estado tem um ritmo próprio, discreto:
   A fazer "respira" (esperando), Em andamento irradia em âmbar (vivo),
   Concluído brilha num anel calmo (assentado). */
.lane__dot--todo {
  animation: dot-breathe 3.2s ease-in-out infinite;
}
.lane__dot--in_progress {
  background: var(--color-warning);
}
.lane__dot--in_progress::after {
  inset: -0.25rem;
  background: var(--color-warning);
  opacity: 0;
  animation: dot-radiate 2.4s ease-out infinite;
}
.lane__dot--done {
  background: var(--color-status-done);
}
.lane__dot--done::after {
  inset: -0.1875rem;
  border: 1.5px solid var(--color-status-done);
  animation: dot-glow 3.6s ease-in-out infinite;
}

/* Faixas de prioridade: Alta bate como coração, Média respira em âmbar, Baixa fica parada. */
.lane__dot--high {
  background: var(--color-danger);
  animation: dot-heartbeat 1.8s ease-in-out infinite;
}
.lane__dot--medium {
  background: var(--color-warning);
  animation: dot-breathe 2.6s ease-in-out infinite;
}
.lane__dot--low {
  background: var(--color-status-done);
}

@keyframes dot-breathe {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}
@keyframes dot-radiate {
  0% {
    opacity: 0.45;
    transform: scale(0.6);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}
@keyframes dot-glow {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.7;
  }
}
@keyframes dot-heartbeat {
  0%,
  40%,
  100% {
    transform: scale(1);
  }
  10%,
  30% {
    transform: scale(1.35);
  }
  20% {
    transform: scale(1.05);
  }
}
.lane__title {
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lane__rename {
  min-width: 0;
  flex: 1;
  height: 1.875rem;
  padding: 0 var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: var(--color-input-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
}
.lane__rename:focus {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.lane__count {
  min-width: 1.375rem;
  padding: 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  text-align: center;
  background: var(--color-bg-card);
  border-radius: var(--radius-full);
}
.lane__actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}
.lane__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}
.lane__icon-button:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.lane__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.lane__item {
  position: relative;
}
/* Indicador de soltura antes do card (sem elemento extra: não troca as chaves da lista). */
.lane__item--drop-before::before {
  content: '';
  position: absolute;
  inset: calc(-1 * var(--space-1) - 0.125rem) 0 auto;
  height: 0.25rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.lane__drop {
  height: 0.25rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.lane__empty {
  padding: var(--space-6) var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
.lane__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
}
.lane__add:hover {
  color: var(--color-primary-hover);
  background: var(--color-bg-hover);
}

/* Cards entram, saem e trocam de lugar com animação (FLIP do TransitionGroup). */
.card-move,
.card-enter-active,
.card-leave-active {
  transition:
    transform var(--motion-slow) var(--ease-flow),
    opacity var(--motion-base) ease;
}
.card-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.card-leave-active {
  position: absolute;
  width: calc(100% - 2 * var(--space-3));
}
</style>
