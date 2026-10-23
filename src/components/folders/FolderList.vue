<script setup>
import { RouterLink } from 'vue-router'
import { Folder, Pencil, MoveRight, Trash2 } from 'lucide-vue-next'
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
        <Folder :size="30" aria-hidden="true" />
        <div>
          <h2>{{ folder.name }}</h2>
          <p>
            {{ folder.children_count }}
            {{ folder.children_count === 1 ? 'subpasta direta' : 'subpastas diretas' }}
          </p>
        </div>
      </RouterLink>
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
    </li>
  </ul>
</template>

<style scoped>
.folder-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
  gap: var(--space-4);
}
.folder-card {
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.folder-card__open {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
}
.folder-card__open > svg {
  color: var(--color-primary);
}
.folder-card__open > div {
  min-width: 0;
}
h2 {
  font-size: var(--font-size-md);
  overflow-wrap: anywhere;
}
p {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.folder-card__actions {
  display: flex;
  flex-wrap: wrap;
  margin-top: var(--space-3);
  gap: var(--space-1);
}
.folder-card__actions :deep(.button) {
  padding-inline: var(--space-2);
  font-size: var(--font-size-xs);
}
.folder-card__delete {
  color: var(--color-danger);
}
</style>
