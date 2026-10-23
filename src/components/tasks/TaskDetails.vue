<script setup>
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { LoaderCircle, Trash2, X } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import TaskChecklist from '@/components/tasks/TaskChecklist.vue'
import TaskComments from '@/components/tasks/TaskComments.vue'
import TaskLinks from '@/components/tasks/TaskLinks.vue'
import { useKanbanStore } from '@/stores/kanban'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { apiFieldErrors } from '@/utils/apiErrors'
import { PRIORITIES, dueInfo } from '@/utils/kanban'

const TITLE_MAX = 200

const { taskId, today } = defineProps({
  taskId: { type: Number, required: true },
  today: { type: String, required: true },
})

const emit = defineEmits(['close'])

// Contêiner do modal: coordena a store do quadro (tarefa no card) e a da tarefa aberta.
const kanban = useKanbanStore()
const detail = useTaskDetailStore()

const ids = { title: useId(), field: useId() }
const titleInput = ref(null)
const editingTitle = ref(false)
const confirmDelete = reactive({ open: false, busy: false })

// Rascunho por campo: em erro, o valor digitado continua na tela.
const draft = reactive({
  title: '',
  description: '',
  column: '',
  assignee: '',
  priority: '',
  due_date: '',
})
// idle | saving | saved | error, com a mensagem do servidor quando houver
const fieldState = reactive({})
const fieldError = reactive({})

const task = computed(() => detail.task)
const column = computed(() => kanban.columnsById.get(task.value?.column))
const done = computed(() => column.value?.category === 'done')
const due = computed(() => dueInfo(task.value?.due_date, today, done.value))
const priorityLabel = computed(
  () => PRIORITIES.find((item) => item.value === task.value?.priority)?.label ?? '',
)
const menuItems = [{ id: 'delete', label: 'Excluir tarefa', icon: Trash2, danger: true }]

function resetDraft(data) {
  Object.assign(draft, {
    title: data.title,
    description: data.description ?? '',
    column: String(data.column),
    assignee: data.assignee == null ? '' : String(data.assignee),
    priority: data.priority,
    due_date: data.due_date ?? '',
  })
}

watch(
  () => taskId,
  (id) => detail.open(id),
  { immediate: true },
)
watch(
  () => task.value?.id,
  () => {
    if (!task.value) return
    resetDraft(task.value)
    editingTitle.value = false
    for (const key of Object.keys(fieldState)) delete fieldState[key]
    for (const key of Object.keys(fieldError)) delete fieldError[key]
  },
  { immediate: true },
)

const savedTimers = {}
function markSaved(field) {
  fieldState[field] = 'saved'
  clearTimeout(savedTimers[field])
  savedTimers[field] = setTimeout(() => {
    if (fieldState[field] === 'saved') fieldState[field] = 'idle'
  }, 2000)
}

// PATCH só com o campo alterado (o backend valida o prazo apenas quando ele muda).
async function saveField(field, value) {
  const id = taskId
  fieldState[field] = 'saving'
  fieldError[field] = ''
  try {
    const data = await kanban.updateTaskFields(id, { [field]: value })
    if (id !== taskId) return
    detail.setTask(data)
    markSaved(field)
  } catch (cause) {
    if (id !== taskId) return
    fieldState[field] = 'error'
    fieldError[field] = apiFieldErrors(cause, [field])[field] ?? ''
  }
}

// Título

async function startTitleEdit() {
  draft.title = task.value.title
  editingTitle.value = true
  await nextTick()
  titleInput.value?.focus()
  titleInput.value?.select()
}

function cancelTitleEdit() {
  draft.title = task.value.title
  fieldError.title = ''
  fieldState.title = 'idle'
  editingTitle.value = false
}

async function commitTitle() {
  if (!editingTitle.value) return
  const title = draft.title.trim()
  if (!title) {
    fieldState.title = 'error'
    fieldError.title = 'Informe o título da tarefa.'
    return
  }
  if (title.length > TITLE_MAX) {
    fieldState.title = 'error'
    fieldError.title = `Use no máximo ${TITLE_MAX} caracteres.`
    return
  }
  if (title === task.value.title) {
    editingTitle.value = false
    return
  }
  await saveField('title', title)
  if (fieldState.title !== 'error') editingTitle.value = false
}

// Descrição: salva ao sair do campo, se mudou.
function commitDescription() {
  const description = draft.description.trim()
  if (description === (task.value.description ?? '')) return
  saveField('description', description)
}

// Status = coluna: usa o mesmo endpoint do arrasto, indo para o fim da coluna escolhida.
async function changeColumn() {
  const id = taskId
  const columnId = Number(draft.column)
  const target = (kanban.tasksByColumn.get(columnId) ?? []).filter((item) => item.id !== id)
  fieldState.column = 'saving'
  fieldError.column = ''
  try {
    await kanban.moveTask(id, columnId, target.length)
    if (id !== taskId) return
    const moved = kanban.tasks.find((item) => item.id === id)
    detail.setTask({ ...moved, column_name: kanban.columnsById.get(columnId)?.name })
    markSaved('column')
  } catch {
    if (id !== taskId) return
    fieldState.column = 'error'
  }
}

