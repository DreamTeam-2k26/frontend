<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Archive, ArrowLeft, Lock, Pencil, RotateCcw, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import BrainstormAnalysisPanel from '@/components/brainstorm/BrainstormAnalysisPanel.vue'
import BrainstormDecisionEditor from '@/components/brainstorm/BrainstormDecisionEditor.vue'
import BrainstormDecisionSummary from '@/components/brainstorm/BrainstormDecisionSummary.vue'
import BrainstormReplyThread from '@/components/brainstorm/BrainstormReplyThread.vue'
import BrainstormStatusBadge from '@/components/brainstorm/BrainstormStatusBadge.vue'
import BrainstormTopicForm from '@/components/brainstorm/BrainstormTopicForm.vue'
import BrainstormVoteControl from '@/components/brainstorm/BrainstormVoteControl.vue'
import { useAuthStore } from '@/stores/auth'
import { useBrainstormTopicStore } from '@/stores/brainstormTopic'
import { apiFieldErrors } from '@/utils/apiErrors'
import { categoryLabel, formatWhen, topicFlags } from '@/utils/brainstorm'

// Discussão do Brainstorm: debate, síntese da IA e decisão. Etapa na URL (?etapa=) para F5 e links.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useBrainstormTopicStore()

const STEPS = [
  { key: 'discussao', label: 'Discussão' },
  { key: 'sintese', label: 'Síntese da IA' },
  { key: 'decisao', label: 'Decisão' },
]
const step = computed(() => {
  const key = String(route.query.etapa ?? '')
  return STEPS.some((item) => item.key === key) ? key : 'discussao'
})
function selectStep(key) {
  router.replace({ query: { ...route.query, etapa: key === 'discussao' ? undefined : key } })
}
function navigateSteps(event, index) {
  const moves = { ArrowRight: 1, ArrowLeft: -1 }
  if (!(event.key in moves)) return
  event.preventDefault()
  const next = STEPS[(index + moves[event.key] + STEPS.length) % STEPS.length]
  selectStep(next.key)
  nextTick(() => document.getElementById(`step-${next.key}`)?.focus())
}

const topic = computed(() => store.topic)
const userId = computed(() => auth.user?.id ?? null)
const flags = computed(() => topicFlags(topic.value, { role: store.role, userId: userId.value }))
const projectId = computed(() => String(route.params.id))
const backTo = computed(() => ({
  name: 'project-detail',
  params: { id: projectId.value },
  query: { aba: 'brainstorm' },
}))
const currentDecision = computed(
  () => store.versions.find((item) => item.current)?.decision ?? null,
)
const errorTitle = computed(() => {
  if (store.errorStatus === 404) return 'Discussão não encontrada'
  if (store.errorStatus === 401) return 'Sessão expirada'
  if (store.errorStatus === 403) return 'Acesso negado'
  return 'Não foi possível carregar a discussão'
})

const editing = shallowRef(false)
const editErrors = ref({})
const confirm = shallowRef(null) // null | 'delete' | 'archive' | 'close'
const highlighted = shallowRef(null)

const CONFIRMS = {
  close: {
    title: 'Encerrar o debate',
    message:
      'Respostas e votos ficam fechados. Depois você pode gerar a síntese da IA e aprovar a decisão.',
    label: 'Encerrar debate',
  },
  archive: {
    title: 'Arquivar discussão',
    message:
      'A discussão fica somente leitura para sempre, com o histórico preservado. Não dá para desfazer.',
    label: 'Arquivar',
  },
  delete: {
    title: 'Excluir discussão',
    message:
      'A discussão ainda não tem interações e será apagada. Essa ação não pode ser desfeita.',
    label: 'Excluir discussão',
  },
}

function load() {
  return store.open(route.params.topicId, route.params.id)
}

watch(() => [route.params.id, route.params.topicId], load, { immediate: true })
onBeforeUnmount(() => store.reset())

async function saveEdit(payload) {
  editErrors.value = {}
  try {
    await store.updateTopic(payload)
    editing.value = false
  } catch (cause) {
    editErrors.value = apiFieldErrors(cause, ['title', 'category', 'context', 'initial_suggestion'])
  }
}

async function runConfirm() {
  const action = confirm.value
  try {
    if (action === 'delete') {
      if (await store.deleteTopic()) router.replace(backTo.value)
    } else if (action === 'archive') {
      await store.archive()
    } else if (action === 'close') {
      await store.close()
    }
  } catch {
    // Toast na store; a tela continua com o estado do servidor.
  } finally {
    confirm.value = null
  }
}

