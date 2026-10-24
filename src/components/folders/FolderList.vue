<script setup>
import { RouterLink } from 'vue-router'
import { Folder, Pencil, MoveRight, Trash2, Ellipsis } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { folderRoute } from './folderState'
defineProps({
  projectId: { type: [String, Number], required: true },
  folders: { type: Array, required: true },
})
defineEmits(['rename', 'move', 'delete'])
</script>

<template>
  <ul class="folder-list" aria-label="Pastas deste local">
    <li v-for="folder in folders" :key="folder.id" class="folder-card">
      <RouterLink
        class="folder-card__open"
        :to="folderRoute(projectId, folder.id)"
        :aria-label="`Abrir pasta ${folder.name}`"
      >
        <Folder :size="18" aria-hidden="true" />
        <div>
          <h2>{{ folder.name }}</h2>
          <p>
            <template v-if="folder.files_count != null">
              {{ folder.files_count }} {{ folder.files_count === 1 ? 'arquivo' : 'arquivos' }}
            </template>
            <template v-else>
              {{ folder.children_count ?? 0 }}
              {{ folder.children_count === 1 ? 'subpasta direta' : 'subpastas diretas' }}
            </template>
          </p>
        </div>
      </RouterLink>
      <details class="folder-card__menu">
        <summary :aria-label="`Ações de ${folder.name}`">
          <Ellipsis :size="18" aria-hidden="true" />
        </summary>
        <div class="folder-card__actions" role="group" :aria-label="`Ações de ${folder.name}`">
          <BaseButton
            variant="ghost"
            :aria-label="`Renomear pasta ${folder.name}`"
            @click="$emit('rename', folder)"
            ><Pencil :size="15" aria-hidden="true" /> Renomear</BaseButton
          >
          <BaseButton
            variant="ghost"
            :aria-label="`Mover pasta ${folder.name}`"
            @click="$emit('move', folder)"
            ><MoveRight :size="15" aria-hidden="true" /> Mover</BaseButton
          >
          <BaseButton
            variant="ghost"
            class="folder-card__delete"
            :aria-label="`Excluir pasta ${folder.name}`"
            @click="$emit('delete', folder)"
            ><Trash2 :size="15" aria-hidden="true" /> Excluir</BaseButton
          >
        </div>
      </details>
    </li>
  </ul>
</template>

<style scoped>
.folder-list {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}
.folder-card {
  position: relative;
  min-width: 0;
  min-height: 8.5rem;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  transition: min-height 220ms ease-in-out;
}
.folder-card__open {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  padding-block: var(--space-2);
}
.folder-card__open > svg {
  color: var(--color-primary);
}
.folder-card__open > div {
  min-width: 0;
}
h2 {
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
p {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.folder-card__actions {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 10rem;
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 2;
  padding: var(--space-1);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  gap: 0;
}
.folder-card__actions :deep(.button) {
  width: 100%;
  min-height: 2rem;
  justify-content: flex-start;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.folder-card__actions :deep(.button__content) {
  justify-content: flex-start;
  white-space: nowrap;
  overflow-wrap: normal;
}
.folder-card__delete {
  color: var(--color-danger);
}
.folder-card__menu {
  position: absolute;
  top: 1rem;
  right: 0.75rem;
}
.folder-card:has(.folder-card__menu[open]) {
  min-height: 10.5rem;
  z-index: 1;
}
.folder-card__menu summary {
  display: flex;
  cursor: pointer;
  list-style: none;
  padding: 0.2rem;
  color: var(--color-text-secondary);
}
.folder-card__menu summary::-webkit-details-marker {
  display: none;
}
@media (max-width: 1000px) {
  .folder-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 480px) {
  .folder-list {
    grid-template-columns: 1fr;
  }
}
</style>
