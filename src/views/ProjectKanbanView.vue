<script setup>
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ColumnForm from '@/components/kanban/ColumnForm.vue'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import KanbanFilters from '@/components/kanban/KanbanFilters.vue'
import { useKanbanStore } from '@/stores/kanban'
import { apiFieldErrors } from '@/utils/apiErrors'
import { EMPTY_FILTERS, filterTasks, groupTasks, hasActiveFilters, todayISO } from '@/utils/kanban'

const route = useRoute()
const router = useRouter()
const kanban = useKanbanStore()

// Filtros na query da rota (sobrevivem a F5 e à abertura de modais). "search" vira "q".
const QUERY_KEYS = {
  search: 'q',
  priority: 'priority',
  assignee: 'assignee',
  column: 'column',
  due: 'due',
}

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
const visibleByColumn = computed(() => groupTasks(kanban.columns, visibleTasks.value))
const today = todayISO()

const errorTitle = computed(() => {
  if (kanban.errorStatus === 404) return 'Projeto não encontrado'
  if (kanban.errorStatus === 403) return 'Acesso negado'
  if (kanban.errorStatus === 401) return 'Sessão expirada'
  return 'Não foi possível carregar o quadro'
})
const canRetry = computed(() => ![401, 403, 404].includes(kanban.errorStatus))

function changeFilters(patch) {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(patch)) {
    const param = QUERY_KEYS[key]
    if (value) query[param] = value
    else delete query[param]
  }
  router.replace({ query })
}

function clearFilters() {
  changeFilters(Object.fromEntries(Object.keys(QUERY_KEYS).map((key) => [key, ''])))
}

function load() {
  kanban.load(route.params.id)
}

// Gestão de colunas (dono/administrador). Erros já viram toast na store.
const columnForm = reactive({ open: false, column: null, saving: false, fieldErrors: {} })
const columnDelete = reactive({ column: null, busy: false })

function openColumnForm(column = null) {
  Object.assign(columnForm, { open: true, column, saving: false, fieldErrors: {} })
}

async function saveColumn({ name, category }) {
  columnForm.saving = true
  columnForm.fieldErrors = {}
  try {
    if (columnForm.column) await kanban.renameColumn(columnForm.column.id, name)
    else await kanban.createColumn({ name, category })
    columnForm.open = false
  } catch (cause) {
    columnForm.fieldErrors = apiFieldErrors(cause, ['name', 'category'])
  } finally {
    columnForm.saving = false
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

function manageColumn({ column, action }) {
  if (action === 'rename') openColumnForm(column)
  else if (action === 'delete') columnDelete.column = column
  else kanban.moveColumn(column.id, action === 'move-left' ? -1 : 1).catch(() => {})
}

// Abrir tarefa: o modal de detalhe entra na Task 10.
function openTask() {}

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
      <ArrowLeft :size="18" aria-hidden="true" /> Visão geral do projeto
    </RouterLink>

    <div
      v-if="kanban.status === 'loading' || kanban.status === 'idle'"
      class="kanban-page__state"
      role="status"
    >
      <h1 id="kanban-state-title">Carregando quadro…</h1>
      <p>Buscando colunas, tarefas e participantes.</p>
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
          <p>{{ kanban.project.name }}</p>
        </div>
      </header>

      <KanbanFilters
        :filters="filters"
        :members="kanban.members"
        :columns="kanban.columns"
        :shown="visibleTasks.length"
        :total="kanban.tasks.length"
        @change="changeFilters"
        @clear="clearFilters"
      />

      <div v-if="!kanban.columns.length" class="kanban-page__state">
        <h2>Este projeto ainda não tem colunas</h2>
        <p>As colunas aparecem aqui assim que forem criadas.</p>
        <BaseButton v-if="kanban.canManage" @click="openColumnForm()">Nova coluna</BaseButton>
      </div>
      <template v-else>
        <p v-if="filtered && !visibleTasks.length" class="kanban-page__no-results" role="status">
          Nenhuma tarefa corresponde aos filtros.
          <button type="button" class="kanban-page__link" @click="clearFilters">
            Limpar filtros
          </button>
        </p>
        <KanbanBoard
          :columns="kanban.columns"
          :visible-by-column="visibleByColumn"
          :tasks-by-column="kanban.tasksByColumn"
          :today="today"
          :filtered="filtered"
          :can-manage="kanban.canManage"
          @open-task="openTask"
          @manage-column="manageColumn"
          @add-column="openColumnForm()"
        />
      </template>
    </template>

    <ColumnForm
      v-if="columnForm.open"
      :column="columnForm.column"
      :saving="columnForm.saving"
      :field-errors="columnForm.fieldErrors"
      @submit="saveColumn"
      @close="columnForm.open = false"
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
  </section>
</template>

<style scoped>
.kanban-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-8) var(--space-6);
}
.kanban-page__back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  min-height: 2.75rem;
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
}
.kanban-page__heading p {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
.kanban-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  text-align: center;
}
.kanban-page__state h1,
.kanban-page__state h2 {
  font-size: var(--font-size-xl);
}
.kanban-page__state p {
  color: var(--color-text-secondary);
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
@media (max-width: 700px) {
  .kanban-page {
    padding: var(--space-5) var(--space-4);
  }
  .kanban-page__heading h1 {
    font-size: var(--font-size-xl);
  }
}
</style>