function reopen() {
  store.reopen().catch(() => {})
}

// Fonte citada pela IA: volta para a discussão, rola até a resposta e destaca.
async function goToSource(id) {
  selectStep('discussao')
  highlighted.value = id
  await nextTick()
  const element = document.getElementById(`resposta-${id}`)
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element?.focus({ preventScroll: true })
}

function approved() {
  selectStep('decisao')
}
</script>

<template>
  <section class="topic-view" :aria-busy="store.status === 'loading'" aria-labelledby="topic-title">
    <RouterLink class="topic-view__back" :to="backTo">
      <ArrowLeft :size="18" aria-hidden="true" /> Brainstorm do projeto
    </RouterLink>

    <div
      v-if="store.status === 'loading' || store.status === 'idle'"
      class="topic-view__state"
      role="status"
    >
      <h1 id="topic-title">Carregando discussão…</h1>
    </div>
    <div v-else-if="store.status !== 'ready'" class="topic-view__state" role="alert">
      <h1 id="topic-title">{{ errorTitle }}</h1>
      <p>{{ store.error }}</p>
      <BaseButton
        v-if="store.status === 'error' && store.errorStatus !== 401"
        variant="secondary"
        @click="load"
      >
        Tentar novamente
      </BaseButton>
      <BaseButton
        v-if="store.errorStatus === 401"
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
      >
        Entrar novamente
      </BaseButton>
      <BaseButton v-else variant="ghost" :to="backTo">Voltar ao Brainstorm</BaseButton>
    </div>

    <template v-else-if="topic">
      <header class="topic-view__header">
        <div class="topic-view__badges">
          <span class="topic-view__category">{{ categoryLabel(topic.category) }}</span>
          <BrainstormStatusBadge :status="topic.status" :in-review="topic.in_review" />
          <span class="topic-view__cycle">versão {{ topic.cycle }}</span>
        </div>
        <h1 id="topic-title" class="topic-view__title">{{ topic.title }}</h1>
        <p class="topic-view__meta">
          Aberta por {{ topic.author_name || 'usuário removido' }} em
          <time :datetime="topic.created_at">{{ formatWhen(topic.created_at) }}</time>
          <template v-if="topic.closed_at">
            · encerrada em
            <time :datetime="topic.closed_at">{{ formatWhen(topic.closed_at) }}</time>
          </template>
          <template v-if="topic.archived_at">
            · arquivada em
            <time :datetime="topic.archived_at">{{ formatWhen(topic.archived_at) }}</time>
          </template>
        </p>

        <div class="topic-view__toolbar">
          <BrainstormVoteControl
            :score="topic.score"
            :my-vote="topic.my_vote"
            :disabled="!flags.canVote"
            :busy="Boolean(store.busy['vote-topic'])"
            label="discussão"
            @vote="store.voteTopic($event).catch(() => {})"
          />
          <div class="topic-view__actions">
            <BaseButton v-if="flags.canEdit" variant="ghost" @click="editing = true">
              <Pencil :size="15" aria-hidden="true" /> Editar
            </BaseButton>
            <BaseButton
              v-if="flags.canClose"
              variant="secondary"
              :loading="Boolean(store.busy.close)"
              @click="confirm = 'close'"
            >
              <Lock :size="15" aria-hidden="true" /> Encerrar debate
            </BaseButton>
            <BaseButton
              v-if="flags.canReopen"
              variant="secondary"
              :loading="Boolean(store.busy.reopen)"
              @click="reopen"
            >
              <RotateCcw :size="15" aria-hidden="true" /> Reabrir
            </BaseButton>
            <BaseButton v-if="flags.canDelete" variant="ghost" @click="confirm = 'delete'">
              <Trash2 :size="15" aria-hidden="true" /> Excluir
            </BaseButton>
            <BaseButton
              v-else-if="flags.canArchive"
              variant="ghost"
              :loading="Boolean(store.busy.archive)"
              @click="confirm = 'archive'"
            >
              <Archive :size="15" aria-hidden="true" /> Arquivar
            </BaseButton>
          </div>
        </div>
      </header>

      <div class="topic-view__steps" role="tablist" aria-label="Etapas da discussão">
        <button
          v-for="(item, index) in STEPS"
          :id="`step-${item.key}`"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="step === item.key"
          :aria-controls="`step-panel-${item.key}`"
          :tabindex="step === item.key ? 0 : -1"
          :class="{ 'is-active': step === item.key }"
          @click="selectStep(item.key)"
          @keydown="navigateSteps($event, index)"
        >
          {{ item.label }}
        </button>
      </div>

      <div
        :id="`step-panel-${step}`"
        class="topic-view__panel"
        role="tabpanel"
        :aria-labelledby="`step-${step}`"
      >
        <template v-if="step === 'discussao'">
          <article class="topic-view__body">
            <h2 class="topic-view__section-title">Contexto e objetivo</h2>
            <p class="topic-view__text">{{ topic.context }}</p>
            <template v-if="topic.initial_suggestion">
              <h2 class="topic-view__section-title">Sugestão inicial</h2>
              <p class="topic-view__text">{{ topic.initial_suggestion }}</p>
            </template>
          </article>
          <BrainstormReplyThread :flags="flags" :user-id="userId" :highlighted="highlighted" />
        </template>

        <BrainstormAnalysisPanel
          v-else-if="step === 'sintese'"
          :flags="flags"
          @source="goToSource"
        />

        <div v-else class="topic-view__decision">
          <BrainstormDecisionSummary
            v-if="currentDecision"
            :decision="currentDecision"
            :project-id="projectId"
            :in-review="topic.in_review"
          />
          <BrainstormDecisionEditor
            v-if="flags.canApprove && store.analysisStatus === 'ready'"
            :key="store.analysis?.id"
            @approved="approved"
          />
          <p v-else-if="flags.canApprove" class="topic-view__note">
            Gere a síntese da IA (etapa “Síntese da IA”) para revisar e aprovar a decisão.
          </p>
          <p v-else-if="flags.isManager && flags.isOpen" class="topic-view__note">
            Encerre o debate e gere a síntese para preparar a decisão.
          </p>
          <p v-else-if="!flags.isManager && !currentDecision" class="topic-view__note">
            Ainda não há decisão aprovada. Só o dono ou um administrador revisa e aprova.
          </p>
          <p v-else-if="!currentDecision" class="topic-view__note">
            Ainda não há decisão aprovada.
          </p>
        </div>
      </div>

      <BrainstormTopicForm
        v-if="editing"
        :topic="topic"
        :saving="Boolean(store.busy.update)"
        :field-errors="editErrors"
        @submit="saveEdit"
        @close="editing = false"
      />
      <ConfirmDialog
        v-if="confirm"
        :title="CONFIRMS[confirm].title"
        :message="CONFIRMS[confirm].message"
        :confirm-label="CONFIRMS[confirm].label"
        :busy="Boolean(store.busy[confirm])"
        @confirm="runConfirm"
        @cancel="confirm = null"
      />
    </template>
  </section>
