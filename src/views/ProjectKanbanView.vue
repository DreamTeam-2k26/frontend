<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, List, Plus, SquareKanban } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import KanbanToolbar from '@/components/kanban/KanbanToolbar.vue'
import TaskList from '@/components/kanban/TaskList.vue'
import TaskDetails from '@/components/tasks/TaskDetails.vue'
import TaskForm from '@/components/tasks/TaskForm.vue'
import { useTaskLink } from '@/composables/useTaskLink'
import { useKanbanStore } from '@/stores/kanban'
import { apiFieldErrors } from '@/utils/apiErrors'
import {
  EMPTY_FILTERS,
  GROUPS,
  SORTS,
  buildLanes,
  filterTasks,
  hasActiveFilters,
  targetPosition,
  todayISO,
} from '@/utils/kanban'

const route = useRoute()
const router = useRouter()
const kanban = useKanbanStore()
const { copyLink, openInNewTab } = useTaskLink()

// Visão, agrupamento, ordem e filtros ficam na query da rota (sobrevivem a F5, links e ao drawer).
const QUERY_KEYS = {
  search: 'q',
  priority: 'priority',
  assignee: 'assignee',
  column: 'column',
  due: 'due',
}
const VIEWS = [
  { value: 'board', label: 'Quadro', icon: SquareKanban },
  { value: 'list', label: 'Lista', icon: List },
]

const queryValue = (name, allowed, fallback) => {
  const value = route.query[name]
  return allowed.includes(value) ? value : fallback
}
const view = computed(() => queryValue('view', ['board', 'list'], 'board'))
const group = computed(() =>
  queryValue(
    'group',
    GROUPS.map((option) => option.value),
    'status',
  ),
)
const sort = computed(() =>
  queryValue(
    'sort',
    SORTS.map((option) => option.value),
    'manual',
  ),
)
const filters = computed(() =>
  Object.fromEntries(
    Object.entries(QUERY_KEYS).map(([key, param]) => {
      const value = route.query[param]
      return [key, typeof value === 'string' ? value : EMPTY_FILTERS[key]]
    }),
  ),
)

const filtered = computed(() => hasActiveFilters(filters.value))
const visibleTasks = computed(() => filterTasks(kanban.tasks, filters.value))
const laneSource = computed(() => ({
  columns: kanban.columns,
  members: kanban.members,
  sort: sort.value,
}))
const lanes = computed(() =>
  buildLanes(group.value, { ...laneSource.value, tasks: visibleTasks.value }),
)
const totals = computed(
  () =>
    new Map(
      buildLanes(group.value, { ...laneSource.value, tasks: kanban.tasks }).map((lane) => [
        lane.id,
        lane.tasks.length,
      ]),
    ),
)
const canManageColumns = computed(() => kanban.canManage && group.value === 'status')
const subtitle = computed(
  () =>
    kanban.project?.description?.trim() ||
    `Organize as etapas de trabalho de ${kanban.project?.name}.`,
)
const today = todayISO()

const errorTitle = computed(() => {
  if (kanban.errorStatus === 404) return 'Projeto não encontrado'
  if (kanban.errorStatus === 403) return 'Acesso negado'
  if (kanban.errorStatus === 401) return 'Sessão expirada'
  return 'Não foi possível carregar o quadro'
})
const canRetry = computed(() => ![401, 403, 404].includes(kanban.errorStatus))

// Grava na query só o que difere do padrão, para a URL ficar limpa.
const DEFAULTS = { view: 'board', group: 'status', sort: 'manual' }

function changeQuery(patch) {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(patch)) {
    const param = QUERY_KEYS[key] ?? key
    if (value && value !== DEFAULTS[key]) query[param] = value
    else delete query[param]
  }
  router.replace({ query })
}

function clearFilters() {
  changeQuery(Object.fromEntries(Object.keys(QUERY_KEYS).map((key) => [key, ''])))
}

function load() {
  kanban.load(route.params.id)
}

// Abas Quadro/Lista com setas do teclado (padrão WAI-ARIA de tabs).
function onTabKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  const next = view.value === 'board' ? 'list' : 'board'
  changeQuery({ view: next })
  nextTick(() => document.getElementById(`kanban-tab-${next}`)?.focus())
}

