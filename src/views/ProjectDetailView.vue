<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getProject } from '@/api/projects'
import { projectError } from '@/components/projects/projectState'

const route = useRoute()
const project = ref(null)
const loading = ref(false)
const error = ref('')
const offline = ref(!navigator.onLine)
const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
let request = 0
async function load() {
  const current = ++request
  project.value = null
  error.value = ''
  loading.value = false
  if (offline.value) return
  loading.value = true
  try {
    const data = await getProject(route.params.id)
    if (current === request) project.value = data
  } catch (cause) {
    if (current === request) error.value = projectError(cause)
  } finally {
    if (current === request) loading.value = false
  }
}
function connectionChanged() {
  offline.value = !navigator.onLine
  load()
}
watch(() => route.params.id, load, { immediate: true })
onMounted(() => {
  window.addEventListener('online', connectionChanged)
  window.addEventListener('offline', connectionChanged)
})
onBeforeUnmount(() => {
  request++
  window.removeEventListener('online', connectionChanged)
  window.removeEventListener('offline', connectionChanged)
})
function date(value) {
  const parsed = new Date(value)
  return value && Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('pt-BR')
    : 'Não informada'
}
</script>

<template>
  <section class="project-detail" aria-labelledby="project-title">
    <RouterLink :to="{ name: 'projects' }">Voltar para Meus Projetos</RouterLink>
    <h1 id="project-title">{{ project?.name || 'Detalhes do projeto' }}</h1>
    <p v-if="offline" role="status">Você está offline. Reconecte-se para carregar o projeto.</p>
    <p v-else-if="loading" role="status" aria-busy="true">Carregando projeto…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" @click="load">Tentar novamente</BaseButton>
    </div>
    <template v-else-if="project">
      <p class="project-detail__description">{{ project.description || 'Sem descrição.' }}</p>
      <dl>
        <div>
          <dt>Seu papel</dt>
          <dd>{{ roles[project.role] || 'Participante' }}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{{ date(project.created_at) }}</dd>
        </div>
        <div>
          <dt>Atualizado em</dt>
          <dd>{{ date(project.updated_at) }}</dd>
        </div>
      </dl>
    </template>
  </section>
</template>

<style scoped>
.project-detail {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-8) var(--space-6);
  overflow-wrap: anywhere;
}
a {
  color: var(--color-primary);
}
p,
dt {
  color: var(--color-text-secondary);
}
.project-detail__description {
  white-space: pre-wrap;
}
dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--space-4);
}
dl > div {
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
dd {
  margin-top: var(--space-2);
}
@media (max-width: 650px) {
  .project-detail {
    padding: var(--space-5) var(--space-4);
  }
}
</style>