</template>

<style scoped>
.topic-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 64rem;
  padding: var(--space-8) var(--space-6);
}
.topic-view__back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  min-height: 2.75rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.topic-view__back:hover {
  color: var(--color-primary-hover);
}
.topic-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.topic-view__state h1 {
  font-size: var(--font-size-xl);
}
.topic-view__state p {
  color: var(--color-text-secondary);
}
.topic-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.topic-view__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.topic-view__category,
.topic-view__cycle {
  padding: 0.125rem var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
}
.topic-view__title {
  font-size: var(--font-size-xl);
  overflow-wrap: anywhere;
}
.topic-view__meta {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.topic-view__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.topic-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.topic-view__steps {
  display: flex;
  gap: var(--space-1);
  box-shadow: inset 0 -1px 0 var(--color-border);
  overflow-x: auto;
  overflow-y: hidden;
}
.topic-view__steps button {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}
.topic-view__steps button:hover {
  color: var(--color-text);
}
.topic-view__steps button.is-active {
  color: var(--color-primary-hover);
  border-bottom-color: var(--color-primary);
}
.topic-view__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.topic-view__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.topic-view__section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.topic-view__text {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.topic-view__text + .topic-view__section-title {
  margin-top: var(--space-3);
}
.topic-view__decision {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.topic-view__note {
  padding: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
@media (max-width: 700px) {
  .topic-view {
    padding: var(--space-5) var(--space-4);
  }
  .topic-view__toolbar {
    align-items: flex-start;
  }
}
</style>
