<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ProjectList from '@/components/projects/ProjectList.vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import ProjectInvites from '@/components/projects/ProjectInvites.vue'
import ProjectEmptyState from '@/components/projects/ProjectEmptyState.vue'
import {
  filterProjects,
  projectError,
  projectFieldErrors,
} from '@/components/projects/projectState'
import { listProjects, createProject, updateProject } from '@/api/projects'
import { inviteUser } from '@/api/projectMembers'
import { inviteMany, inviteSummary } from '@/components/projects/memberRules'

const projects = ref([])
const search = ref('')
const loading = ref(true)
const loadError = ref('')
const success = ref('')
const warning = ref('')
const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const saveError = ref('')
const fieldErrors = ref({})
const filtered = computed(() => filterProjects(projects.value, search.value))
let active = true
let request = 0
let returnFocus

async function load() {
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const data = await listProjects()
    if (active && current === request) projects.value = data
  } catch (error) {
    if (active && current === request) loadError.value = projectError(error)
  } finally {
    if (active && current === request) loading.value = false
  }
}

function openForm(project = null) {
  returnFocus = document.activeElement
  editing.value = project
  saveError.value = ''
  fieldErrors.value = {}
  success.value = ''
  warning.value = ''
  formOpen.value = true
}

async function closeForm() {
  formOpen.value = false
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
  else document.getElementById('new-project')?.focus()
}

async function save({ invitees = [], ...values }) {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  fieldErrors.value = {}
  try {
    const isEditing = !!editing.value
    const saved = isEditing
      ? await updateProject(editing.value.id, values)
      : await createProject(values)
    if (!active) return
    // A resposta de escrita não contém updated_at. A lista é revalidada abaixo.
    if (isEditing)
      projects.value = projects.value.map((project) =>
        project.id === saved.id ? { ...project, ...saved } : project,
      )
    else projects.value = [saved, ...projects.value]
    search.value = ''
    success.value = isEditing ? 'Projeto atualizado com sucesso.' : 'Projeto criado com sucesso.'
    if (!isEditing && invitees.length) {
      const result = await inviteMany(saved.id, invitees, inviteUser)
      if (result.sent.length)
        success.value += ` ${inviteSummary({ sent: result.sent, failed: [] })}`
      if (result.failed.length) warning.value = inviteSummary({ sent: [], failed: result.failed })
    }
    await closeForm()
    await load()
  } catch (error) {
    if (!active) return
    saveError.value = projectError(error)
    fieldErrors.value = projectFieldErrors(error)
    if ([403, 404].includes(error.response?.status)) await load()
  } finally {
    saving.value = false
  }
}
onMounted(() => { load(); window.addEventListener('projects:changed', load) })
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('projects:changed', load)
})
</script>

<template>
  <section class="projects" aria-labelledby="projects-title">
    <header class="projects__header">
      <div>
        <h1 id="projects-title">Meus projetos</h1>
        <p>Crie projetos, participe de equipes e acompanhe o progresso.</p>
      </div>
      <BaseButton id="new-project" @click="openForm()"
        ><Plus :size="18" aria-hidden="true" /> Novo projeto</BaseButton
      >
    </header>
    <ProjectInvites @accepted="load" />
    <div class="projects__toolbar">
      <div class="projects__search">
        <BaseInput
          v-model="search"
          label="Buscar projetos"
          type="search"
          placeholder="Buscar projetos…"
        />
        <Search :size="16" aria-hidden="true" />
      </div>
      <p v-if="!loading && !loadError" role="status">
        {{ filtered.length }}
        {{ filtered.length === 1 ? 'projeto encontrado' : 'projetos encontrados' }}
      </p>
    </div>
    <p v-if="success" class="projects__success" role="status">{{ success }}</p>
    <p v-if="warning" class="projects__warning" role="alert">{{ warning }}</p>
    <div v-if="loading" class="projects__state" role="status" aria-live="polite" aria-busy="true">
      Carregando projetos…
    </div>
    <div v-else-if="loadError" class="projects__state" role="alert">
      <p>{{ loadError }}</p>
      <BaseButton variant="secondary" @click="load">Tentar novamente</BaseButton>
    </div>
    <ProjectEmptyState
      v-else-if="!filtered.length"
      :searching="!!search.trim()"
      @clear="search = ''"
      @create="openForm()"
    />
    <ProjectList v-else :projects="filtered" @edit="openForm" />
    <ProjectForm
      v-if="formOpen"
      :project="editing"
      :saving="saving"
      :error="saveError"
      :field-errors="fieldErrors"
      @close="closeForm"
      @save="save"
    />
  </section>
</template>

<style scoped>
.projects {
  padding: var(--space-8) var(--space-6);
}
.projects__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
h1 {
  margin-bottom: var(--space-2);
}
p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.projects__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.projects__search {
  position: relative;
  width: min(100%, 20rem);
}
.projects__search :deep(input) {
  padding-left: var(--space-8);
}
.projects__search > svg {
  position: absolute;
  left: var(--space-3);
  bottom: 0.875rem;
  color: var(--color-text-secondary);
  pointer-events: none;
}
.projects__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.projects__success {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--color-success-soft);
  color: var(--color-success);
  border-radius: var(--radius-md);
}
.projects__warning {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-radius: var(--radius-md);
}
@media (max-width: 650px) {
  .projects {
    padding: var(--space-5) var(--space-4);
  }
  .projects__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
