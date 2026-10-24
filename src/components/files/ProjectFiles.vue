<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Upload, FolderOpen } from 'lucide-vue-next'
import files from '@/api/files'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FolderDialog from '@/components/folders/FolderDialog.vue'
import FileDestination from './FileDestination.vue'
import FileList from './FileList.vue'
import { useProjectFiles } from '@/composables/useProjectFiles'
import { useConnection } from '@/composables/useConnection'
import { useTweenedNumber } from '@/composables/useTweenedNumber'
import { sameFolder } from '@/components/folders/folderState'
import {
  acceptFiles,
  fileNameError,
  validateUpload,
  formatSize,
  fileError,
  downloadName,
  saveDownload,
} from './fileState'
const props = defineProps({
  projectId: { type: [String, Number], required: true },
  folderId: { type: [String, Number], default: null },
  folderName: { type: String, default: 'Raiz do projeto' },
})
const emit = defineEmits(['unavailable'])
const { items, loading, error, load, dispose } = useProjectFiles(files)
const busy = ref(false),
  message = ref(''),
  operationError = ref(''),
  operation = ref(null),
  selected = ref(null),
  name = ref(''),
  upload = ref(null),
  progress = ref(null),
  choosing = ref(false)
const input = ref(null),
  dragging = ref(false)
// Barra acompanha o progresso real do envio, deslizando entre os eventos do navegador.
const shownProgress = useTweenedNumber(() => progress.value, { duration: 0.25 })
// Arquivo que a API acabou de confirmar: destacado por instantes na lista.
const highlightId = ref(null)
let highlightTimer
const destination = ref({ id: props.folderId, name: props.folderName })
const configuredLimit = Number(import.meta.env.VITE_PROJECT_FILE_MAX_UPLOAD_MB)
const maxMB = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 20
const { offline } = useConnection(refresh)
const validName = computed(() => fileNameError(name.value))
let active = true,
  context = 0,
  mutationController