// Colunas (dono/administrador). Erros já viram toast na store.
const composer = reactive({ open: false, saving: false, error: '' })
const columnDelete = reactive({ column: null, busy: false })

async function createColumn({ name, category }) {
  composer.saving = true
  composer.error = ''
  try {
    await kanban.createColumn({ name, category })
    composer.open = false
  } catch (cause) {
    composer.error = apiFieldErrors(cause, ['name'])?.name ?? ''
  } finally {
    composer.saving = false
  }
}

async function confirmDeleteColumn() {
  columnDelete.busy = true
  try {
    await kanban.deleteColumn(columnDelete.column.id)
  } catch {
    // Mensagem do servidor (ex.: coluna com tarefas) já exibida pela store.
  } finally {
    Object.assign(columnDelete, { column: null, busy: false })
  }
}

function manageColumn({ column, action, name }) {
  if (action === 'rename') kanban.renameColumn(column.id, name).catch(() => {})
  else if (action === 'delete') columnDelete.column = column
  else kanban.moveColumn(column.id, action === 'move-left' ? -1 : 1).catch(() => {})
}

// Nova tarefa: pelo topo, pelo "+" de uma faixa (já com coluna/prioridade/responsável) ou pela
// visão geral (?new=1).
const taskForm = reactive({ open: false, defaults: {}, saving: false, fieldErrors: {} })

function openTaskForm(lane = null) {
  const defaults = {}
  if (lane?.kind === 'column') defaults.column = lane.value
  if (lane?.kind === 'priority') defaults.priority = lane.value
  if (lane?.kind === 'assignee') defaults.assignee = lane.value
  Object.assign(taskForm, { open: true, defaults, saving: false, fieldErrors: {} })
}

async function saveTask(payload) {
  taskForm.saving = true
  taskForm.fieldErrors = {}
  try {
    await kanban.createTask(payload)
    taskForm.open = false
  } catch (cause) {
    // Formulário fica aberto com os dados; erros de campo aparecem em cada campo.
    taskForm.fieldErrors = apiFieldErrors(cause, [
      'title',
      'description',
      'column',
      'priority',
      'assignee',
      'due_date',
    ])
  } finally {
    taskForm.saving = false
  }
}

watch(
  () => [kanban.status, route.query.new],
  ([status, isNew]) => {
    if (status !== 'ready' || !isNew) return
    const query = { ...route.query }
    delete query.new
    router.replace({ query })
    if (kanban.columns.length) openTaskForm()
  },
)

// Mover tarefa. O índice vem da lista visível; com filtro ativo, targetPosition converte para a
// posição na ordem completa da coluna. Fora da ordem manual, a tarefa vai para o fim da coluna.
const announcement = ref('')

async function moveToColumn(taskId, columnId, index = null) {
  const task = kanban.tasks.find((item) => item.id === taskId)
  const column = kanban.columnsById.get(columnId)
  if (!task || !column) return

  const full = kanban.tasksByColumn.get(columnId) ?? []
  const manual = sort.value === 'manual' && index !== null
  const visible = (
    lanes.value.find((lane) => lane.id === `column-${columnId}`)?.tasks ?? []
  ).filter((item) => item.column === columnId)
  const position = manual
    ? targetPosition(full, visible, index, taskId)
    : full.filter((item) => item.id !== taskId).length
  const current = full.findIndex((item) => item.id === taskId)
  if (task.column === columnId && (current === position || !manual)) return

  announcement.value = ''
  try {
    await kanban.moveTask(taskId, columnId, position)
    announcement.value = `Tarefa movida para ${column.name}.`
  } catch {
    announcement.value = 'Não foi possível mover a tarefa.'
  }
  // Pelo menu, o card pode ter sido recriado em outra coluna: devolve o foco a ele.
  await nextTick()
  if (document.activeElement === document.body) {
    document.querySelector(`[data-task-id="${taskId}"] .task-card__open`)?.focus()
  }
}

// Soltar em faixa virtual altera o campo que ela representa (prioridade ou responsável).
async function moveTask({ taskId, laneId, index }) {
  const lane = lanes.value.find((item) => item.id === laneId)
  const task = kanban.tasks.find((item) => item.id === taskId)
  if (!lane || !task) return
  if (lane.kind === 'column') return moveToColumn(taskId, lane.value, index)

  const field = lane.kind === 'priority' ? 'priority' : 'assignee'
  if ((task[field] ?? null) === lane.value) return
  announcement.value = ''
  try {
    await kanban.updateTaskFields(taskId, { [field]: lane.value })
    announcement.value = `Tarefa movida para ${lane.title}.`
  } catch {
    announcement.value = 'Não foi possível mover a tarefa.'
  }
}

