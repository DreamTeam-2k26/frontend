<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDownUp, Lightbulb, Plus, Search, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BrainstormTopicCard from './BrainstormTopicCard.vue'
import BrainstormTopicForm from './BrainstormTopicForm.vue'
import { useBrainstormListStore } from '@/stores/brainstormList'
import { apiFieldErrors } from '@/utils/apiErrors'
import {
  CATEGORY_OPTIONS,
  ORDER_OPTIONS,
  STATUS_OPTIONS,
  listQueryToRoute,
  normalizeListQuery,
} from '@/utils/brainstorm'

// Aba "Brainstorm" do projeto: fórum de discussões. Filtros e ordenação ficam na URL (F5 e links).
const { project } = defineProps({
  project: { type: Object, required: true },
})

const route = useRoute()
const router = useRouter()
const list = useBrainstormListStore()
const searchId = useId()

const query = computed(() => normalizeListQuery(route.query))
const search = ref(query.value.search)
const creating = shallowRef(false)
const saving = shallowRef(false)
const fieldErrors = ref({})

const categoryOptions = [{ value: '', label: 'Todas as categorias' }, ...CATEGORY_OPTIONS]
const statusOptions = [{ value: '', label: 'Todos os status' }, ...STATUS_OPTIONS]
const orderButton = computed(
  () => ORDER_OPTIONS.find((item) => item.value === query.value.ordering)?.label,
)
const filtered = computed(() =>
  Boolean(query.value.search || query.value.category || query.value.status),
)
const counter = computed(() => {
  const total = list.count
  return `${total} ${total === 1 ? 'discussão' : 'discussões'}${filtered.value ? ' encontradas' : ''}`
})

function change(patch) {
  router.replace({ query: { ...route.query, ...listQueryToRoute({ ...query.value, ...patch }) } })
}

function clear() {
  search.value = ''
  change({ search: '', category: '', status: '' })
}

// Busca espera a pessoa parar de digitar antes de ir ao servidor.
let timer
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (value.trim() !== query.value.search) change({ search: value.trim() })
  }, 300)
})
watch(
  () => query.value.search,
  (value) => {
    if (value !== search.value.trim()) search.value = value
  },
)

watch(
  () => [project.id, JSON.stringify(query.value)],
  () => list.load(project.id, query.value),
  { immediate: true },
)

function openForm() {
  fieldErrors.value = {}
  creating.value = true
}

async function create(payload) {
  saving.value = true
  fieldErrors.value = {}
  try {
    const topic = await list.createTopic(payload)
    creating.value = false
    router.push({
      name: 'project-brainstorm-topic',
      params: { id: String(project.id), topicId: String(topic.id) },
    })
  } catch (cause) {
    fieldErrors.value = apiFieldErrors(cause, [
      'title',
      'category',
      'context',
      'initial_suggestion',
    ])
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(timer)
  list.reset()
})
</script>

