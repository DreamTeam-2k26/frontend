<script setup>
import NavItem from './NavItem.vue'
import { appConfig } from '@/config/app'
import { useNavigation } from '@/composables/useNavigation'

const { items } = useNavigation()
const visibleItems = items.slice(0, appConfig.mobileNavLimit)
</script>

<template>
  <nav class="mobile-nav" aria-label="Menu principal">
    <NavItem v-for="item in visibleItems" :key="item.name" :item="item" variant="mobile" />
  </nav>
</template>

<style scoped>
.mobile-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-nav);
  display: flex;
  height: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
  padding: 0.25rem 0.5rem env(safe-area-inset-bottom);
  background-color: var(--color-background);
  border-top: 1px solid var(--color-border);
}
</style>
