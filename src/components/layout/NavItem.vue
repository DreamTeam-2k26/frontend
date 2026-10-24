<script setup>
import { RouterLink } from 'vue-router'
import NavIndicator from './NavIndicator.vue'

const {
  item,
  variant = 'sidebar',
  collapsed = false,
} = defineProps({
  // { to, label, icon, exact }
  item: { type: Object, required: true },
  variant: {
    type: String,
    default: 'sidebar',
    validator: (value) => ['sidebar', 'mobile'].includes(value),
  },
  // Sidebar recolhida: só ícone.
  collapsed: { type: Boolean, default: false },
})
</script>

<template>
  <RouterLink
    :to="item.to"
    class="nav-item"
    :class="[`nav-item--${variant}`, { 'nav-item--collapsed': collapsed }]"
    :title="collapsed ? item.label : undefined"
    :active-class="item.exact ? '' : 'nav-item--active'"
    exact-active-class="nav-item--active"
    v-slot="{ isActive, isExactActive }"
  >
    <component
      :is="item.icon"
      v-if="item.icon"
      class="nav-item__icon"
      :size="20"
      aria-hidden="true"
    />
    <span class="nav-item__label" :class="{ 'sr-only': collapsed }">{{ item.label }}</span>
    <template v-if="item.exact ? isExactActive : isActive">
      <NavIndicator :group="`nav-${variant}`" :placement="variant === 'mobile' ? 'top' : 'edge'" />
    </template>
  </RouterLink>
</template>

<style scoped>
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

/* Hover só em mouse: no toque o estado ficaria preso após o clique. */
@media (hover: hover) {
  .nav-item:hover {
    color: var(--color-text);
    background-color: var(--color-bg-subtle);
  }
}

.nav-item:focus-visible {
  color: var(--color-text);
}

/* Ativo: texto forte + barra de destaque (NavIndicator: forma, não só cor). */
.nav-item--active,
.nav-item--active:hover {
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
}

.nav-item--active .nav-item__icon {
  color: var(--color-primary);
}

.nav-item__icon {
  flex-shrink: 0;
}

.nav-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar */
.nav-item--sidebar {
  gap: var(--space-3);
  min-height: 2.625rem;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.nav-item--sidebar.nav-item--active,
.nav-item--sidebar.nav-item--active:hover {
  background-color: var(--color-bg-hover);
}

.nav-item--collapsed {
  justify-content: center;
}

/* Mobile */
.nav-item--mobile {
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-1);
  min-width: 0;
  min-height: 2.75rem;
  padding: var(--space-1) 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.nav-item--mobile.nav-item--active {
  font-weight: var(--font-weight-semibold);
}

/* Rótulos de várias palavras quebram em até duas linhas ("Salas de / Projeto"). */
.nav-item--mobile .nav-item__label {
  display: -webkit-box;
  max-width: 100%;
  line-height: var(--line-height-tight);
  text-align: center;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
