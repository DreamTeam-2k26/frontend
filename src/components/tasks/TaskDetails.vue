<script setup>
import { computed, nextTick, reactive, ref, useId, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Copy, ExternalLink, Hash, Link, LoaderCircle, Trash2, UserRound, X } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import TaskGoogleCalendar from '@/components/calendar/TaskGoogleCalendar.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import TaskChecklist from '@/components/tasks/TaskChecklist.vue'
import TaskComments from '@/components/tasks/TaskComments.vue'
import TaskFiles from '@/components/tasks/TaskFiles.vue'
import TaskLinks from '@/components/tasks/TaskLinks.vue'
import { useTaskLink } from '@/composables/useTaskLink'
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

// Contêiner do painel: coordena a store do quadro (card) e a da tarefa aberta.
const kanban = useKanbanStore()
const detail = useTaskDetailStore()
const route = useRoute()
const router = useRouter()
const { copyLink, copyId, openInNewTab } = useTaskLink()

const ids = { title: useId(), field: useId() }
const drawer = useTemplateRef('drawer')
const titleInput = ref(null)
const descriptionInput = ref(null)
const editingTitle = ref(false)
const editingDescription = ref(false)
const confirmDelete = reactive({ open: false, busy: false })

// Rascunho por campo: em erro, o valor digitado continua na tela.
const draft = reactive({ title: '', description: '', column: null, assignee: null, priority: '' })
// idle | saving | saved | error
const fieldState = reactive({})
const fieldError = reactive({})

const task = computed(() => detail.task)
const column = computed(() => kanban.columnsById.get(task.value?.column))
const done = computed(() => column.value?.category === 'done')
const due = computed(() => dueInfo(task.value?.due_date, today, done.value))
const columnOptions = computed(() =>
  kanban.columns.map((option) => ({ value: option.id, label: option.name, dot: option.category })),
)
const priorityOptions = PRIORITIES.map((priority) => ({ ...priority, dot: priority.value }))
const assigneeOptions = computed(() => [
  { value: null, label: 'Sem responsável', icon: UserRound },
  ...kanban.members.map((member) => ({
    value: member.user,
    label: member.user_name || member.user_email,
    avatar: { name: member.user_name || member.user_email, src: '' },
  })),
])

const menuItems = [
  { id: 'open-tab', label: 'Abrir em nova aba', icon: ExternalLink },
  { id: 'copy-link', label: 'Copiar link', icon: Link },
  { id: 'copy-id', label: 'Copiar ID', icon: Hash },
  { id: 'duplicate', label: 'Duplicar tarefa', icon: Copy },
  { id: 'sep', separator: true },
  { id: 'delete', label: 'Excluir tarefa', icon: Trash2, danger: true },
]

function resetDraft(data) {
  Object.assign(draft, {
    title: data.title,
    description: data.description ?? '',
    column: data.column,
    assignee: data.assignee ?? null,
    priority: data.priority,
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
    editingDescription.value = false
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
  }, 1800)
}

// PATCH só com o campo alterado (o backend valida o prazo apenas quando ele muda).
async function saveField(field, value) {
  const id = taskId
  fieldState[field] = 'saving'
  fieldError[field] = ''
  try {
    const data = await kanban.updateTaskFields(id, { [field]: value })
    if (id !== taskId) return false
    detail.setTask(data)
    markSaved(field)
    return true
  } catch (cause) {
    if (id !== taskId) return false
    fieldState[field] = 'error'
    fieldError[field] = apiFieldErrors(cause, [field])[field] ?? ''
    return false
  }
}

// Título: clique para editar, Enter/sair salva, Esc cancela.

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
  if (!title || title.length > TITLE_MAX) {
    fieldState.title = 'error'
    fieldError.title = !title
      ? 'Dê um título para a tarefa.'
      : `Use no máximo ${TITLE_MAX} caracteres.`
    return
  }
  if (title === task.value.title) {
    editingTitle.value = false
    return
  }
  if (await saveField('title', title)) editingTitle.value = false
}

// Descrição: texto que vira campo ao clicar; salva ao sair, Esc descarta.

async function startDescriptionEdit() {
  draft.description = task.value.description ?? ''
  editingDescription.value = true
  await nextTick()
  descriptionInput.value?.focus()
}

async function commitDescription() {
  if (!editingDescription.value) return
  const description = draft.description.trim()
  if (description === (task.value.description ?? '')) {
    editingDescription.value = false
    return
  }
  if (await saveField('description', description)) editingDescription.value = false
}

function cancelDescription() {
  draft.description = task.value.description ?? ''
  editingDescription.value = false
}

// Status = coluna: mesmo endpoint do arrasto, indo para o fim da coluna escolhida.
async function changeColumn(columnId) {
  const id = taskId
  const target = (kanban.tasksByColumn.get(columnId) ?? []).filter((item) => item.id !== id)
  fieldState.column = 'saving'
  try {
    await kanban.moveTask(id, columnId, target.length)
    if (id !== taskId) return
    const moved = kanban.tasks.find((item) => item.id === id)
    detail.setTask({ ...moved, column_name: kanban.columnsById.get(columnId)?.name })
    markSaved('column')
  } catch {
    if (id !== taskId) return
    fieldState.column = 'error'
    draft.column = task.value.column
  }
}

