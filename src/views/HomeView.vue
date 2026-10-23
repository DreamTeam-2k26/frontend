<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus, RefreshCw, WifiOff } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import DashboardStatCard from '@/components/dashboard/DashboardStatCard.vue'
import RecentProjects from '@/components/dashboard/RecentProjects.vue'
import { projectStats, recentProjects } from '@/components/dashboard/dashboardState'
import ProjectEmptyState from '@/components/projects/ProjectEmptyState.vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import { projectError, projectFieldErrors } from '@/components/projects/projectState'
import { createProject, listProjects } from '@/api/projects'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name?.trim().split(/\s+/)[0])
const projects = ref([])
const recent = computed(() => recentProjects(projects.value))
const stats = computed(() => projectStats(projects.value))
const loading = ref(true)
const loaded = ref(false)
const loadError = ref('')
const offline = ref(typeof navigator !== 'undefined' && !navigator.onLine)
const formOpen = ref(false)
const saving = ref(false)
const saveError = ref('')
const fieldErrors = ref({})
const success = ref('')
let active = true
let request = 0
let returnFocus

async function load() {
  if (offline.value) {
    loading.value = false
    return
  }
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const data = await listProjects()
    if (!active || current !== request) return
    projects.value = data
    loaded.value = true
  } catch (error) {
    if (active && current === request) loadError.value = projectError(error)
  } finally {
    if (active && current === request) loading.value = false
  }
}
function syncConnection() {
  offline.value = !navigator.onLine
  if (!offline.value) load()
}
function openForm() {
  returnFocus = document.activeElement
  saveError.value = ''
  fieldErrors.value = {}
  success.value = ''
  formOpen.value = true
}
async function closeForm() {
  formOpen.value = false
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
  else document.getElementById('dashboard-new-project')?.focus()
}
async function save(values) {
  if (saving.value) return
  if (offline.value) {
    saveError.value = 'Você está offline. Reconecte-se para salvar o projeto.'
    return
  }
  saving.value = true
  saveError.value = ''
  fieldErrors.value = {}
  try {
    await createProject(values)
    if (!active) return
    success.value = 'Projeto criado com sucesso.'
    await closeForm()
    // Revalida todas as páginas: nunca repete o POST se a leitura falhar.
    await load()
  } catch (error) {
    if (!active) return
    saveError.value = projectError(error)
    fieldErrors.value = projectFieldErrors(error)
  } finally {
    saving.value = false
  }
}
onMounted(() => {
  // O layout também usa fetchUser; a store compartilha a requisição em andamento.
  auth.fetchUser().catch(() => {
    /* Saudação neutra enquanto o perfil não estiver disponível. */
  })
  load()
  window.addEventListener('online', syncConnection)
  window.addEventListener('offline', syncConnection)
})
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('online', syncConnection)
  window.removeEventListener('offline', syncConnection)
})
</script>

<template>
  <section class="dashboard" aria-labelledby="dashboard-title">
    <header class="dashboard__header">
      <div>
        <h1 id="dashboard-title">
          {{ firstName ? `Olá, ${firstName}.` : 'Olá! Que bom ter você aqui.' }}
        </h1>
        <p>Seus projetos e próximos passos, em um só lugar.</p>
      </div>
      <BaseButton id="dashboard-new-project" :disabled="offline" @click="openForm">
        <Plus :size="18" aria-hidden="true" /> Novo projeto
      </BaseButton>
    </header>

    <div v-if="offline" class="dashboard__notice" role="status">
      <WifiOff :size="20" aria-hidden="true" />
      <p>Você está offline. Reconecte-se para atualizar ou criar projetos.</p>
    </div>
    <p v-if="success" class="dashboard__success" role="status">{{ success }}</p>
    <div v-if="loadError && !offline" class="dashboard__notice" role="alert">
      <p>{{ loadError }}</p>
      <BaseButton variant="secondary" :loading="loading" @click="load">
        <RefreshCw :size="16" aria-hidden="true" /> Tentar novamente
      </BaseButton>
    </div>
    <p v-if="loaded && (offline || loadError)" class="dashboard__cached" role="status">
      Exibindo os dados da última atualização bem-sucedida nesta sessão.
    </p>
    <div
      v-if="loading"
      class="dashboard__loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span>Carregando seus projetos…</span>
      <div class="dashboard__skeletons" aria-hidden="true"><span /><span /><span /></div>
    </div>
    <template v-else-if="loaded">
      <RecentProjects v-if="projects.length" :projects="recent" />
      <ProjectEmptyState v-else-if="!offline && !loadError" @create="openForm" />
      <section v-if="projects.length" class="dashboard__overview" aria-labelledby="overview-title">
        <h2 id="overview-title">Visão rápida</h2>
        <dl class="dashboard__stats">
          <DashboardStatCard
            label="Seus projetos"
            :value="stats.total"
            description="Todos os projetos dos quais você participa."
          />
          <DashboardStatCard
            label="Sob sua gestão"
            :value="stats.managed"
            description="Projetos em que você é dono ou administrador."
          />
        </dl>
      </section>
    </template>
    <ProjectForm
      v-if="formOpen"
      :saving="saving"
      :error="saveError"
      :field-errors="fieldErrors"
      @save="save"
      @close="closeForm"
    />
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  width: 100%;
  padding: var(--space-8) var(--space-6);
}
.dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}
h1 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xl);
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.dashboard__header > :last-child {
  flex-shrink: 0;
}
.dashboard__notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.dashboard__notice p {
  flex: 1;
  min-width: min(100%, 14rem);
}
.dashboard__notice svg {
  color: var(--color-text-secondary);
}
.dashboard__success {
  padding: var(--space-3);
  color: var(--color-success);
  background: var(--color-success-soft);
  border-radius: var(--radius-md);
}
.dashboard__loading {
  display: grid;
  gap: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.dashboard__skeletons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
.dashboard__skeletons span {
  height: 16rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.dashboard__overview h2 {
  margin-bottom: var(--space-4);
  font-size: var(--font-size-md);
}
.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
@media (max-width: 650px) {
  .dashboard {
    padding: var(--space-5) var(--space-4);
    gap: var(--space-6);
  }
  .dashboard__header {
    flex-direction: column;
    align-items: flex-start;
  }
  .dashboard__stats,
  .dashboard__skeletons {
    grid-template-columns: minmax(0, 1fr);
  }
  .dashboard__skeletons span {
    height: 10rem;
  }
}
</style>
