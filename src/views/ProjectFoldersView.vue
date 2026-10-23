<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, FolderOpen, Plus } from 'lucide-vue-next'
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

const route = useRoute()
const { project, currentFolder, items, loading, error, status, load, dispose } = useFolderExplorer({
  getProject,
  folders,
})
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
  return load({ ...route.params })
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
  const location = readLocation(route.params)
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
  return run(() => folders.remove(id), 'Pasta e suas subpastas foram excluídas.')
}
watch(
  () => [route.params.id, route.params.folderId],
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
    <RouterLink class="back-link" :to="{ name: 'project-detail', params: { id: route.params.id } }"
      ><ArrowLeft :size="18" aria-hidden="true" /> Voltar ao projeto</RouterLink
    >
    <header class="folders-header">
      <div>
        <h1 id="folders-title">
          Pastas <span v-if="project">· {{ project.name }}</span>
        </h1>
        <p>Organize as pastas e subpastas deste projeto.</p>
      </div>
      <BaseButton
        v-if="project && !loading && !error"
        id="new-folder"
        @click="openOperation('form')"
        ><Plus :size="18" aria-hidden="true" /> Nova pasta</BaseButton
      >
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
        v-if="route.params.folderId"
        variant="secondary"
        :to="folderRoute(route.params.id)"
        >Voltar à raiz</BaseButton
      >
      <BaseButton variant="ghost" :to="{ name: 'projects' }">Meus Projetos</BaseButton>
    </div>
    <template v-else-if="project">
      <FolderBreadcrumb :project-id="project.id" :path="path" />
      <div class="folder-toolbar">
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
  gap: var(--space-5);
  padding: var(--space-8) var(--space-6);
}
.back-link {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  min-height: 2.75rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.folders-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}
h1 {
  font-size: var(--font-size-xl);
  overflow-wrap: anywhere;
}
h1 span {
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
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
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
  .folders-page {
    padding: var(--space-5) var(--space-4);
  }
  .folders-header {
    flex-direction: column;
  }
}
</style>