function changeDueDate(value) {
  const next = value || null
  if (next !== (task.value.due_date ?? null)) saveField('due_date', next)
}

// Menu ⋯

async function duplicate() {
  const source = task.value
  try {
    const copy = await kanban.createTask({
      title: `${source.title} (cópia)`.slice(0, TITLE_MAX),
      description: source.description ?? '',
      column: source.column,
      priority: source.priority,
      assignee: source.assignee ?? null,
      // Prazo vencido não pode ser gravado de novo: a cópia fica sem prazo.
      due_date: source.due_date && source.due_date >= today ? source.due_date : null,
    })
    router.push({ query: { ...route.query, task: String(copy.id) } })
  } catch {
    // Toast exibido pela store.
  }
}

function onMenu(action) {
  if (action === 'open-tab') openInNewTab(taskId)
  else if (action === 'copy-link') copyLink(taskId)
  else if (action === 'copy-id') copyId(taskId)
  else if (action === 'duplicate') duplicate()
  else if (action === 'delete') confirmDelete.open = true
}

async function deleteTask() {
  confirmDelete.busy = true
  try {
    await kanban.deleteTask(taskId)
    confirmDelete.open = false
    emit('close')
  } catch {
    // Toast exibido pela store; o painel continua aberto.
  } finally {
    confirmDelete.busy = false
  }
}

const statusText = (field) => ({ saving: 'Salvando…', saved: 'Salvo' })[fieldState[field]] ?? ''
</script>

<template>
  <BaseDrawer ref="drawer" :labelledby="ids.title" @close="emit('close')">
    <header class="details__bar">
      <span class="details__crumb">{{ column?.name ?? 'Tarefa' }}</span>
      <div class="details__bar-actions">
        <button
          v-if="task"
          type="button"
          class="details__icon-button"
          aria-label="Copiar link da tarefa"
          title="Copiar link"
          @click="copyLink(taskId)"
        >
          <Link :size="17" aria-hidden="true" />
        </button>
        <ActionMenu
          v-if="task"
          :label="`Mais ações da tarefa ${task.title}`"
          :items="menuItems"
          @select="onMenu"
        />
        <button
          type="button"
          class="details__icon-button"
          aria-label="Fechar"
          @click="drawer?.close()"
        >
          <X :size="19" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="details__scroll">
      <div v-if="detail.status === 'loading'" class="details__state" role="status">
        <LoaderCircle class="details__spinner" :size="20" aria-hidden="true" />
        Carregando tarefa…
      </div>
      <div v-else-if="detail.status === 'missing'" class="details__state" role="alert">
        <h2 :id="ids.title">Tarefa não encontrada</h2>
        <p>{{ detail.error }}</p>
        <BaseButton variant="secondary" @click="drawer?.close()">Voltar ao quadro</BaseButton>
      </div>
      <div v-else-if="detail.status === 'error'" class="details__state" role="alert">
        <h2 :id="ids.title">Não foi possível abrir a tarefa</h2>
        <p>{{ detail.error }}</p>
        <BaseButton variant="secondary" @click="detail.open(taskId)">Tentar novamente</BaseButton>
      </div>

      <article v-else-if="task" class="details">
        <div class="details__heading">
          <div v-if="editingTitle" class="details__title-edit">
            <label :for="`${ids.field}-title`" class="visually-hidden">Título da tarefa</label>
            <textarea
              :id="`${ids.field}-title`"
              ref="titleInput"
              v-model="draft.title"
              class="details__title-input"
              rows="2"
              :maxlength="TITLE_MAX"
              :aria-invalid="fieldState.title === 'error'"
              @keydown.enter.prevent="commitTitle"
              @keydown.esc.stop.prevent="cancelTitleEdit"
              @blur="commitTitle"
            />
            <small v-if="fieldError.title" class="details__error">{{ fieldError.title }}</small>
          </div>
          <h2 v-else :id="ids.title" class="details__title">
            <button
              type="button"
              class="details__title-button"
              title="Editar título"
              @click="startTitleEdit"
            >
              {{ task.title }}
            </button>
          </h2>
          <p class="details__id">
            #{{ task.id }}
            <span class="details__status" aria-live="polite">{{ statusText('title') }}</span>
          </p>
        </div>

        <div class="details__description">
          <template v-if="editingDescription">
            <label :for="`${ids.field}-description`" class="visually-hidden">Descrição</label>
            <textarea
              :id="`${ids.field}-description`"
              ref="descriptionInput"
              v-model="draft.description"
              class="details__description-input"
              rows="4"
              placeholder="Adicione uma descrição…"
              @keydown.esc.stop.prevent="cancelDescription"
              @blur="commitDescription"
            />
            <small v-if="fieldError.description" class="details__error">{{
              fieldError.description
            }}</small>
          </template>
          <button
            v-else
            type="button"
            class="details__description-text"
            :class="{ 'details__description-text--empty': !task.description }"
            @click="startDescriptionEdit"
          >
            {{ task.description || 'Adicionar descrição…' }}
            <span class="visually-hidden">(editar descrição)</span>
          </button>
          <span class="details__status" aria-live="polite">{{ statusText('description') }}</span>
        </div>

        <dl class="details__props">
          <div class="details__prop">
            <dt>Status</dt>
            <dd>
              <BaseSelect
                v-model="draft.column"
                label="Status"
                hide-label
                variant="ghost"
                :options="columnOptions"
                :disabled="fieldState.column === 'saving'"
                @change="changeColumn"
              />
              <span class="details__status" aria-live="polite">{{ statusText('column') }}</span>
            </dd>
          </div>
          <div class="details__prop">
            <dt>Responsável</dt>
            <dd>
              <BaseSelect
                v-model="draft.assignee"
                label="Responsável"
                hide-label
                variant="ghost"
                :options="assigneeOptions"
                :invalid="fieldState.assignee === 'error'"
                @change="saveField('assignee', $event)"
              />
              <span class="details__status" aria-live="polite">{{ statusText('assignee') }}</span>
              <small v-if="fieldError.assignee" class="details__error">{{
                fieldError.assignee
              }}</small>
            </dd>
          </div>
          <div class="details__prop">
            <dt>Prioridade</dt>
            <dd>
              <BaseSelect
                v-model="draft.priority"
                label="Prioridade"
                hide-label
                variant="ghost"
                :options="priorityOptions"
                @change="saveField('priority', $event)"
              />
              <span class="details__status" aria-live="polite">{{ statusText('priority') }}</span>
            </dd>
          </div>
          <div class="details__prop">
            <dt>Prazo</dt>
            <dd class="details__due">
              <BaseDatePicker
                :model-value="task.due_date || ''"
                label="Prazo"
                hide-label
                :min="today"
                :disabled="fieldState.due_date === 'saving'"
                :error="fieldError.due_date || ''"
                @change="changeDueDate"
              />
              <span
                v-if="due.relative"
                class="details__relative"
                :class="`details__relative--${due.tone}`"
              >
                ({{ due.relative }})
              </span>
              <span class="details__status" aria-live="polite">{{ statusText('due_date') }}</span>
              <TaskGoogleCalendar
                v-if="task.due_date"
                :task="task"
                :project-id="route.params.id"
                :project-name="kanban.project?.name || ''"
              />
            </dd>
          </div>
        </dl>

        <TaskChecklist class="details__section" />
        <TaskComments class="details__section" />
        <TaskFiles class="details__section" />
        <TaskLinks class="details__section" />
      </article>
    </div>

    <ConfirmDialog
      v-if="confirmDelete.open"
      title="Excluir tarefa"
      :message="`Excluir “${task?.title}”? Checklist, comentários e links dela também serão removidos; os arquivos continuam no projeto.`"
      confirm-label="Excluir tarefa"
      :busy="confirmDelete.busy"
      @confirm="deleteTask"
      @cancel="confirmDelete.open = false"
    />
  </BaseDrawer>