// Ações do menu do card.
const taskDelete = reactive({ task: null, busy: false })

function taskAction({ taskId, action }) {
  if (action === 'open-tab') openInNewTab(taskId)
  else if (action === 'copy-link') copyLink(taskId)
  else if (action === 'delete') taskDelete.task = kanban.tasks.find((item) => item.id === taskId)
  else if (action.startsWith('move:')) moveToColumn(taskId, Number(action.slice(5)))
}

async function confirmDeleteTask() {
  taskDelete.busy = true
  try {
    const id = taskDelete.task.id
    await kanban.deleteTask(id)
    if (openTaskId.value === id) closeTask()
  } catch {
    // Toast exibido pela store.
  } finally {
    Object.assign(taskDelete, { task: null, busy: false })
  }
}

// Tarefa aberta fica na URL (?task=id): abre direto por link e sobrevive ao F5, mantendo os filtros.
const openTaskId = computed(() => {
  const value = route.query.task
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null
})

function openTask(id) {
  router.push({ query: { ...route.query, task: String(id) } })
}

function closeTask() {
  const query = { ...route.query }
  delete query.task
  router.push({ query })
}

watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => kanban.reset())
</script>

<template>
  <section
    class="kanban-page"
    :aria-busy="kanban.status === 'loading'"
    :aria-labelledby="kanban.project ? 'kanban-title' : 'kanban-state-title'"
  >
    <RouterLink
      v-if="canRetry || kanban.status !== 'error'"
      class="kanban-page__back"
      :to="{ name: 'project-detail', params: { id: route.params.id } }"
    >
      <ArrowLeft :size="16" aria-hidden="true" /> {{ kanban.project?.name || 'Visão geral' }}
    </RouterLink>

    <div
      v-if="kanban.status === 'loading' || kanban.status === 'idle'"
      class="kanban-page__state"
      role="status"
    >
      <span class="kanban-page__spinner" aria-hidden="true" />
      <h1 id="kanban-state-title">Carregando quadro…</h1>
    </div>

    <div v-else-if="kanban.status === 'error'" class="kanban-page__state" role="alert">
      <h1 id="kanban-state-title">{{ errorTitle }}</h1>
      <p>{{ kanban.error }}</p>
      <BaseButton v-if="canRetry" variant="secondary" @click="load">Tentar novamente</BaseButton>
      <BaseButton
        v-if="kanban.errorStatus === 401"
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
      >
        Entrar novamente
      </BaseButton>
      <BaseButton v-if="[403, 404].includes(kanban.errorStatus)" :to="{ name: 'projects' }">
        Ir para Meus Projetos
      </BaseButton>
    </div>

    <template v-else-if="kanban.project">
      <header class="kanban-page__header">
        <div class="kanban-page__heading">
          <h1 id="kanban-title">Quadro de tarefas</h1>
          <p>{{ subtitle }}</p>
        </div>
        <BaseButton :disabled="!kanban.columns.length" @click="openTaskForm()">
          <Plus :size="16" aria-hidden="true" /> Nova tarefa
        </BaseButton>
      </header>

      <div class="kanban-page__tabs" role="tablist" aria-label="Visualização">
        <button
          v-for="option in VIEWS"
          :id="`kanban-tab-${option.value}`"
          :key="option.value"
          type="button"
          role="tab"
          class="kanban-page__tab"
          :class="{ 'kanban-page__tab--active': view === option.value }"
          :aria-selected="view === option.value"
          :aria-controls="`kanban-panel-${option.value}`"
          :tabindex="view === option.value ? 0 : -1"
          @click="changeQuery({ view: option.value })"
          @keydown="onTabKeydown"
        >
          <component :is="option.icon" :size="16" aria-hidden="true" />
          {{ option.label }}
        </button>
      </div>

      <KanbanToolbar
        :filters="filters"
        :members="kanban.members"
        :columns="kanban.columns"
        :group="group"
        :sort="sort"
        :shown="visibleTasks.length"
        :total="kanban.tasks.length"
        @change="changeQuery"
        @clear="clearFilters"
      />

      <div v-if="!kanban.columns.length && !kanban.canManage" class="kanban-page__state">
        <h2>Este projeto ainda não tem colunas</h2>
        <p>Peça ao dono ou a um administrador para criar as colunas do quadro.</p>
      </div>
      <template v-else>
        <p v-if="filtered && !visibleTasks.length" class="kanban-page__no-results" role="status">
          Nenhuma tarefa corresponde à busca e aos filtros.
          <button type="button" class="kanban-page__link" @click="clearFilters">
            Limpar filtros
          </button>
        </p>

        <div
          v-if="view === 'board'"
          id="kanban-panel-board"
          role="tabpanel"
          aria-labelledby="kanban-tab-board"
        >
          <KanbanBoard
            :key="group"
            v-model:composer-open="composer.open"
            :lanes="lanes"
            :totals="totals"
            :today="today"
            :filtered="filtered"
            :can-manage="canManageColumns"
            :columns="kanban.columns"
            :columns-by-id="kanban.columnsById"
            :composer-saving="composer.saving"
            :composer-error="composer.error"
            @open-task="openTask"
            @add-task="openTaskForm"
            @task-action="taskAction"
            @manage-column="manageColumn"
            @move-task="moveTask"
            @create-column="createColumn"
          />
        </div>
        <div v-else id="kanban-panel-list" role="tabpanel" aria-labelledby="kanban-tab-list">
          <TaskList
            :lanes="lanes"
            :columns-by-id="kanban.columnsById"
            :today="today"
            @open-task="openTask"
          />
        </div>
      </template>
    </template>

    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>

    <TaskDetails
      v-if="openTaskId && kanban.status === 'ready'"
      :key="openTaskId"
      :task-id="openTaskId"
      :today="today"
      @close="closeTask"
    />
    <TaskForm
      v-if="taskForm.open"
      :columns="kanban.columns"
      :members="kanban.members"
      :defaults="taskForm.defaults"
      :saving="taskForm.saving"
      :field-errors="taskForm.fieldErrors"
      @submit="saveTask"
      @close="taskForm.open = false"
    />
    <ConfirmDialog
      v-if="columnDelete.column"
      title="Excluir coluna"
      :message="`Excluir a coluna “${columnDelete.column.name}”? Só é possível excluir colunas vazias, e cada categoria precisa manter ao menos uma coluna.`"
      confirm-label="Excluir coluna"
      :busy="columnDelete.busy"
      @confirm="confirmDeleteColumn"
      @cancel="columnDelete.column = null"
    />
    <ConfirmDialog
      v-if="taskDelete.task"
      title="Excluir tarefa"
      :message="`Excluir “${taskDelete.task.title}”? Checklist, comentários e links dela também serão removidos.`"
      confirm-label="Excluir tarefa"
      :busy="taskDelete.busy"
      @confirm="confirmDeleteTask"
      @cancel="taskDelete.task = null"
    />
  </section>