function changeAssignee() {
  saveField('assignee', draft.assignee ? Number(draft.assignee) : null)
}

function changePriority() {
  saveField('priority', draft.priority)
}

function changeDueDate() {
  if ((draft.due_date || null) === (task.value.due_date ?? null)) return
  saveField('due_date', draft.due_date || null)
}

function clearDueDate() {
  draft.due_date = ''
  changeDueDate()
}

// Exclusão

async function deleteTask() {
  confirmDelete.busy = true
  try {
    await kanban.deleteTask(taskId)
    confirmDelete.open = false
    emit('close')
  } catch {
    // Toast exibido pela store; o modal continua aberto.
  } finally {
    confirmDelete.busy = false
  }
}

function onMenu(action) {
  if (action === 'delete') confirmDelete.open = true
}
</script>

<template>
  <BaseModal size="lg" hide-header :labelledby="ids.title" @close="emit('close')">
    <template #header>
      <header class="task-details__header">
        <div v-if="task" class="task-details__heading">
          <span class="task-details__id">#{{ task.id }}</span>
          <div v-if="editingTitle" class="task-details__title-edit">
            <label :for="`${ids.field}-title`" class="visually-hidden">Título da tarefa</label>
            <input
              :id="`${ids.field}-title`"
              ref="titleInput"
              v-model="draft.title"
              class="task-details__title-input"
              :maxlength="TITLE_MAX"
              :aria-invalid="fieldState.title === 'error'"
              :aria-describedby="fieldError.title ? `${ids.field}-title-error` : undefined"
              @keydown.enter.prevent="commitTitle"
              @keydown.esc.stop.prevent="cancelTitleEdit"
              @blur="commitTitle"
            />
            <small
              v-if="fieldError.title"
              :id="`${ids.field}-title-error`"
              class="task-details__error"
              >{{ fieldError.title }}</small
            >
          </div>
          <h2 v-else :id="ids.title" class="task-details__title">
            <button
              type="button"
              class="task-details__title-button"
              title="Clique para editar o título"
              @click="startTitleEdit"
            >
              {{ task.title }}
              <span class="visually-hidden">(editar título)</span>
            </button>
          </h2>
          <span class="task-details__status" aria-live="polite">
            <template v-if="fieldState.title === 'saving'">Salvando…</template>
            <template v-else-if="fieldState.title === 'saved'">Salvo</template>
          </span>
        </div>
        <h2 v-else :id="ids.title" class="task-details__title">Detalhes da tarefa</h2>

        <div class="task-details__actions">
          <ActionMenu
            v-if="task"
            :label="`Ações da tarefa ${task.title}`"
            :items="menuItems"
            @select="onMenu"
          />
          <button
            type="button"
            class="task-details__close"
            aria-label="Fechar"
            @click="emit('close')"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
      </header>
    </template>

    <div v-if="detail.status === 'loading'" class="task-details__state" role="status">
      <LoaderCircle class="task-details__spinner" :size="20" aria-hidden="true" />
      Carregando tarefa…
    </div>
    <div v-else-if="detail.status === 'missing'" class="task-details__state" role="alert">
      <p>{{ detail.error }}</p>
      <BaseButton variant="secondary" @click="emit('close')">Voltar ao quadro</BaseButton>
    </div>
    <div v-else-if="detail.status === 'error'" class="task-details__state" role="alert">
      <p>{{ detail.error }}</p>
      <BaseButton variant="secondary" @click="detail.open(taskId)">Tentar novamente</BaseButton>
    </div>

    <div v-else-if="task" class="task-details">
      <section class="task-details__section">
        <div class="task-details__label-row">
          <label :for="`${ids.field}-description`" class="task-details__section-title">
            Descrição
          </label>
          <span class="task-details__status" aria-live="polite">
            <template v-if="fieldState.description === 'saving'">Salvando…</template>
            <template v-else-if="fieldState.description === 'saved'">Salvo</template>
          </span>
        </div>
        <textarea
          :id="`${ids.field}-description`"
          v-model="draft.description"
          class="task-details__description"
          rows="3"
          placeholder="Adicione uma descrição…"
          :aria-invalid="fieldState.description === 'error'"
          @blur="commitDescription"
        />
        <small v-if="fieldError.description" class="task-details__error">{{
          fieldError.description
        }}</small>
      </section>

      <dl class="task-details__fields">
        <div class="task-details__row">
          <dt><label :for="`${ids.field}-column`">Status</label></dt>
          <dd>
            <select
              :id="`${ids.field}-column`"
              v-model="draft.column"
              class="task-details__control"
              :disabled="fieldState.column === 'saving'"
              @change="changeColumn"
            >
              <option v-for="option in kanban.columns" :key="option.id" :value="String(option.id)">
                {{ option.name }}
              </option>
            </select>
            <span class="task-details__status" aria-live="polite">
              <template v-if="fieldState.column === 'saving'">Salvando…</template>
              <template v-else-if="fieldState.column === 'saved'">Salvo</template>
            </span>
          </dd>
        </div>

        <div class="task-details__row">
          <dt><label :for="`${ids.field}-assignee`">Responsável</label></dt>
          <dd>
            <select
              :id="`${ids.field}-assignee`"
              v-model="draft.assignee"
              class="task-details__control"
              :aria-invalid="fieldState.assignee === 'error'"
              @change="changeAssignee"
            >
              <option value="">Sem responsável</option>
              <option
                v-for="member in kanban.members"
                :key="member.id"
                :value="String(member.user)"
              >
                {{ member.user_name || member.user_email }}
              </option>
            </select>
            <span class="task-details__status" aria-live="polite">
              <template v-if="fieldState.assignee === 'saving'">Salvando…</template>
              <template v-else-if="fieldState.assignee === 'saved'">Salvo</template>
            </span>
            <small v-if="fieldError.assignee" class="task-details__error">{{
              fieldError.assignee
            }}</small>
          </dd>
        </div>

        <div class="task-details__row">
          <dt><label :for="`${ids.field}-priority`">Prioridade</label></dt>
          <dd>
            <span
              class="task-details__priority"
              :class="`task-details__priority--${task.priority}`"
            >
              {{ priorityLabel }}
            </span>
            <select
              :id="`${ids.field}-priority`"
              v-model="draft.priority"
              class="task-details__control"
              @change="changePriority"
            >
              <option v-for="priority in PRIORITIES" :key="priority.value" :value="priority.value">
                {{ priority.label }}
              </option>
            </select>
            <span class="task-details__status" aria-live="polite">
              <template v-if="fieldState.priority === 'saving'">Salvando…</template>
              <template v-else-if="fieldState.priority === 'saved'">Salvo</template>
            </span>
          </dd>
        </div>

        <div class="task-details__row">
          <dt><label :for="`${ids.field}-due`">Prazo</label></dt>
          <dd>
            <input
              :id="`${ids.field}-due`"
              v-model="draft.due_date"
              type="date"
              class="task-details__control"
              :min="today"
              :aria-invalid="fieldState.due_date === 'error'"
              :aria-describedby="`${ids.field}-due-relative`"
              @change="changeDueDate"
            />
            <span
              :id="`${ids.field}-due-relative`"
              class="task-details__relative"
              :class="`task-details__relative--${due.tone}`"
            >
              <template v-if="!task.due_date">Sem prazo</template>
              <template v-else-if="due.relative">({{ due.relative }})</template>
              <template v-else-if="done">Concluída</template>
            </span>
            <button
              v-if="task.due_date"
              type="button"
              class="task-details__clear"
              @click="clearDueDate"
            >
              Remover prazo
            </button>
            <span class="task-details__status" aria-live="polite">
              <template v-if="fieldState.due_date === 'saving'">Salvando…</template>
              <template v-else-if="fieldState.due_date === 'saved'">Salvo</template>
            </span>
            <small v-if="fieldError.due_date" class="task-details__error">{{
              fieldError.due_date
            }}</small>
          </dd>
        </div>
      </dl>

      <TaskChecklist />
      <TaskComments />
      <TaskLinks />
    </div>

    <ConfirmDialog
      v-if="confirmDelete.open"
      title="Excluir tarefa"
      :message="`Excluir a tarefa “${task?.title}”? Checklist, comentários e links dela também serão removidos.`"
      confirm-label="Excluir tarefa"
      :busy="confirmDelete.busy"
      @confirm="deleteTask"
      @cancel="confirmDelete.open = false"
    />
  </BaseModal>
