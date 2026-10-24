<script setup>
import { onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { toast } from 'vue3-toastify'
import * as linkApi from '@/api/supportLinks'
import { listAllTasks } from '@/api/tasks'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SupportLinkDialog from './SupportLinkDialog.vue'
import SupportLinkList from './SupportLinkList.vue'
import { useProjectLinks } from '@/composables/useProjectLinks'
import { apiErrorMessage } from '@/utils/apiErrors'
import { linkFormErrors } from '@/utils/supportLinks'

// Aba "Links de apoio" do projeto: links gerais (task null). Qualquer participante opera;
// o backend responde 404 para quem não é do projeto.
const { projectId } = defineProps({
  projectId: { type: Number, required: true },
})

const links = useProjectLinks({
  list: linkApi.listProjectSupportLinks,
  create: linkApi.createSupportLink,
  update: linkApi.updateSupportLink,
  remove: linkApi.deleteSupportLink,
})
const { items, loading, error } = links

// editing: null fechado | { link: null } novo | { link } edição
const editing = ref(null)
const saving = shallowRef(false)
const fieldErrors = ref({})
const removing = reactive({ link: null, busy: false })
// Tarefas do projeto para o campo "Tarefa vinculada"; null se não carregaram (campo some).
const tasks = ref(null)
let tasksFor = null

async function loadTasks() {
  if (tasksFor === projectId && tasks.value) return
  const project = projectId
  try {
    const list = await listAllTasks(project)
    if (project !== projectId) return
    tasksFor = project
    tasks.value = list.filter((task) => task.project === project)
  } catch {
    tasks.value = null
  }
}

function openDialog(link = null) {
  fieldErrors.value = {}
  editing.value = { link }
  loadTasks()
}

function closeDialog() {
  if (!saving.value) editing.value = null
}

async function submit(payload) {
  const { link } = editing.value
  saving.value = true
  fieldErrors.value = {}
  try {
    if (link) {
      const data = await links.update(link, payload)
      toast.success(data.task != null ? 'Link vinculado à tarefa.' : 'Link atualizado.')
    } else {
      const data = await links.create(payload)
      toast.success(data.task != null ? 'Link adicionado à tarefa.' : 'Link adicionado.')
    }
    editing.value = null
  } catch (cause) {
    fieldErrors.value = linkFormErrors(cause, 'Não foi possível salvar o link.')
  } finally {
    saving.value = false
  }
}

async function confirmRemove() {
  removing.busy = true
  try {
    await links.remove(removing.link)
    toast.success('Link excluído.')
  } catch (cause) {
    toast.error(apiErrorMessage(cause, 'Não foi possível excluir o link.'))
  } finally {
    Object.assign(removing, { link: null, busy: false })
  }
}

const reload = () => links.load(projectId)

watch(
  () => projectId,
  () => {
    editing.value = null
    Object.assign(removing, { link: null, busy: false })
    tasks.value = null
    tasksFor = null
    reload()
  },
  { immediate: true },
)
onBeforeUnmount(links.dispose)
</script>

<template>
  <section class="project-links" aria-labelledby="project-links-title" :aria-busy="loading">
    <header class="project-links__header">
      <div>
        <h2 id="project-links-title">Links de apoio</h2>
        <p class="project-links__hint">
          Documentação, protótipos, repositórios e referências do projeto.
        </p>
      </div>
      <BaseButton :disabled="loading || Boolean(error)" @click="openDialog()">
        <Plus :size="16" aria-hidden="true" /> Adicionar link
      </BaseButton>
    </header>

    <p v-if="loading" class="project-links__state" role="status">Carregando links…</p>
    <div v-else-if="error" class="project-links__state" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" @click="reload">Tentar novamente</BaseButton>
    </div>
    <SupportLinkList
      v-else-if="items.length"
      :links="items"
      show-meta
      @edit="openDialog"
      @remove="removing.link = $event"
    />
    <p v-else class="project-links__state">
      Nenhum link geral ainda. Adicione o primeiro para a equipe encontrar os materiais.
    </p>

    <SupportLinkDialog
      v-if="editing"
      :link="editing.link"
      :tasks="tasks"
      :saving="saving"
      :field-errors="fieldErrors"
      @submit="submit"
      @close="closeDialog"
    />
    <ConfirmDialog
      v-if="removing.link"
      title="Excluir link"
      :message="`Excluir o link “${removing.link.title}”? Essa ação não pode ser desfeita.`"
      confirm-label="Excluir link"
      :busy="removing.busy"
      @confirm="confirmRemove"
      @cancel="removing.link = null"
    />
  </section>
</template>

<style scoped>
.project-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
.project-links__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.project-links__header h2 {
  font-size: var(--font-size-lg);
}
.project-links__hint {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.project-links__state {
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
</style>
