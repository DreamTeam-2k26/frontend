<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, FolderOpen, Plus, Upload } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FolderBreadcrumb from '@/components/folders/FolderBreadcrumb.vue'
import FolderList from '@/components/folders/FolderList.vue'
import FolderForm from '@/components/folders/FolderForm.vue'
import FolderMoveDialog from '@/components/folders/FolderMoveDialog.vue'
import FolderDeleteDialog from '@/components/folders/FolderDeleteDialog.vue'
import {
  filterFolders,
  folderRoute,
  folderError,
  readLocation,
} from '@/components/folders/folderState'
import { useFolderExplorer } from '@/composables/useFolderExplorer'
import { getProject } from '@/api/projects'
import folders from '@/api/folders'
import ProjectFiles from '@/components/files/ProjectFiles.vue'

const route = useRoute()
const locationParams = computed(() => ({ id: route.params.id, folderId: route.query.pasta }))
const { project, currentFolder, items, loading, error, status, load, dispose } = useFolderExplorer({
  getProject,
  folders,
})
const filePanel = ref(null)
const search = ref('')
const success = ref('')
const operation = ref(null)
const selected = ref(null)
const busy = ref(false)
const operationError = ref('')
const filtered = computed(() => filterFolders(items.value, search.value))
const path = computed(() => currentFolder.value?.path ?? [])
let actionVersion = 0
let mounted = true
function refresh() {
  return load(locationParams.value)
}
function openOperation(type, folder = null) {
  selected.value = folder
  operation.value = type
  operationError.value = ''
  success.value = ''
  actionVersion++
}
function closeOperation() {
  if (!busy.value) {
    operation.value = null
    actionVersion++
  }
}
async function run(action, message) {
  if (busy.value) return
  const version = actionVersion
  busy.value = true
  operationError.value = ''
  try {
    await action()
    if (!mounted || version !== actionVersion) return
    operation.value = null
    success.value = message
    search.value = ''
    await refresh()
    if (mounted && version === actionVersion) {
      await nextTick()
      document.getElementById('new-folder')?.focus()
    }
  } catch (cause) {
    if (!mounted || version !== actionVersion) return
    operationError.value = folderError(cause)
    // A operação falhou: não fingir exclusão/salvamento. Revalidar dados sem fechar o modal.
    if ([403, 404].includes(cause.response?.status)) await refresh()
  } finally {
    if (version === actionVersion) busy.value = false
  }
}
function saveName(name) {
  const location = readLocation(locationParams.value)
  const target = selected.value
  return run(
    () =>
      target
        ? folders.rename(target.id, name)
        : folders.create(location.projectId, location.folderId, name),
    target ? 'Pasta renomeada com sucesso.' : 'Pasta criada com sucesso.',
  )
}
function move(parent) {
  const id = selected.value.id
  return run(() => folders.move(id, parent), 'Pasta movida com sucesso.')
}
function remove() {
  const id = selected.value.id
  return run(
    () => folders.remove(id),
    'Pasta, subpastas e seus arquivos foram excluídos permanentemente.',
  )
}
watch(
  () => [route.params.id, route.query.pasta],
  () => {
    actionVersion++
    busy.value = false
    operation.value = null
    selected.value = null
    success.value = ''
    search.value = ''
    refresh()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  mounted = false
  actionVersion++
  dispose()
})
</script>