</template>

<style scoped>
.task-details__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6) 0;
}
.task-details__heading {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.task-details__id {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.task-details__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.task-details__title-button {
  margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-2));
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font: inherit;
  text-align: left;
}
.task-details__title-button:hover {
  background: var(--color-bg-hover);
}
.task-details__title-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.task-details__title-input {
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.task-details__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-1);
}
.task-details__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-10) + var(--space-1));
  height: calc(var(--space-10) + var(--space-1));
  margin-right: calc(-1 * var(--space-2));
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}
.task-details__close:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.task-details__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-secondary);
  text-align: center;
}
.task-details__spinner {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.task-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.task-details__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.task-details__label-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.task-details__section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.task-details__description {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}
.task-details__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.task-details__row {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
}
.task-details__row dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.task-details__row dd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
}
.task-details__control {
  width: auto;
  min-width: 11rem;
  max-width: 100%;
  min-height: 2.5rem;
  padding: var(--space-1) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
.task-details__control:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.task-details__control[aria-invalid='true'],
.task-details__title-input[aria-invalid='true'],
.task-details__description[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.task-details__priority {
  padding: 0.125rem var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.task-details__priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.task-details__priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}
.task-details__priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.task-details__relative {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.task-details__relative--soon {
  color: var(--color-warning);
}
.task-details__relative--late {
  color: var(--color-status-late);
  font-weight: var(--font-weight-semibold);
}
.task-details__clear {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: underline;
}
.task-details__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.task-details__error {
  flex-basis: 100%;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
@media (max-width: 599px) {
  .task-details__header {
    padding-inline: var(--space-4);
  }
  .task-details__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
  }
}
</style>
