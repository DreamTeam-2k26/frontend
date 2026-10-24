<script setup>
import { computed, onMounted } from 'vue'
import { Bot, History, Lock, RotateCw, Sparkles, TriangleAlert } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BrainstormAiThinking from './BrainstormAiThinking.vue'
import { useBrainstormTopicStore } from '@/stores/brainstormTopic'
import { formatWhen, priorityLabel } from '@/utils/brainstorm'

// Síntese da IA do ciclo atual + histórico de versões. Só mostra; nada é criado a partir daqui.
const { flags } = defineProps({
  flags: { type: Object, required: true },
})

const emit = defineEmits({ source: (id) => Number.isInteger(id) })

const store = useBrainstormTopicStore()
const status = computed(() => store.analysisStatus)
const result = computed(() => store.analysis?.result ?? null)
const replyIds = computed(() => new Set(store.replies.map((reply) => reply.id)))
const taskTitles = computed(() => new Map(store.tasks.map((task) => [task.id, task.title])))
const failure = computed(
  () =>
    store.analysisError?.message ||
    store.analysis?.error ||
    'A última tentativa de síntese falhou.',
)
const notConfigured = computed(() => store.analysisError?.code === 'ai_not_configured')
const sources = (ids) => (ids ?? []).filter((id) => replyIds.value.has(id))
const versions = computed(() => [...store.versions].reverse())

// Títulos das tarefas que a IA apontou como já existentes (para evitar duplicata).
onMounted(() => store.loadDecisionData())

function run() {
  store.analyze().catch(() => {})
}
</script>

<template>
  <section
    class="analysis"
    aria-labelledby="analysis-title"
    :aria-busy="status === 'running' || status === 'loading'"
  >
    <header class="analysis__header">
      <h2 id="analysis-title" class="analysis__title">
        <Sparkles :size="18" aria-hidden="true" /> Síntese da IA
        <span v-if="store.topic" class="analysis__cycle">versão {{ store.topic.cycle }}</span>
      </h2>
      <BaseButton
        v-if="flags.canAnalyze && ['ready', 'failed', 'none', 'error'].includes(status)"
        :variant="status === 'ready' ? 'secondary' : 'primary'"
        :loading="Boolean(store.busy.analyze)"
        @click="run"
      >
        <RotateCw v-if="status === 'ready' || status === 'failed'" :size="16" aria-hidden="true" />
        <Bot v-else :size="16" aria-hidden="true" />
        {{
          status === 'ready'
            ? 'Gerar nova síntese'
            : status === 'failed'
              ? 'Tentar novamente'
              : 'Gerar síntese com IA'
        }}
      </BaseButton>
    </header>

    <Transition name="analysis-swap" mode="out-in">
      <p v-if="status === 'loading'" class="analysis__state" role="status">Carregando a síntese…</p>

      <BrainstormAiThinking v-else-if="status === 'running'" />

      <div
        v-else-if="status === 'failed'"
        class="analysis__state analysis__state--error"
        role="alert"
      >
        <TriangleAlert :size="18" aria-hidden="true" />
        <p>{{ failure }}</p>
        <p v-if="notConfigured" class="analysis__note">
          Peça a quem cuida do servidor para configurar a IA.
        </p>
      </div>

      <div v-else-if="status === 'error'" class="analysis__state" role="alert">
        <p>Não foi possível carregar a síntese.</p>
        <BaseButton variant="secondary" @click="store.reloadHistory()">Tentar novamente</BaseButton>
      </div>

      <div v-else-if="status === 'none'" class="analysis__state">
        <Lock v-if="flags.isOpen" :size="18" aria-hidden="true" />
        <p v-if="flags.isOpen">
          A síntese fica disponível depois que o dono ou um administrador encerrar o debate.
        </p>
        <p v-else-if="flags.canAnalyze">
          O debate está encerrado. Gere a síntese para preparar a decisão.
        </p>
        <p v-else>Aguardando o dono ou um administrador pedir a síntese.</p>
      </div>

      <article v-else-if="status === 'ready' && result" class="analysis__result">
        <p class="analysis__meta">
          Gerada em
          <time :datetime="store.analysis.finished_at">{{
            formatWhen(store.analysis.finished_at)
          }}</time>
          <template v-if="store.analysis.requested_by_name">
            a pedido de {{ store.analysis.requested_by_name }}</template
          >
        </p>

        <section class="analysis__block">
          <h3>Proposta principal</h3>
          <p class="analysis__text">{{ result.main_solution }}</p>
          <p v-if="sources(result.sources).length" class="analysis__sources">
            Baseada em:
            <button
              v-for="id in sources(result.sources)"
              :key="id"
              type="button"
              class="analysis__source"
              :aria-label="`Ir para a resposta R${id}`"
              @click="emit('source', id)"
            >
              #R{{ id }}
            </button>
          </p>
        </section>

        <section v-if="result.reasoning" class="analysis__block">
          <h3>Justificativa</h3>
          <p class="analysis__text">{{ result.reasoning }}</p>
        </section>

        <section class="analysis__block">
          <h3>Alternativas</h3>
          <ul v-if="result.alternatives.length" class="analysis__list">
            <li v-for="(alternative, index) in result.alternatives" :key="index">
              <strong>{{ alternative.title || 'Alternativa' }}</strong>
              <span v-if="alternative.description"> — {{ alternative.description }}</span>
              <button
                v-for="id in sources(alternative.sources)"
                :key="id"
                type="button"
                class="analysis__source"
                :aria-label="`Ir para a resposta R${id}`"
                @click="emit('source', id)"
              >
                #R{{ id }}
              </button>
            </li>
          </ul>
          <p v-else class="analysis__empty">A IA não apontou alternativas.</p>
        </section>

        <section v-if="result.ai_additions.length" class="analysis__block analysis__block--ai">
          <h3><Bot :size="16" aria-hidden="true" /> Sugestões da IA</h3>
          <p class="analysis__note">Ideias novas da IA, que não vieram dos participantes.</p>
          <ul class="analysis__list">
            <li v-for="(addition, index) in result.ai_additions" :key="index">
              <span class="analysis__tag">Sugestão da IA</span> {{ addition }}
            </li>
          </ul>
        </section>

        <section class="analysis__block">
          <h3>Próximos passos sugeridos</h3>
          <ul v-if="result.task_suggestions.length" class="analysis__list">
            <li v-for="(suggestion, index) in result.task_suggestions" :key="index">
              <strong>{{ suggestion.title }}</strong>
              <span class="analysis__priority"
                >· prioridade {{ priorityLabel(suggestion.priority).toLowerCase() }}</span
              >
              <p v-if="suggestion.description" class="analysis__text">
                {{ suggestion.description }}
              </p>
              <p v-if="suggestion.existing_task_id" class="analysis__duplicate">
                <TriangleAlert :size="14" aria-hidden="true" />
                Já existe no Kanban: “{{
                  taskTitles.get(suggestion.existing_task_id) ||
                  `tarefa #${suggestion.existing_task_id}`
                }}”. Na decisão, prefira vincular a ela.
              </p>
            </li>
          </ul>
          <p v-else class="analysis__empty">A IA não sugeriu tarefas.</p>
          <p class="analysis__note">
            Nenhuma tarefa é criada pela síntese: o dono ou um administrador escolhe na decisão.
          </p>
        </section>
      </article>
    </Transition>

    <section v-if="versions.length" class="analysis__history" aria-labelledby="history-title">
      <h3 id="history-title"><History :size="16" aria-hidden="true" /> Histórico de versões</h3>
      <ol class="analysis__versions">
        <li v-for="item in versions" :key="item.cycle" class="analysis__version">
          <strong>Versão {{ item.cycle }}</strong>
          <span v-if="item.current" class="analysis__tag analysis__tag--current"
            >Decisão vigente</span
          >
          <span
            v-else-if="item.cycle === store.topic?.cycle && store.topic?.in_review"
            class="analysis__tag"
          >
            Em revisão
          </span>
          <span class="analysis__version-meta">
            {{ item.analyses.length }} {{ item.analyses.length === 1 ? 'análise' : 'análises' }}
            <template v-if="item.decision">
              · decidida em {{ formatWhen(item.decision.approved_at) }}</template
            >
            <template v-else> · sem decisão</template>
          </span>
          <p v-if="item.decision" class="analysis__text">{{ item.decision.text }}</p>
        </li>
      </ol>
    </section>
  </section>