<template>
  <section class="folders-page" aria-labelledby="folders-title" :aria-busy="loading">
    <header class="folders-header">
      <div>
        <h2 id="folders-title">Arquivos</h2>
        <p>Materiais, pastas e documentos compartilhados.</p>
      </div>
      <BaseButton
        :disabled="loading || !!error || !project || filePanel?.busy || filePanel?.offline"
        @click="filePanel?.openUpload()"
      >
        <Upload :size="16" aria-hidden="true" /> Enviar arquivo
      </BaseButton>
    </header>
    <p v-if="success" class="success" role="status">{{ success }}</p>
    <div v-if="loading" class="folder-state" role="status">Carregando pastas…</div>
    <div v-else-if="error" class="folder-state" role="alert">
      <p>{{ error }}</p>
      <BaseButton v-if="![401, 403, 404].includes(status)" variant="secondary" @click="refresh"
        >Tentar novamente</BaseButton
      >
      <BaseButton v-if="status === 401" :to="{ name: 'login', query: { redirect: route.fullPath } }"
        >Entrar novamente</BaseButton
      >
      <BaseButton
        v-if="locationParams.folderId"
        variant="secondary"
        :to="folderRoute(route.params.id)"
        >Voltar à raiz</BaseButton
      >
      <BaseButton variant="ghost" :to="{ name: 'projects' }">Meus Projetos</BaseButton>
    </div>
    <template v-else-if="project">
      <FolderBreadcrumb v-if="currentFolder" :project-id="project.id" :path="path" />
      <div class="section-heading">
        <h2>Pastas</h2>
        <BaseButton id="new-folder" variant="secondary" @click="openOperation('form')">
          <Plus :size="14" aria-hidden="true" /> Nova pasta
        </BaseButton>
      </div>
      <div v-if="currentFolder" class="folder-toolbar">
        <BaseButton
          v-if="currentFolder"
          variant="ghost"
          :to="folderRoute(project.id, currentFolder.parent)"
          ><ArrowLeft :size="16" aria-hidden="true" /> Pasta anterior</BaseButton
        >
        <BaseInput
          v-model="search"
          type="search"
          label="Buscar neste local"
          placeholder="Nome de pasta neste local…"
        />
        <p role="status">
          {{ filtered.length }}
          {{ filtered.length === 1 ? 'pasta neste local' : 'pastas neste local' }}
        </p>
      </div>
      <p v-if="currentFolder?.created_by_name" class="folder-author">
        Pasta criada por {{ currentFolder.created_by_name }}
      </p>
      <FolderList
        v-if="filtered.length"
        :project-id="project.id"
        :folders="filtered"
        @rename="openOperation('form', $event)"
        @move="openOperation('move', $event)"
        @delete="openOperation('delete', $event)"
      />
      <div v-else class="folder-state">
        <FolderOpen :size="36" aria-hidden="true" />
        <h2>
          {{
            search.trim()
              ? 'Nenhuma pasta encontrada neste local'
              : 'Este local ainda não tem pastas'
          }}
        </h2>
        <p>
          {{
            search.trim()
              ? 'A busca considera apenas as pastas do local aberto.'
              : 'Crie uma pasta para começar a organizar o projeto.'
          }}
        </p>
        <BaseButton v-if="search.trim()" variant="secondary" @click="search = ''"
          >Limpar busca</BaseButton
        >
        <BaseButton v-else @click="openOperation('form')">Nova pasta</BaseButton>
      </div>
      <ProjectFiles
        ref="filePanel"
        :key="`${project.id}:${currentFolder?.id ?? 'root'}`"
        :project-id="project.id"
        :folder-id="currentFolder?.id ?? null"
        :folder-name="currentFolder?.name || 'Raiz do projeto'"
        @unavailable="refresh"
      />
    </template>
    <FolderForm
      v-if="operation === 'form'"
      :folder="selected"
      :siblings="items"
      :busy="busy"
      :error="operationError"
      @save="saveName"
      @close="closeOperation"
    />
    <FolderMoveDialog
      v-if="operation === 'move'"
      :project-id="route.params.id"
      :folder="selected"
      :busy="busy"
      :error="operationError"
      @unavailable="refresh"
      @move="move"
      @close="closeOperation"
    />
    <FolderDeleteDialog
      v-if="operation === 'delete'"
      :project-id="route.params.id"
      :folder="selected"
      :busy="busy"
      :error="operationError"
      @unavailable="refresh"
      @confirm="remove"
      @close="closeOperation"
    />
  </section>
</template>

<style scoped>
.folders-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  overflow-wrap: anywhere;
}
.folders-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}
.folders-header h2 {
  font-size: var(--font-size-lg);
  overflow-wrap: anywhere;
}
.folders-header h2 span {
  font-weight: var(--font-weight-regular);
}
p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.folders-header p {
  margin-top: var(--space-2);
}
.folder-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
}
.folder-toolbar :deep(.field) {
  width: min(100%, 22rem);
}
.folder-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.folder-state h2 {
  font-size: var(--font-size-lg);
}
.success {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-success-soft);
  color: var(--color-success);
}
.folder-author {
  font-size: var(--font-size-xs);
}
@media (max-width: 700px) {
  .folders-header {
    flex-direction: column;
  }
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.section-heading h2 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.section-heading > span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
</style>
