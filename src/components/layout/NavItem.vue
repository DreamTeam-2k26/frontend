<script setup>
import { RouterLink } from 'vue-router'

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
  >
    <component :is="item.icon" v-if="item.icon" class="nav-item__icon" :size="20" aria-hidden="true" />
    <span class="nav-item__label" :class="{ 'sr-only': collapsed }">{{ item.label }}</span>
  </RouterLink>
</template>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.nav-item:hover {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.nav-item--active,
.nav-item--active:hover {
  color: var(--color-primary);
}

.nav-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar */
.nav-item--sidebar {
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  font-weight: 500;
}

.nav-item--sidebar.nav-item--active {
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.nav-item--collapsed {
  justify-content: center;
}

/* Mobile */
.nav-item--mobile {
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 0.125rem;
  min-width: 0;
  padding: 0.375rem 0.25rem;
  font-size: 0.75rem;
}

.nav-item--mobile .nav-item__label {
  max-width: 100%;
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