<template>
  <section
    class="brainstorm"
    aria-labelledby="brainstorm-title"
    :aria-busy="list.status === 'loading'"
  >
    <header class="brainstorm__header">
      <div>
        <h2 id="brainstorm-title" class="brainstorm__title">
          <Lightbulb :size="20" aria-hidden="true" /> Brainstorm
        </h2>
        <p class="brainstorm__hint">
          Ideias, dúvidas e decisões da equipe. A IA só sintetiza quando o dono ou um administrador
          encerra o debate.
        </p>
      </div>
      <BaseButton @click="openForm"
        ><Plus :size="16" aria-hidden="true" /> Nova discussão</BaseButton
      >
    </header>

    <div class="brainstorm__toolbar" role="search" aria-label="Buscar e filtrar discussões">
      <label :for="searchId" class="brainstorm__search">
        <Search class="brainstorm__search-icon" :size="16" aria-hidden="true" />
        <span class="visually-hidden">Buscar discussões</span>
        <input
          :id="searchId"
          v-model="search"
          class="brainstorm__search-input"
          type="search"
          placeholder="Buscar por título ou contexto…"
          autocomplete="off"
          @keydown.esc="search = ''"
        />
      </label>
      <BaseSelect
        :model-value="query.category"
        label="Categoria"
        hide-label
        variant="toolbar"
        :options="categoryOptions"
        @change="change({ category: $event })"
      />
      <BaseSelect
        :model-value="query.status"
        label="Status"
        hide-label
        variant="toolbar"
        :options="statusOptions"
        @change="change({ status: $event })"
      />
      <BaseSelect
        :model-value="query.ordering"
        label="Ordenar"
        hide-label
        variant="toolbar"
        :icon="ArrowDownUp"
        :display="orderButton"
        :options="ORDER_OPTIONS"
        @change="change({ ordering: $event })"
      />
      <div class="brainstorm__summary">
        <p v-if="list.status === 'ready'" class="brainstorm__counter" aria-live="polite">
          {{ counter }}
        </p>
        <button v-if="filtered" type="button" class="brainstorm__clear" @click="clear">
          <X :size="14" aria-hidden="true" /> Limpar
        </button>
      </div>
    </div>

    <p v-if="list.status === 'loading'" class="brainstorm__state" role="status">
      Carregando discussões…
    </p>
    <div v-else-if="list.status === 'error'" class="brainstorm__state" role="alert">
      <p>{{ list.error }}</p>
      <BaseButton variant="secondary" @click="list.load(project.id, query)"
        >Tentar novamente</BaseButton
      >
    </div>
    <div v-else-if="!list.topics.length" class="brainstorm__state">
      <template v-if="filtered">
        <p>Nenhuma discussão encontrada com esses filtros.</p>
        <BaseButton variant="secondary" @click="clear">Limpar filtros</BaseButton>
      </template>
      <template v-else>
        <p>Nenhuma discussão ainda. Que tal abrir a primeira?</p>
        <BaseButton @click="openForm"
          ><Plus :size="16" aria-hidden="true" /> Nova discussão</BaseButton
        >
      </template>
    </div>
    <template v-else>
      <TransitionGroup tag="ul" name="topic-list" appear class="brainstorm__list">
        <li
          v-for="(topic, index) in list.topics"
          :key="topic.id"
          :style="{ '--stagger': index % 20 }"
        >
          <BrainstormTopicCard :topic="topic" :project-id="project.id" />
        </li>
      </TransitionGroup>
      <BaseButton
        v-if="list.hasMore"
        class="brainstorm__more"
        variant="secondary"
        :loading="list.loadingMore"
        @click="list.loadMore().catch(() => {})"
      >
        Carregar mais
      </BaseButton>
    </template>

    <BrainstormTopicForm
      v-if="creating"
      :saving="saving"
      :field-errors="fieldErrors"
      @submit="create"
      @close="creating = false"
    />
  </section>
</template>

<style scoped>
.brainstorm {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.brainstorm__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}
.brainstorm__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-lg);
}
.brainstorm__hint {
  margin-top: var(--space-1);
  max-width: 40rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.brainstorm__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.brainstorm__search {
  position: relative;
  display: flex;
  flex: 1 1 18rem;
  align-items: center;
  min-width: 12rem;
}
.brainstorm__search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--color-text-secondary);
  pointer-events: none;
}
.brainstorm__search-input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--space-3) 0 2.25rem;
  font-size: var(--font-size-sm);
  background: var(--color-bg-card);
}
.brainstorm__search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.brainstorm__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}
.brainstorm__counter {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.brainstorm__clear {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
}
.brainstorm__clear:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.brainstorm__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.brainstorm__more {
  align-self: center;
}
.brainstorm__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
@media (max-width: 600px) {
  .brainstorm__summary {
    margin-left: 0;
  }
}
/* Cards entram em cascata (inclusive os do "Carregar mais", reiniciando a cada página). */
.topic-list-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
  transition-delay: calc(min(var(--stagger), 8) * 45ms);
}
.topic-list-enter-from {
  opacity: 0;
  transform: translateY(0.75rem);
}
.topic-list-move {
  transition: transform 0.3s ease;
}
.brainstorm__state {
  animation: brainstorm-fade 0.3s ease both;
}
@keyframes brainstorm-fade {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .topic-list-enter-active,
  .topic-list-move {
    transition: none;
  }
  .brainstorm__state {
    animation: none;
  }
}
</style>
