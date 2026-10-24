<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getProject, updateProject, deleteProject, leaveProject } from '@/api/projects'
import { projectError, projectFieldErrors } from '@/components/projects/projectState'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const project = ref(null)
const loading = ref(true)
const loadError = ref('')
const error = ref('')
const success = ref('')
const fields = ref({})
const name = ref('')
const description = ref('')
const busy = ref(false)
const confirmation = ref(null)
const canEdit = computed(() => ['owner', 'admin'].includes(project.value?.role))
const canLeave = computed(() => ['admin', 'member'].includes(project.value?.role))
const roleLabel = computed(
  () =>
    ({ owner: 'Dono', admin: 'Administrador', member: 'Membro' })[project.value?.role] ??
    'Não informado',
)
const createdAt = computed(() => {
  const date = new Date(project.value?.created_at)
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR')
})
let version = 0
let controller
let returnFocus
const current = (token, id) => token === version && String(route.params.id) === id

async function load({ preserveError = false } = {}) {
  const token = ++version
  const id = String(route.params.id)
  controller?.abort()
  controller = new AbortController()
  project.value = null
  loading.value = true
  busy.value = false
  confirmation.value = null
  loadError.value = ''
  if (!preserveError) error.value = ''
  success.value = ''
  fields.value = {}
  name.value = ''
  description.value = ''
  try {
    if (!/^[1-9]\d*$/.test(id)) throw { response: { status: 404 } }
    const data = await getProject(id, { signal: controller.signal })
    if (!current(token, id)) return
    project.value = data
    name.value = data.name
    description.value = data.description ?? ''
  } catch (cause) {
    if (current(token, id)) loadError.value = projectError(cause)
  } finally {
    if (current(token, id)) loading.value = false
  }
}

async function handleFailure(cause) {
  error.value = projectError(cause)
  fields.value = projectFieldErrors(cause)
  if ([401, 403, 404].includes(cause.response?.status)) await load({ preserveError: true })
}

async function save() {
  if (busy.value || !canEdit.value) return
  fields.value = {}
  error.value = ''
  success.value = ''
  if (!name.value.trim()) fields.value.name = 'Informe o nome do projeto.'
  else if (name.value.trim().length > 100) fields.value.name = 'Use no máximo 100 caracteres.'
  if (fields.value.name) {
    await nextTick()
    document.getElementById('settings-project-name')?.focus()
    return
  }
  const token = version
  const id = String(route.params.id)
  busy.value = true
  try {
    const saved = await updateProject(id, {
      name: name.value.trim(),
      description: description.value.trim(),
    })
    // Atualiza também um projeto mantido na sidebar ao navegar durante o PATCH.
    window.dispatchEvent(
      new CustomEvent('sidebar:project-updated', { detail: { project: { ...saved, id } } }),
    )
    window.dispatchEvent(new Event('projects:changed'))
    if (!current(token, id)) return
    // Escrita não é fonte de autorização: o papel continua vindo do GET.
    await load()
    if (String(route.params.id) === id && project.value)
      success.value = 'Projeto atualizado com sucesso.'
  } catch (cause) {
    if (current(token, id)) await handleFailure(cause)
  } finally {
    if (current(token, id)) busy.value = false
  }
}

function openConfirmation(action) {
  if (busy.value) return
  returnFocus = document.activeElement
  error.value = ''
  confirmation.value = action
}
async function closeConfirmation() {
  confirmation.value = null
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
}
async function confirm() {
  const action = confirmation.value
  if (busy.value || !action) return
  if (action === 'delete' ? project.value?.role !== 'owner' : !canLeave.value) return
  const token = version
  const id = String(route.params.id)
  busy.value = true
  error.value = ''
  try {
    if (action === 'delete') await deleteProject(id)
    else await leaveProject(id)
    window.dispatchEvent(new CustomEvent('sidebar:project-removed', { detail: { id } }))
    window.dispatchEvent(new Event('projects:changed'))
    if (current(token, id)) {
      confirmation.value = null
      await router.push({ name: 'projects' })
    }
  } catch (cause) {
    if (current(token, id)) {
      await closeConfirmation()
      await handleFailure(cause)
    }
  } finally {
    if (current(token, id)) busy.value = false
  }
}
watch(
  () => route.params.id,
  () => load(),
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  version++
  controller?.abort()
})
</script>

