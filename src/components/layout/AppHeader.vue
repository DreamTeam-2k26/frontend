<script setup>
import { computed } from 'vue'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import AppBrand from './AppBrand.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'

const { pageTitle } = useNavigation()
const { collapsed, toggle } = useSidebar()

const toggleIcon = computed(() => (collapsed.value ? PanelLeftOpen : PanelLeftClose))
const toggleLabel = computed(() => (collapsed.value ? 'Expandir menu' : 'Recolher menu'))
</script>

<template>
  <header class="header">
    <div class="header__start">
      <button
        type="button"
        class="header__toggle"
        :aria-label="toggleLabel"
        :aria-expanded="!collapsed"
        aria-controls="app-sidebar"
        @click="toggle"
      >
        <component :is="toggleIcon" :size="20" aria-hidden="true" />
      </button>
      <AppBrand />
      <span v-if="pageTitle" class="header__title">{{ pageTitle }}</span>
    </div>

    <div v-if="$slots.actions" class="header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--header-height);
  padding: 0 1rem;
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.header__start {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.header__toggle {
  display: inline-flex;
  padding: 0.5rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.header__toggle:hover {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.header__title {
  padding-left: 0.75rem;
  overflow: hidden;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
  border-left: 1px solid var(--color-border);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Breakpoint igual ao do DefaultLayout. */
@media (max-width: 767px) {
  .header__toggle {
    display: none;
  }
}
</style>