function refresh() {
  return load(props.projectId, props.folderId)
}
function openUpload() {
  if (busy.value || offline.value) return
  operation.value = 'upload'
  upload.value = null
  operationError.value = ''
  message.value = ''
  progress.value = null
  destination.value = { id: props.folderId, name: props.folderName }
}
defineExpose({ openUpload, busy, offline })
function close() {
  if (!busy.value) {
    operation.value = null
    selected.value = null
    choosing.value = false
  }
}
function chooseFile(file) {
  if (busy.value) return
  upload.value = file || null
  operationError.value = file ? validateUpload(file, maxMB) : ''
  if (input.value) input.value.value = ''
}
function drop(event) {
  dragging.value = false
  if (!busy.value && !offline.value) chooseFile(event.dataTransfer.files[0])
}
async function action({ file, action }) {
  if (busy.value || offline.value) return
  message.value = ''
  operationError.value = ''
  selected.value = file
  if (action === 'download') {
    await run(
      () => files.download(file.id, { signal: mutationController.signal }),
      'Download iniciado.',
      true,
    )
    return
  }
  operation.value = action
  name.value = file.name
  destination.value = { id: props.folderId, name: props.folderName }
  if (action === 'move') choosing.value = true
}
async function run(callback, success, download = false, highlight = false) {
  if (busy.value || offline.value) return
  const current = context
  busy.value = true
  operationError.value = ''
  progress.value = null
  mutationController = new AbortController()
  try {
    const result = await callback()
    if (!active || current !== context) return
    if (download) {
      if (!(result.data instanceof Blob) || !result.data.size)
        throw new Error('Resposta de download inválida')
      saveDownload(result.data, downloadName(result.headers, selected.value.name))
    }
    operation.value = null
    choosing.value = false
    message.value = success
    if (!download) await refresh()
    // fileClient.upload devolve o próprio arquivo criado (não a resposta do axios).
    if (highlight && active && current === context && result?.id != null) {
      highlightId.value = result.id
      clearTimeout(highlightTimer)
      highlightTimer = setTimeout(() => (highlightId.value = null), 2400)
    }
  } catch (cause) {
    if (!active || current !== context) return
    operationError.value = fileError(cause)
    if ([403, 404].includes(cause.response?.status)) {
      await refresh()
      emit('unavailable')
    }
  } finally {
    if (active && current === context) busy.value = false
  }
}
function sendUpload() {
  operationError.value = validateUpload(upload.value, maxMB)
  if (operationError.value) return
  run(
    () =>
      files.upload(
        { project: props.projectId, folder: destination.value.id, file: upload.value },
        {
          signal: mutationController.signal,
          onUploadProgress(event) {
            if (active && event.total)
              progress.value = Math.min(100, Math.round((event.loaded / event.total) * 100))
          },
        },
      ),
    'Arquivo enviado com sucesso.',
    false,
    true,
  )
}
function rename() {
  operationError.value = validName.value
  if (operationError.value) return
  run(
    () => files.rename(selected.value.id, name.value, { signal: mutationController.signal }),
    'Arquivo renomeado com sucesso.',
  )
}
function destinationSelected(value) {
  destination.value = value
  choosing.value = false
}
function move() {
  if (sameFolder(destination.value.id, props.folderId)) return
  run(
    () =>
      files.move(selected.value.id, destination.value.id, { signal: mutationController.signal }),
    'Arquivo movido com sucesso.',
  )
}
function remove() {
  run(
    () => files.remove(selected.value.id, { signal: mutationController.signal }),
    'Arquivo excluído permanentemente.',
  )
}
watch(
  () => [props.projectId, props.folderId],
  () => {
    context++
    mutationController?.abort()
    busy.value = false
    operation.value = null
    choosing.value = false
    message.value = ''
    operationError.value = ''
    refresh()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  active = false
  clearTimeout(highlightTimer)
  context++
  mutationController?.abort()
  dispose()
})
</script>
<template>
  <section class="project-files" aria-labelledby="recent-files-title" :aria-busy="loading || busy">
    <header>
      <h2 id="recent-files-title">Arquivos recentes</h2>
      <span v-if="!loading && !error"
        >{{ items.length }}
        {{ items.length === 1 ? 'arquivo neste local' : 'arquivos neste local' }} · Mais
        recentes</span
      >
    </header>
    <p v-if="offline" role="status">
      Você está offline. Reconecte-se para enviar ou gerenciar arquivos.
    </p>
    <p v-if="message" class="success" role="status">{{ message }}</p>
    <p v-if="operationError && !operation" class="operation-error" role="alert">
      {{ operationError }}
    </p>
    <p v-if="loading" role="status">Carregando arquivos…</p>
    <div v-else-if="error" class="file-state" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" :disabled="offline || busy" @click="refresh"
        >Tentar novamente</BaseButton
      >
    </div>
    <FileList
      v-else-if="items.length"
      :files="items"
      :busy="busy || offline"
      :highlight-id="highlightId"
      @action="action"
    />
    <p v-else class="file-state">Nenhum arquivo compartilhado neste local.</p>
    <FolderDialog v-if="operation === 'upload'" title="Enviar arquivos" :busy="busy" @close="close">
      <p>Os documentos poderão ser acessados pelos membros do projeto. Envie um arquivo por vez.</p>
      <div
        class="drop-zone"
        :class="{ dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="drop"
      >
        <Upload :size="24" aria-hidden="true" /><strong>Arraste seu arquivo aqui</strong>
        <p>Ou selecione do dispositivo</p>
        <input
          ref="input"
          class="native-file"
          tabindex="-1"
          type="file"
          :accept="acceptFiles"
          aria-label="Selecionar arquivo para enviar"
          :disabled="busy || offline"
          @change="chooseFile($event.target.files[0])"
        /><BaseButton variant="secondary" :disabled="busy || offline" @click="input.click()">{{
          upload ? 'Trocar arquivo' : 'Selecionar arquivo'
        }}</BaseButton>
      </div>
      <p v-if="upload" class="selected-file">
        {{ upload.name }} · {{ formatSize(upload.size) }}
        <BaseButton variant="ghost" :disabled="busy" @click="chooseFile(null)"
          >Remover seleção</BaseButton
        >
      </p>
      <p class="formats">
        PDF, imagens PNG/JPEG/GIF/WebP, TXT, MD, CSV e documentos Office/OpenDocument. Limite nesta
        interface: {{ maxMB }} MB; o servidor também valida o tamanho e o conteúdo.
      </p>
      <div class="destination">
        <span>Pasta de destino</span
        ><BaseButton variant="secondary" :disabled="busy || offline" @click="choosing = true"
          ><FolderOpen :size="16" aria-hidden="true" />{{ destination.name }}</BaseButton
        >
      </div>
      <div v-if="busy" role="status">
        <progress
          v-if="progress !== null"
          :value="shownProgress"
          max="100"
          aria-label="Progresso do envio"
        />
        <p>
          {{
            progress === null
              ? 'Enviando arquivo…'
              : progress === 100
                ? 'Upload transferido. Aguardando confirmação do servidor…'
                : `Enviando: ${progress}%`
          }}
        </p>
      </div>
      <p v-if="operationError" class="operation-error" role="alert">{{ operationError }}</p>
      <p v-if="offline" role="status">Você está offline. Sua seleção foi preservada.</p>
      <div class="dialog-actions">
        <BaseButton variant="secondary" :disabled="busy" @click="close">Cancelar</BaseButton
        ><BaseButton :loading="busy" :disabled="!upload || offline" @click="sendUpload"
          ><Upload :size="16" aria-hidden="true" />Enviar arquivo</BaseButton
        >
      </div>
    </FolderDialog>
    <FolderDialog v-if="operation === 'rename'" title="Renomear arquivo" :busy="busy" @close="close"
      ><form @submit.prevent="rename">
        <BaseInput
          v-model="name"
          label="Nome do arquivo"
          maxlength="255"
          autofocus
          :disabled="busy || offline"
          :error="operationError"
        />
        <p>Altera apenas o nome; o conteúdo é preservado.</p>
        <div class="dialog-actions">
          <BaseButton variant="secondary" :disabled="busy" @click="close">Cancelar</BaseButton
          ><BaseButton type="submit" :loading="busy" :disabled="!!validName || offline"
            >Salvar nome</BaseButton
          >
        </div>
      </form></FolderDialog
    >
    <FolderDialog v-if="operation === 'move'" title="Mover arquivo" :busy="busy" @close="close"
      ><p>
        Mover <strong>{{ selected.name }}</strong> para {{ destination.name }}?
      </p>
      <BaseButton variant="secondary" :disabled="busy || offline" @click="choosing = true"
        >Escolher destino</BaseButton
      >
      <p v-if="operationError" class="operation-error" role="alert">{{ operationError }}</p>
      <div class="dialog-actions">
        <BaseButton variant="secondary" :disabled="busy" @click="close">Cancelar</BaseButton
        ><BaseButton
          :loading="busy"
          :disabled="sameFolder(destination.id, folderId) || offline"
          @click="move"
          >Mover arquivo</BaseButton
        >
      </div></FolderDialog
    >
    <FolderDialog v-if="operation === 'delete'" title="Excluir arquivo" :busy="busy" @close="close"
      ><p>
        Excluir <strong>{{ selected.name }}</strong
        >?
      </p>
      <p class="delete-warning">
        O registro e o conteúdo no armazenamento serão removidos permanentemente. Não há lixeira nem
        opção de desfazer.
      </p>
      <p v-if="operationError" class="operation-error" role="alert">{{ operationError }}</p>
      <div class="dialog-actions">
        <BaseButton variant="secondary" autofocus :disabled="busy" @click="close"
          >Cancelar</BaseButton
        ><BaseButton :loading="busy" :disabled="offline" @click="remove"
          >Excluir permanentemente</BaseButton
        >
      </div></FolderDialog
    >
    <FileDestination
      v-if="choosing"
      :project-id="projectId"
      :initial="destination.id"
      @select="destinationSelected"
      @close="choosing = false"
    />
  </section>
</template>
<style scoped>
.project-files {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-2);
  min-width: 0;
}
header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
h2 {
  font-size: var(--font-size-sm);
}
header span,
.formats {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.file-state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  text-align: center;
}
.success {
  color: var(--color-success);
}
.operation-error,
.delete-warning {
  color: var(--color-danger);
  margin-top: var(--space-3);
}
.drop-zone {
  display: grid;
  place-items: center;
  gap: var(--space-3);
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-8) var(--space-3);
  margin-block: var(--space-5);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-sm);
}
.drop-zone.dragging {
  outline: var(--focus-ring);
}
.native-file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.selected-file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.destination {
  display: grid;
  gap: var(--space-2);
  margin-block: var(--space-4);
  font-size: var(--font-size-sm);
}
.destination :deep(.button) {
  justify-content: start;
}
progress {
  width: 100%;
  accent-color: var(--color-primary);
}
</style>
