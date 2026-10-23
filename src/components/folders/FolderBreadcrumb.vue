<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight, Home } from 'lucide-vue-next'
import { folderRoute } from './folderState'
defineProps({
  projectId: { type: [String, Number], required: true },
  path: { type: Array, default: () => [] },
})
</script>

<template>
  <nav aria-label="Caminho das pastas">
    <ol class="breadcrumb">
      <li>
        <RouterLink :to="folderRoute(projectId)" :aria-current="!path.length ? 'page' : undefined"
          ><Home :size="16" aria-hidden="true" /> Raiz</RouterLink
        >
      </li>
      <li v-for="(folder, index) in path" :key="folder.id">
        <ChevronRight :size="14" aria-hidden="true" />
        <span v-if="index === path.length - 1" aria-current="page">{{ folder.name }}</span>
        <RouterLink v-else :to="folderRoute(projectId, folder.id)">{{ folder.name }}</RouterLink>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
li,
a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
li {
  max-width: 100%;
}
a,
span {
  padding-block: var(--space-2);
  overflow-wrap: anywhere;
  min-width: 0;
}
li > svg {
  color: var(--color-text-secondary);
}
a {
  color: var(--color-primary-hover);
}
</style>
