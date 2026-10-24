<script setup>
import { reactive, shallowRef, useId, useTemplateRef } from 'vue'
import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Presentation,
  RotateCw,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB, fileKind, formatBytes } from '@/utils/files'

// Seção do painel: arquivos anexados à tarefa (ficam guardados nos arquivos do projeto).
const detail = useTaskDetailStore()

const ids = { title: useId(), hint: useId() }
const input = useTemplateRef('input')
const dragging = shallowRef(false)
const removing = reactive({ file: null, busy: false })

const ICONS = {
  pdf: FileText,
  image: FileImage,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  text: FileText,
  other: File,
}
const accept = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',')

const menuItems = [
  { id: 'download', label: 'Baixar', icon: Download },
  { id: 'sep', separator: true },
  { id: 'remove', label: 'Remover da tarefa', icon: Trash2, danger: true },
]

function pick() {
  input.value?.click()
}

function onPicked(event) {
  detail.uploadFiles([...event.target.files])
  event.target.value = ''
}

// Arrastar arquivos do computador para a seção.
let dragDepth = 0
function onDragEnter(event) {
  if (!event.dataTransfer?.types?.includes('Files')) return
  dragDepth++
  dragging.value = true
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) dragging.value = false
}
function onDrop(event) {
  dragDepth = 0
  dragging.value = false
  const dropped = [...(event.dataTransfer?.files ?? [])]
  if (dropped.length) detail.uploadFiles(dropped)
}

function onMenu(file, action) {
  if (action === 'download') detail.downloadFile(file).catch(() => {})
  else removing.file = file
}

async function confirmRemove() {
  removing.busy = true
  try {
    await detail.removeFile(removing.file)
  } catch {
    // Toast exibido pela store.
  } finally {
    Object.assign(removing, { file: null, busy: false })
  }
}

const meta = (file) =>
  [formatBytes(file.size), file.uploaded_by_name && `enviado por ${file.uploaded_by_name}`]
    .filter(Boolean)
    .join(', ')
</script>

<template>
  <section
    class="files"
    :class="{ 'files--dragging': dragging }"
    :aria-labelledby="ids.title"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <header class="files__header">
      <h3 :id="ids.title" class="files__title">
        Arquivos <span class="files__count">({{ detail.files.length }})</span>
      </h3>
      <button type="button" class="files__add" :aria-describedby="ids.hint" @click="pick">
        <Plus :size="15" aria-hidden="true" /> Adicionar
      </button>
      <input
        ref="input"
        class="visually-hidden"
        type="file"
        multiple
        :accept="accept"
        tabindex="-1"
        aria-hidden="true"
        @change="onPicked"
      />
    </header>

    <TransitionGroup tag="ul" name="file" class="files__list">
      <li v-for="file in detail.files" :key="`file-${file.id}`" class="files__item">
        <span class="files__tile" :class="`files__tile--${fileKind(file.name)}`" aria-hidden="true">
          <component :is="ICONS[fileKind(file.name)]" :size="17" />
        </span>
        <button
          type="button"
          class="files__name-button"
          @click="detail.downloadFile(file).catch(() => {})"
        >
          <span class="files__name">{{ file.name }}</span>
          <span class="files__meta">{{ meta(file) }}</span>
          <span class="visually-hidden">(baixar)</span>
        </button>
        <ActionMenu
          :label="`Ações do arquivo ${file.name}`"
          :items="menuItems"
          @select="onMenu(file, $event)"
        />
      </li>

      <li
        v-for="upload in detail.uploads"
        :key="`upload-${upload.key}`"
        class="files__item files__item--upload"
        :class="{ 'files__item--failed': upload.status === 'error' }"
      >
        <span class="files__tile files__tile--sending" aria-hidden="true">
          <Upload :size="17" />
        </span>
        <div class="files__upload">
          <span class="files__name">{{ upload.name }}</span>
          <template v-if="upload.status === 'sending'">
            <span
              class="files__progress"
              role="progressbar"
              :aria-valuenow="Math.round(upload.progress * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`Enviando ${upload.name}`"
            >
              <span
                class="files__progress-fill"
                :style="{ width: `${Math.round(upload.progress * 100)}%` }"
              />
            </span>
          </template>
          <span v-else class="files__error" role="alert">{{ upload.error }}</span>
        </div>
        <template v-if="upload.status === 'error'">
          <button
            type="button"
            class="files__icon-button"
            :aria-label="`Tentar enviar ${upload.name} de novo`"
            @click="detail.retryUpload(upload.key)"
          >
            <RotateCw :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="files__icon-button"
            :aria-label="`Descartar ${upload.name}`"
            @click="detail.dismissUpload(upload.key)"
          >
            <X :size="15" aria-hidden="true" />
          </button>
        </template>
        <span v-else class="files__percent">{{ Math.round(upload.progress * 100) }}%</span>
      </li>
    </TransitionGroup>

    <button
      v-if="!detail.files.length && !detail.uploads.length"
      type="button"
      class="files__empty"
      @click="pick"
    >
      <Upload :size="18" aria-hidden="true" />
      Arraste arquivos aqui ou clique para enviar
    </button>
    <p :id="ids.hint" class="files__hint">
      PDF, imagens, documentos, planilhas e apresentações, até {{ MAX_UPLOAD_MB }} MB.
    </p>

    <ConfirmDialog
      v-if="removing.file"
      title="Remover arquivo da tarefa"
      :message="`Remover “${removing.file.name}” desta tarefa? O arquivo continua na área de arquivos do projeto.`"
      confirm-label="Remover da tarefa"
      :busy="removing.busy"
      @confirm="confirmRemove"
      @cancel="removing.file = null"
    />
  </section>
</template>

<style scoped>
.files {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}
.files--dragging {
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.files__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.files__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.files__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.files__add {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.files__add:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}
.files__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.files__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 3.25rem;
  margin: 0 calc(-1 * var(--space-2));
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
}
.files__item:hover {
  background: var(--color-bg-hover);
}
.files__tile {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-subtle);
}
.files__tile--pdf {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.files__tile--image,
.files__tile--doc {
  color: var(--color-info);
  background: var(--color-info-soft);
}
.files__tile--sheet {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.files__tile--slides {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}
.files__tile--sending {
  color: var(--color-primary);
  animation: files-lift 1.2s ease-in-out infinite;
}
.files__name-button,
.files__upload {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.files__name-button:hover .files__name {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
.files__name {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.files__meta {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.files__progress {
  height: 0.25rem;
  margin-top: var(--space-1);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
}
.files__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
  transition: width 0.2s ease;
}
.files__percent {
  min-width: 2.5rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.files__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.files__item--failed .files__tile {
  color: var(--color-danger);
  background: var(--color-danger-soft);
  animation: none;
}
.files__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}
.files__icon-button:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.files__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}
.files__empty:hover {
  color: var(--color-primary-hover);
  border-color: var(--color-primary);
}
.files__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.file-enter-active,
.file-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.file-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.file-leave-to {
  opacity: 0;
}
@keyframes files-lift {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}
</style>
