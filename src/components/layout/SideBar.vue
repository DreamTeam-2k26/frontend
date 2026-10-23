<script setup>
import NavItem from './NavItem.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'

const { items } = useNavigation()
const { collapsed } = useSidebar()
</script>

<template>
  <aside id="app-sidebar" class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <nav class="sidebar__nav" aria-label="Menu principal">
      <ul class="sidebar__list">
        <li v-for="item in items" :key="item.name">
          <NavItem :item="item" :collapsed="collapsed" />
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: var(--header-height);
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  padding: 1rem 0.75rem;
  overflow-y: auto;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
  transition: width 0.2s ease;
}

.sidebar--collapsed {
  width: var(--sidebar-width-collapsed);
}

.sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