<template>
  <section class="settings" :aria-busy="loading">
    <BaseButton variant="ghost" :to="{ name: 'projects' }">
      <ArrowLeft :size="18" aria-hidden="true" /> Meus Projetos
    </BaseButton>
    <header>
      <h1>Configurações do projeto</h1>
      <p>Informações e administração do seu espaço de trabalho.</p>
    </header>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="success" role="status">{{ success }}</p>
    <p v-if="loading" role="status">Carregando projeto…</p>
    <section v-else-if="loadError" class="card" role="alert">
      <h2>Projeto indisponível</h2>
      <p>{{ loadError }}</p>
      <BaseButton variant="secondary" @click="load()">Tentar novamente</BaseButton>
    </section>
    <template v-else-if="project">
      <section class="card" aria-labelledby="project-information">
        <h2 id="project-information">Informações do projeto</h2>
        <p>Criado em {{ createdAt }} · Seu papel: {{ roleLabel }}</p>
        <form v-if="canEdit" novalidate :aria-busy="busy" @submit.prevent="save">
          <BaseInput
            id="settings-project-name"
            v-model="name"
            label="Nome do projeto"
            required
            maxlength="100"
            :disabled="busy"
            :error="fields.name"
          />
          <label for="settings-description">Descrição (opcional)</label>
          <textarea
            id="settings-description"
            v-model="description"
            rows="3"
            :disabled="busy"
            :aria-invalid="!!fields.description"
            :aria-describedby="fields.description ? 'settings-description-error' : undefined"
          />
          <small v-if="fields.description" id="settings-description-error" class="error">{{
            fields.description
          }}</small>
          <BaseButton type="submit" :loading="busy">Salvar alterações</BaseButton>
        </form>
        <dl v-else>
          <dt>Nome</dt>
          <dd>{{ project.name }}</dd>
          <dt>Descrição</dt>
          <dd class="description">{{ project.description || 'Sem descrição.' }}</dd>
        </dl>
      </section>
      <section class="card" aria-labelledby="project-management">
        <h2 id="project-management">Gerenciamento</h2>
        <p>Consulte os participantes e acesse os convites conforme suas permissões.</p>
        <BaseButton
          variant="secondary"
          :to="{ name: 'project-detail', params: { id: project.id }, query: { aba: 'membros' } }"
          >Participantes e convites</BaseButton
        >
        <BaseButton variant="ghost" :to="{ name: 'project-detail', params: { id: project.id } }"
          >Voltar ao projeto</BaseButton
        >
      </section>
      <section class="card danger" aria-labelledby="project-danger">
        <h2 id="project-danger">Zona de perigo</h2>
        <template v-if="project.role === 'owner'">
          <p>Transfira a propriedade antes de sair.</p>
          <BaseButton
            variant="secondary"
            :to="{ name: 'project-detail', params: { id: project.id }, query: { aba: 'membros' } }"
            >Abrir Participantes</BaseButton
          >
          <p>A exclusão do projeto e dos dados relacionados é irreversível.</p>
          <BaseButton class="delete" :disabled="busy" @click="openConfirmation('delete')"
            >Excluir projeto</BaseButton
          >
        </template>
        <template v-else-if="canLeave">
          <p>
            Ao sair, você perderá acesso ao projeto. Será necessário um novo convite para voltar.
          </p>
          <BaseButton variant="secondary" :disabled="busy" @click="openConfirmation('leave')"
            >Sair do projeto</BaseButton
          >
        </template>
      </section>
    </template>
    <ConfirmDialog
      v-if="confirmation"
      :title="confirmation === 'delete' ? 'Excluir projeto?' : 'Sair do projeto?'"
      :message="
        confirmation === 'delete'
          ? `Excluir o projeto “${project.name}” é irreversível e afeta seus dados relacionados. Deseja continuar?`
          : `Você perderá acesso ao projeto “${project.name}”. Deseja sair?`
      "
      :confirm-label="confirmation === 'delete' ? 'Excluir projeto' : 'Sair do projeto'"
      :busy="busy"
      @cancel="closeConfirmation"
      @confirm="confirm"
    />
  </section>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-4);
  width: 100%;
  max-width: 44rem;
  padding: var(--space-8) var(--space-6);
  margin: auto;
}
.settings > .button {
  align-self: flex-start;
}
h1 {
  font-size: var(--font-size-xl);
}
h2 {
  font-size: var(--font-size-lg);
}
header p,
.card p {
  color: var(--color-text-secondary);
}
.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}
form .button {
  align-self: flex-start;
}
textarea {
  width: 100%;
  resize: vertical;
  padding: var(--space-3);
  color: var(--color-text);
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font: inherit;
}
textarea:focus-visible {
  outline: var(--focus-ring);
}
textarea[aria-invalid='true'] {
  border-color: var(--color-danger);
}
dd {
  margin: 0 0 var(--space-4);
  overflow-wrap: anywhere;
}
dt {
  font-weight: var(--font-weight-semibold);
}
.description {
  white-space: pre-wrap;
}
.error {
  color: var(--color-danger);
  overflow-wrap: anywhere;
}
.danger {
  border-color: var(--color-danger);
}
.delete {
  background: var(--color-danger);
}
@media (max-width: 700px) {
  .settings {
    padding: var(--space-5) var(--space-4);
  }
  .card {
    padding: var(--space-4);
  }
}
</style>
