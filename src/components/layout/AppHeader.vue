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
  gap: var(--space-4);
  height: var(--header-height);
  /* Esquerda menor: o ícone do toggle fica na mesma coluna dos ícones da Sidebar. */
  padding: 0 var(--space-6) 0 var(--space-3);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.header__start {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

/* Mesmo alvo de toque do ThemeToggle (2.75rem). */
.header__toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-10) + var(--space-1));
  height: calc(var(--space-10) + var(--space-1));
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.header__toggle:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.header__title {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
}

/* Breakpoint igual ao do DefaultLayout. */
@media (max-width: 767px) {
  .header {
    gap: var(--space-3);
    padding: 0 var(--space-4);
  }

  .header__toggle {
    display: none;
  }

  /* Sem espaço para marca + título; a página e a barra inferior já indicam onde se está. */
  .header__title {
    display: none;
  }
}
</style>