</template>

<style scoped>
.details__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 3.5rem;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}
.details__crumb {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.details__bar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.details__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}
.details__icon-button:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.details__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.details__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  color: var(--color-text-secondary);
  text-align: center;
}
.details__state h2 {
  color: var(--color-text);
  font-size: var(--font-size-lg);
}
.details__spinner {
  animation: details-spin 0.8s linear infinite;
}
.details {
  display: flex;
  flex-direction: column;
  padding: var(--space-5) var(--space-6) var(--space-8);
}
.details__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.details__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: -0.015em;
}
.details__title-button {
  margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-2));
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font: inherit;
  letter-spacing: inherit;
  text-align: left;
  overflow-wrap: anywhere;
  border-radius: var(--radius-sm);
}
.details__title-button:hover {
  background: var(--color-bg-hover);
}
.details__title-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.details__title-input {
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  resize: none;
  border-color: var(--color-primary);
}
.details__title-input:focus,
.details__description-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.details__id {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}
.details__description {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-4);
}
.details__description-text {
  margin: 0 calc(-1 * var(--space-2));
  padding: var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-radius: var(--radius-sm);
}
.details__description-text:hover {
  background: var(--color-bg-hover);
}
.details__description-text--empty {
  color: var(--color-text-secondary);
}
.details__description-input {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  border-color: var(--color-primary);
}
.details__props {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-5);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.details__prop {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  align-items: center;
  min-height: 2.5rem;
}
.details__prop dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.details__prop dd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  min-width: 0;
}
.details__due {
  position: relative;
}
.details__due :deep(.google-calendar-link) {
  flex-basis: 100%;
}
.details__relative {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.details__relative--soon {
  color: var(--color-warning);
}
.details__relative--late {
  color: var(--color-status-late);
  font-weight: var(--font-weight-semibold);
}
.details__muted {
  color: var(--color-text-secondary);
}
.details__status {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.details__error {
  flex-basis: 100%;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.details__section {
  padding-block: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.details__section:last-child {
  border-bottom: 0;
}
@keyframes details-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 599px) {
  .details,
  .details__bar {
    padding-inline: var(--space-4);
  }
}
</style>
