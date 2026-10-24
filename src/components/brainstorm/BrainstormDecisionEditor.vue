<script setup>
import { computed, nextTick, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { CheckCheck, Plus, SquareMinus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BrainstormTaskCard from './BrainstormTaskCard.vue'
import { useForm } from '@/composables/useForm'
import { useBrainstormTopicStore } from '@/stores/brainstormTopic'
import {
  allSelected,
  approvalPayload,
  cardsFromAnalysis,
  priorityLabel,
  setAllSelected,
} from '@/utils/brainstorm'
import { required } from '@/utils/validators'

// Revisão humana (dono/admin): texto final, justificativa e escolha card a card. Um único POST approve/.
const emit = defineEmits({ approved: (decision) => Boolean(decision?.id) })

const store = useBrainstormTopicStore()
const formId = useId()
const form = useTemplateRef('form')
const analysis = computed(() => store.analysis)
const cards = ref([])
const cardErrors = ref({})
const generalError = shallowRef('')
const confirming = shallowRef(false)
let manualKey = 0

// Tarefas e participantes reais do projeto (vincular existente e responsável).
onMounted(() => store.loadDecisionData())

const { values, errors, validateField, handleSubmit } = useForm(
  { text: '', justification: '' },
  { text: [required('Escreva o texto da decisão.')] },
)

// Nova análise (ou outra versão) recomeça a revisão a partir das sugestões dela.
watch(
  () => analysis.value?.id,
  () => {
    cards.value = cardsFromAnalysis(analysis.value?.result)
    values.text = analysis.value?.result?.main_solution ?? ''
    values.justification = analysis.value?.result?.reasoning ?? ''
    cardErrors.value = {}
    generalError.value = ''
  },
  { immediate: true },
)

const selected = computed(() => cards.value.filter((card) => card.selected))
const everySelected = computed(() => allSelected(cards.value))

// Marca (ou desmarca) todos os cards de uma vez; o modo e os campos de cada um continuam como estão.
function toggleAll() {
  setAllSelected(cards.value, !everySelected.value)
}
const incomplete = computed(() =>
  selected.value.some((card) => (card.mode === 'new' ? !card.title.trim() : !card.existingTaskId)),
)
const tasksById = computed(() => new Map(store.tasks.map((task) => [task.id, task])))
const busy = computed(() => Boolean(store.busy.approve))

function update(card, patch) {
  Object.assign(card, patch)
  if (cardErrors.value[card.key]) cardErrors.value = { ...cardErrors.value, [card.key]: '' }
}

function addManual() {
  cards.value.push({
    key: `m${++manualKey}`,
    suggestionIndex: null,
    selected: true,
    mode: 'new',
    existingTaskId: null,
    title: '',
    description: '',
    priority: 'medium',
    assignee: null,
    dueDate: '',
    sources: [],
  })
}

const review = handleSubmit(() => {
  if (incomplete.value) {
    generalError.value = 'Complete o título (ou a tarefa vinculada) dos cards selecionados.'
    return
  }
  generalError.value = ''
  confirming.value = true
})

function openReview() {
  review()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}

// Erros do backend: { tasks: { "<posição entre os selecionados>": {...} } } ou mensagens gerais.
function showErrors(cause) {
  const data = cause?.response?.data ?? {}
  const next = {}
  // Por item: objeto { "1": {...} } (criação da tarefa) ou lista [{}, {...}] (validação dos campos).
  if (data.tasks && typeof data.tasks === 'object') {
    for (const [position, detail] of Object.entries(data.tasks)) {
      if (!detail || typeof detail !== 'object') continue
      const message = Object.values(detail)
        .flat()
        .find((item) => typeof item === 'string')
      const card = selected.value[Number(position)]
      if (card && message) next[card.key] = message
    }
  }
  cardErrors.value = next
  const flat = [data.detail, data.text, data.analysis, data.non_field_errors, data.tasks]
    .flat()
    .find((item) => typeof item === 'string')
  generalError.value = flat || (Object.keys(next).length ? 'Revise as tarefas marcadas.' : '')
}

async function confirm() {
  const body = approvalPayload({
    analysisId: analysis.value.id,
    text: values.text,
    justification: values.justification,
    cards: cards.value,
  })
  try {
    const decision = await store.approve(body)
    confirming.value = false
    if (decision) emit('approved', decision)
  } catch (cause) {
    confirming.value = false
    showErrors(cause)
  }
}

const describe = (card) =>
  card.mode === 'existing'
    ? `Vincular à tarefa existente “${tasksById.value.get(card.existingTaskId)?.title ?? `#${card.existingTaskId}`}”`
    : `Criar “${card.title.trim()}” · prioridade ${priorityLabel(card.priority).toLowerCase()}`
</script>

<template>
  <section class="editor" aria-labelledby="editor-title">
    <h3 id="editor-title" class="editor__title">Revisar e aprovar a decisão</h3>
    <p class="editor__hint">
      Edite o texto, escolha as tarefas e confirme. Nada vai para o Kanban sem a sua aprovação.
    </p>

    <form :id="formId" ref="form" class="editor__form" novalidate @submit.prevent="openReview">
      <div class="editor__field">
        <label :for="`${formId}-text`" class="editor__label">Texto da decisão</label>
        <textarea
          :id="`${formId}-text`"
          v-model="values.text"
          rows="4"
          class="editor__textarea"
          required
          :disabled="busy"
          :aria-invalid="Boolean(errors.text)"
          @blur="validateField('text')"
        />
        <small v-if="errors.text" class="editor__error">{{ errors.text }}</small>
      </div>
      <div class="editor__field">
        <label :for="`${formId}-justification`" class="editor__label"
          >Justificativa (opcional)</label
        >
        <textarea
          :id="`${formId}-justification`"
          v-model="values.justification"
          rows="3"
          class="editor__textarea"
          :disabled="busy"
        />
      </div>

      <div class="editor__cards-head">
        <h4 aria-live="polite">
          Tarefas ({{ selected.length }} de {{ cards.length }} selecionadas)
        </h4>
        <div class="editor__cards-actions">
          <BaseButton
            v-if="cards.length"
            variant="ghost"
            :disabled="busy"
            :aria-pressed="everySelected"
            @click="toggleAll"
          >
            <SquareMinus v-if="everySelected" :size="15" aria-hidden="true" />
            <CheckCheck v-else :size="15" aria-hidden="true" />
            {{ everySelected ? 'Desmarcar todas' : 'Selecionar todas' }}
          </BaseButton>
          <BaseButton variant="secondary" :disabled="busy" @click="addManual">
            <Plus :size="15" aria-hidden="true" /> Adicionar tarefa
          </BaseButton>
        </div>
      </div>
      <p v-if="store.decisionData === 'loading'" class="editor__hint" role="status">
        Carregando tarefas e participantes do projeto…
      </p>
      <TransitionGroup v-if="cards.length" tag="ul" name="editor-card" class="editor__cards">
        <BrainstormTaskCard
          v-for="card in cards"
          :key="card.key"
          :card="card"
          :tasks="store.tasks"
          :members="store.members"
          :disabled="busy"
          :error="cardErrors[card.key] || ''"
          @update="update(card, $event)"
        />
      </TransitionGroup>
      <p v-else class="editor__hint">
        A IA não sugeriu tarefas. Você pode aprovar só o texto ou adicionar uma.
      </p>

      <p v-if="generalError" class="editor__alert" role="alert">{{ generalError }}</p>
      <div class="editor__actions">
        <BaseButton type="submit" :loading="busy">Revisar e aprovar</BaseButton>
      </div>
    </form>

    <BaseModal
      v-if="confirming"
      title="Confirmar decisão"
      size="md"
      @close="!busy && (confirming = false)"
    >
      <div class="editor__review">
        <p class="editor__review-text">{{ values.text.trim() }}</p>
        <p v-if="!selected.length" class="editor__hint">
          Nenhuma tarefa marcada: será aprovado só o texto.
        </p>
        <ul v-else class="editor__review-list">
          <li v-for="card in selected" :key="card.key">{{ describe(card) }}</li>
        </ul>
        <p class="editor__hint">Esta versão fica registrada e não pode ser editada depois.</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="busy" @click="confirming = false">Voltar</BaseButton>
        <BaseButton :loading="busy" @click="confirm">Aprovar decisão</BaseButton>
      </template>
    </BaseModal>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.editor__title {
  font-size: var(--font-size-md);
}
.editor__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.editor__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.editor__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.editor__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.editor__textarea {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  resize: vertical;
}
.editor__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.editor__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.editor__cards-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.editor__cards-head h4 {
  font-size: var(--font-size-sm);
}
.editor__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.editor__alert {
  padding: var(--space-2) var(--space-3);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
}
.editor__actions {
  display: flex;
  justify-content: flex-end;
}
.editor__review {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.editor__review-text {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
}
.editor__review-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-4);
  font-size: var(--font-size-sm);
  list-style: disc;
}
.editor__cards-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
/* Card novo entra deslizando; os outros se acomodam. */
.editor-card-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.editor-card-enter-from {
  opacity: 0;
  transform: translateY(-0.5rem) scale(0.98);
}
.editor-card-move {
  transition: transform 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
  .editor-card-enter-active,
  .editor-card-move {
    transition: none;
  }
}
</style>
