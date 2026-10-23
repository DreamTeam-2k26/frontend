<script setup>
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
const label = computed(() =>
  isDark.value ? 'Tema escuro. Ativar tema claro.' : 'Tema claro. Ativar tema escuro.',
)
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <component :is="isDark ? Moon : Sun" :size="20" aria-hidden="true" />
    <span class="theme-toggle__label">Tema {{ isDark ? 'escuro' : 'claro' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: calc(var(--space-10) + var(--space-1));
  min-height: calc(var(--space-10) + var(--space-1));
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  background-color: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-base);
  white-space: nowrap;
}

.theme-toggle:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-primary);
}

.theme-toggle:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 3px;
}

@media (max-width: 767px) {
  .theme-toggle {
    padding: var(--space-2);
  }

  .theme-toggle__label {
    display: none;
  }
}
</style>
