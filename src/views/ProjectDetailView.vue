<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getProject } from '@/api/projects'
import { projectError } from '@/components/projects/projectState'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProjectHeader from '@/components/projects/ProjectHeader.vue'
import ProjectOverview from '@/components/projects/ProjectOverview.vue'

const route = useRoute()
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
    if (current === request) project.value = data
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

watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => {
  request++
  controller?.abort()
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
      <ProjectOverview :project="project" />
    </template>
  </section>
</template>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--container-width);
  margin-inline: auto;
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
