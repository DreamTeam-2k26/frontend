<script setup>
import { FileText, MoreHorizontal } from 'lucide-vue-next'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { extension, formatSize, uploadDate } from './fileState'
defineProps({
  files: { type: Array, required: true },
  busy: Boolean,
  // Arquivo recém-enviado (confirmado pela API): a linha recebe um destaque breve.
  highlightId: { type: [Number, String], default: null },
})
const emit = defineEmits(['action'])
function choose(event, file, action) {
  event.currentTarget.closest('details').open = false
  emit('action', { file, action })
}
function escape(event) {
  event.currentTarget.open = false
  event.currentTarget.querySelector('summary').focus()
}
</script>
<template>
  <table class="files-table">
    <caption class="sr-only">
      Arquivos do local aberto, do upload mais recente ao mais antigo
    </caption>
    <thead>
      <tr>
        <th scope="col">Arquivo</th>
        <th scope="col">Enviado em</th>
        <th scope="col">Por</th>
        <th scope="col"><span class="sr-only">Ações</span></th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="file in files"
        :key="file.id"
        :class="{ 'files-table__row--new': highlightId != null && file.id === highlightId }"
      >
        <td>
          <span class="file-name"
            ><FileText :size="18" aria-hidden="true" /><span
              ><strong>{{ file.name }}</strong
              ><small
                >{{ extension(file.name).toUpperCase() || file.mime_type }} ·
                {{ formatSize(file.size) }}</small
              ></span
            ></span
          >
        </td>
        <td>
          <time :datetime="file.uploaded_at">{{ uploadDate(file.uploaded_at) }}</time>
        </td>
        <td>
          <span class="author"
            ><UserAvatar
              :name="file.uploaded_by_name || ''"
              :src="file.uploaded_by_profile_picture || ''"
              size="sm"
            /><span>{{ file.uploaded_by_name || 'Pessoa não disponível' }}</span></span
          >
        </td>
        <td class="file-actions">
          <details @keydown.esc.prevent="escape">
            <summary :aria-label="`Ações do arquivo ${file.name}`">
              <MoreHorizontal :size="18" aria-hidden="true" />
            </summary>
            <div class="file-menu">
              <button
                v-for="[action, label] in [
                  ['download', 'Baixar'],
                  ['rename', 'Renomear'],
                  ['move', 'Mover'],
                  ['delete', 'Excluir'],
                ]"
                :key="action"
                type="button"
                :disabled="busy"
                :class="{ danger: action === 'delete' }"
                @click="choose($event, file, action)"
              >
                {{ label }}
              </button>
            </div>
          </details>
        </td>
      </tr>
    </tbody>
  </table>
</template>
<style scoped>
.files-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
  font-size: var(--font-size-xs);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
th {
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
td {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  overflow-wrap: anywhere;
}
th:first-child {
  width: 45%;
}
.file-name {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.file-name > svg {
  flex-shrink: 0;
  color: var(--color-primary);
}
strong {
  display: block;
  font-weight: var(--font-weight-semibold);
}
small {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
}
time {
  color: var(--color-text-secondary);
}
.author {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.file-actions {
  width: 4rem;
}
details {
  position: relative;
}
summary {
  display: grid;
  place-items: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
.file-menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 4;
  width: 11rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-md);
}
button {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-3);
  min-height: 2.75rem;
}
button:hover {
  background: var(--color-bg-subtle);
}
.danger {
  color: var(--color-danger);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 700px) {
  table,
  tbody {
    display: block;
  }
  thead {
    display: none;
  }
  tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  td {
    display: block;
    border: none;
    grid-column: 1;
    padding: var(--space-2);
  }
  .file-actions {
    grid-column: 2;
    grid-row: 1 / 4;
    width: auto;
  }
}

.files-table__row--new > td {
  animation: file-row-new 2.4s var(--ease-flow) both;
}
@keyframes file-row-new {
  from,
  25% {
    background-color: var(--color-success-soft);
  }
}
</style>
