<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getProject } from '@/api/projects'
import { projectError } from '@/components/projects/projectState'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProjectHeader from '@/components/projects/ProjectHeader.vue'
import ProjectOverview from '@/components/projects/ProjectOverview.vue'
import ProjectMembers from '@/components/projects/ProjectMembers.vue'
import ProjectChat from '@/components/projects/ProjectChat.vue'
import ProjectFolders from '@/views/ProjectFoldersView.vue'
import ProjectActivities from '@/components/activities/ProjectActivities.vue'
import ProjectCalls from '@/features/calls/components/ProjectCalls.vue'
import ProjectLinks from '@/components/links/ProjectLinks.vue'
import { useCallNotifier } from '@/features/calls/stores/callNotifier'
import { useProjectOverviewStore } from '@/stores/projectOverview'

const route = useRoute()
const callNotifier = useCallNotifier()
const overview = useProjectOverviewStore()
const router = useRouter()
const TABS = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'membros', label: 'Membros' },
  { key: 'conversa', label: 'Conversa' },
  { key: 'pastas', label: 'Pastas do Projeto' },
  { key: 'links', label: 'Links de apoio' },
  { key: 'reunioes', label: 'Reuniões' },
  { key: 'atividades', label: 'Registros recentes' },
]
const tab = computed(() => {
  const key = String(route.query.aba ?? '')
  return TABS.some((item) => item.key === key) ? key : 'geral'
})
function selectTab(key) {
  router.replace({ query: { ...route.query, aba: key === 'geral' ? undefined : key } })
}
function navigateTab(event, index) {
  let next
  if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = TABS.length - 1
  else return
  event.preventDefault()
  selectTab(TABS[next].key)
  document.getElementById(`tab-${TABS[next].key}`)?.focus()
}
const project = ref(null)
const loading = ref(true)
const error = ref('')
const status = ref(null)
const errorTitle = computed(() => {
  if (status.value === 404) return 'Projeto não encontrado'
  if (status.value === 403) return 'Acesso negado'
  if (status.value === 401) return 'Sessão expirada'
  return 'Não foi possível carregar o projeto'
})
let request = 0
let controller

async function load() {
  const current = ++request
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  project.value = null
  overview.reset()
  error.value = ''
  status.value = null
  const id = String(route.params.id ?? '')
  if (!/^\d+$/.test(id)) {
    status.value = 404
    error.value = 'Confira o endereço ou volte para Meus Projetos.'
    loading.value = false
    return
  }
  try {
    const data = await getProject(id, { signal: controller.signal })
    if (current === request) {
      project.value = data
      loading.value = false
      // Indicadores, entregas e participantes carregam (e falham) separadamente na store.
      overview.load(id)
    }
  } catch (cause) {
    if (current !== request) return
    status.value = cause.response?.status
    error.value =
      status.value === 404
        ? 'O projeto não existe ou não está disponível para sua conta.'
        : projectError(cause)
  } finally {
    if (current === request) loading.value = false
  }
}

// Membros mudaram ou a pessoa voltou para a aba: atualiza os números sem limpar a tela.
function reloadOverview() {
  if (project.value) overview.refresh()
}

watch(tab, (current, previous) => {
  if (current === 'geral' && previous !== 'geral') reloadOverview()
})

watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => {
  request++
  controller?.abort()
  overview.reset()
})
</script>

<template>
  <section
    class="project-detail"
    :aria-busy="loading"
    :aria-labelledby="project ? 'project-title' : 'project-state-title'"
  >
    <RouterLink class="project-detail__back" :to="{ name: 'projects' }">
      <ArrowLeft :size="18" aria-hidden="true" /> Meus Projetos
    </RouterLink>
    <div v-if="loading" class="project-detail__state" role="status">
      <h1 id="project-state-title">Carregando projeto…</h1>
      <p>Buscando as informações do projeto.</p>
    </div>
    <div v-else-if="error" class="project-detail__state" role="alert">
      <h1 id="project-state-title">{{ errorTitle }}</h1>
      <p>{{ error }}</p>
      <BaseButton v-if="![401, 403, 404].includes(status)" variant="secondary" @click="load"
        >Tentar novamente</BaseButton
      >
      <BaseButton v-if="status === 401" :to="{ name: 'login', query: { redirect: route.fullPath } }"
        >Entrar novamente</BaseButton
      >
    </div>
    <template v-else-if="project">
      <ProjectHeader :project="project" />
      <div class="project-detail__tabs" role="tablist" aria-label="Seções do projeto">
        <button
          v-for="(item, index) in TABS"
          :id="`tab-${item.key}`"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="tab === item.key"
          :tabindex="tab === item.key ? 0 : -1"
          :aria-controls="`panel-${item.key}`"
          :class="{ 'is-active': tab === item.key }"
          @click="selectTab(item.key)"
          @keydown="navigateTab($event, index)"
        >
          {{ item.label }}
          <span
            v-if="item.key === 'reunioes' && callNotifier.liveFor(project.id)"
            class="project-detail__live"
            role="img"
            aria-label="Chamada em andamento"
          />
        </button>
      </div>
      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`">
        <ProjectOverview
          v-if="tab === 'geral'"
          :project="project"
          :metrics="overview.metrics"
          :upcoming="overview.upcoming"
          :members="overview.members"
          @retry="overview.retry"
        />
        <ProjectMembers
          v-else-if="tab === 'membros'"
          :project="project"
          @changed="reloadOverview"
        />
        <ProjectChat v-else-if="tab === 'conversa'" :project-id="project.id" />
        <ProjectFolders v-else-if="tab === 'pastas'" />
        <ProjectLinks v-else-if="tab === 'links'" :project-id="project.id" />
        <ProjectActivities v-else-if="tab === 'atividades'" :key="project.id" :project="project" />
        <ProjectCalls v-else :project="project" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-8) var(--space-6);
}
.project-detail__back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  min-height: 2.75rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.project-detail__back:hover {
  color: var(--color-primary-hover);
}
.project-detail__tabs {
  display: flex;
  gap: var(--space-1);
  /* Linha de baixo como sombra interna: com overflow-x o navegador corta o que passa da caixa,
     então o sublinhado da aba ativa precisa ficar dentro dela (sem margem negativa). */
  box-shadow: inset 0 -1px 0 var(--color-border);
  overflow-x: auto;
  overflow-y: hidden;
}
.project-detail__tabs button {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}
.project-detail__tabs button:hover {
  color: var(--color-text);
}
.project-detail__live {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-left: var(--space-1);
  border-radius: 50%;
  background: var(--color-success);
}
.project-detail__tabs button.is-active {
  color: var(--color-primary-hover);
  border-bottom-color: var(--color-primary);
}
.project-detail__state {
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
.project-detail__state h1 {
  font-size: var(--font-size-xl);
}
.project-detail__state p {
  color: var(--color-text-secondary);
}
@media (max-width: 700px) {
  .project-detail {
    padding: var(--space-5) var(--space-4);
  }
}
</style>