</template>

<style scoped>
.kanban-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-6) var(--space-8) var(--space-8);
}
.kanban-page__back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  min-height: 2rem;
  margin-bottom: calc(-1 * var(--space-3));
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.kanban-page__back:hover {
  color: var(--color-primary-hover);
}
.kanban-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}
.kanban-page__heading {
  min-width: 0;
}
.kanban-page__heading h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025em;
}
.kanban-page__heading p {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
.kanban-page__tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.kanban-page__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.kanban-page__tab:hover {
  color: var(--color-text);
}
.kanban-page__tab::after {
  content: '';
  position: absolute;
  inset: auto 0 -1px;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  transform: scaleX(0);
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.kanban-page__tab--active {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}
.kanban-page__tab--active::after {
  transform: scaleX(1);
}
.kanban-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  text-align: center;
}
.kanban-page__state h1,
.kanban-page__state h2 {
  font-size: var(--font-size-lg);
}
.kanban-page__state p {
  color: var(--color-text-secondary);
}
.kanban-page__spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: kanban-spin 0.8s linear infinite;
}
.kanban-page__no-results {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.kanban-page__link {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
}
@keyframes kanban-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 700px) {
  .kanban-page {
    padding: var(--space-5) var(--space-4);
  }
  .kanban-page__heading h1 {
    font-size: var(--font-size-xl);
  }
}
</style>