</template>

<style scoped>
.analysis {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.analysis__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.analysis__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-md);
}
.analysis__cycle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
}
.analysis__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
.analysis__state--error {
  color: var(--color-danger);
  border-style: solid;
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}
.analysis__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.analysis__meta,
.analysis__note,
.analysis__empty,
.analysis__priority,
.analysis__version-meta {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.analysis__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.analysis__block h3,
.analysis__history h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.analysis__block--ai {
  border-color: var(--color-info);
  background: var(--color-info-soft);
}
.analysis__text {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.analysis__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-left: var(--space-4);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  list-style: disc;
}
.analysis__sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.analysis__source {
  min-height: 1.75rem;
  margin-left: var(--space-1);
  padding: 0 var(--space-2);
  color: var(--color-primary-hover);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}
.analysis__source:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}
.analysis__tag {
  display: inline-block;
  padding: 0 var(--space-2);
  color: var(--color-info);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border: 1px solid currentColor;
  border-radius: 999px;
}
.analysis__tag--current {
  color: var(--color-status-done);
}
.analysis__duplicate {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-warning);
  font-size: var(--font-size-xs);
}
.analysis__history {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.analysis__versions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.analysis__version {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.analysis__version .analysis__text {
  flex-basis: 100%;
  color: var(--color-text-secondary);
}

/* Troca de estado (gerando → pronta/falha) e blocos da síntese entrando em sequência. */
.analysis-swap-enter-active,
.analysis-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.analysis-swap-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}
.analysis-swap-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
.analysis__result > * {
  animation: analysis-rise 0.45s ease both;
}
.analysis__result > :nth-child(2) {
  animation-delay: 0.08s;
}
.analysis__result > :nth-child(3) {
  animation-delay: 0.16s;
}
.analysis__result > :nth-child(4) {
  animation-delay: 0.24s;
}
.analysis__result > :nth-child(5) {
  animation-delay: 0.32s;
}
.analysis__result > :nth-child(n + 6) {
  animation-delay: 0.4s;
}
.analysis__block--ai {
  animation-name: analysis-rise-ai;
}
.analysis__source {
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease;
}
.analysis__source:hover {
  transform: translateY(-1px);
}
@keyframes analysis-rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}
/* Sugestões da IA chegam com um leve brilho na borda, para se distinguir das ideias da equipe. */
@keyframes analysis-rise-ai {
  0% {
    opacity: 0;
    transform: translateY(0.75rem);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-info) 35%, transparent);
  }
  70% {
    opacity: 1;
    transform: none;
    box-shadow: 0 0 0 0.375rem color-mix(in srgb, var(--color-info) 0%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .analysis-swap-enter-active,
  .analysis-swap-leave-active {
    transition: none;
  }
  .analysis__result > *,
  .analysis__block--ai {
    animation: none;
  }
  .analysis__source:hover {
    transform: none;
  }
}
</style>
