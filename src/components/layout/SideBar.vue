<script setup>
import { computed } from 'vue'
import NavItem from './NavItem.vue'
import AppBrand from './AppBrand.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { personName } from '@/components/projects/memberRules'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'
import { useAuthStore } from '@/stores/auth'

const { items } = useNavigation()
const { collapsed } = useSidebar()
const authStore = useAuthStore()
const groups = computed(() =>
  [
    { label: 'Espaço pessoal', items: items.filter((item) => item.group !== 'projects') },
    { label: 'Projetos', items: items.filter((item) => item.group === 'projects') },
  ].filter((group) => group.items.length),
)
// Contas antigas têm o nome padrão "Usuário": mostra a parte do e-mail em vez dele.
const userName = computed(() =>
  authStore.user ? personName(authStore.user.name, authStore.user.email) : 'Minha conta',
)
</script>

<template>
  <aside id="app-sidebar" class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar__brand">
      <AppBrand />
    </div>
    <nav class="sidebar__nav" aria-label="Menu principal">
      <section
        v-for="group in groups"
        :key="group.label"
        class="sidebar__group"
        :aria-label="group.label"
      >
        <h2 class="sidebar__heading" :class="{ 'sr-only': collapsed }">{{ group.label }}</h2>
        <ul class="sidebar__list">
          <li v-for="item in group.items" :key="item.name">
            <NavItem :item="item" :collapsed="collapsed" />
          </li>
        </ul>
      </section>
    </nav>
    <RouterLink
      :to="{ name: 'profile' }"
      class="sidebar__account"
      active-class="sidebar__account--active"
      :title="collapsed ? userName : undefined"
    >
      <UserAvatar :name="userName" :src="authStore.user?.profile_picture?.url" size="sm" />
      <div v-if="!collapsed" class="sidebar__identity">
        <span class="sidebar__name">{{ userName }}</span>
        <span class="sidebar__caption">Ver perfil</span>
      </div>
      <span v-else class="sr-only">{{ userName }}, ver perfil</span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: var(--sidebar-width);
  height: 100dvh;
  min-height: 0;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  transition: width 0.2s ease;
}
.sidebar--collapsed {
  width: var(--sidebar-width-collapsed);
}
.sidebar__brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-height: var(--header-height);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}
.sidebar__brand :deep(.brand) {
  min-width: 0;
  max-width: 100%;
}
.sidebar__brand :deep(.brand__logo) {
  max-width: 100%;
  height: auto;
  max-height: var(--space-8);
}
.sidebar--collapsed .sidebar__brand {
  justify-content: center;
  padding-inline: var(--space-2);
}
.sidebar__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-8) var(--space-3);
}
.sidebar__group + .sidebar__group {
  margin-top: var(--space-8);
}
.sidebar__heading {
  margin: 0 var(--space-3) var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-base);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.sidebar__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar__account {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--header-height);
  padding: var(--space-3) var(--space-4);
  color: inherit;
  border-top: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}
.sidebar__account:hover,
.sidebar__account--active {
  background-color: var(--color-bg-hover);
}
.sidebar__account:focus-visible {
  outline-offset: -3px;
}
.sidebar__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sidebar__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.sidebar__caption {
  font-size: var(--font-size-xs);
}
.sidebar--collapsed .sidebar__account {
  justify-content: center;
  padding-inline: var(--space-2);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
