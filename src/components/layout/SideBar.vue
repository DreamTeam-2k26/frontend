<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronDown, Folder, RefreshCw } from 'lucide-vue-next'
import NavItem from './NavItem.vue'
import AppBrand from './AppBrand.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { personName } from '@/components/projects/memberRules'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'
import { useAuthStore } from '@/stores/auth'
import { listProjects } from '@/api/projects'
import {
  isProjectSectionActive,
  projectIdFromRoute,
  projectSectionLocation,
  projectSections,
} from '@/config/projectNavigation'

const { items } = useNavigation()
const { collapsed, toggle: toggleSidebar } = useSidebar()
const authStore = useAuthStore()
const route = useRoute()

const personalItems = items.filter((item) => item.group !== 'projects')
const projectNavItems = items.filter((item) => item.group === 'projects')
const projects = ref([])
const loadingProjects = ref(false)
const projectsError = ref('')
const expandedProjectId = ref(null)
const currentProjectId = computed(() => projectIdFromRoute(route))
const isCurrentProject = (id) => currentProjectId.value === String(id)
const isExpanded = (id) => expandedProjectId.value === String(id)

// Abrir automaticamente o projeto visitado, inclusive em links diretos e ao voltar pelo navegador.
watch(currentProjectId, (id) => {
  if (id) expandedProjectId.value = id
}, { immediate: true })

let request = 0
let mounted = false
async function refreshProjects() {
  const current = ++request
  loadingProjects.value = true
  projectsError.value = ''
  try {
    const data = await listProjects()
    if (current !== request) return
    projects.value = data
      .filter((project) => Number.isInteger(Number(project.id)) && project.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  } catch {
    if (current === request) {
      projects.value = []
      projectsError.value = 'Não foi possível carregar seus projetos.'
    }
  } finally {
    if (current === request) loadingProjects.value = false
  }
}

// O botão do projeto expande/recolhe; o acesso à visão geral fica na primeira subopção.
function toggleProject(id) {
  const key = String(id)
  if (collapsed.value) {
    toggleSidebar()
    expandedProjectId.value = key
    return
  }
  expandedProjectId.value = isExpanded(key) ? null : key
}

watch(() => authStore.user?.id, (next, previous) => {
  if (mounted && previous != null && next !== previous) {
    projects.value = []
    expandedProjectId.value = currentProjectId.value
    refreshProjects()
  }
})

onMounted(() => {
  mounted = true
  refreshProjects()
  window.addEventListener('projects:changed', refreshProjects)
})
onBeforeUnmount(() => {
  mounted = false
  request++
  window.removeEventListener('projects:changed', refreshProjects)
})

// Contas antigas têm o nome padrão "Usuário": mostra a parte do e-mail em vez dele.
const userName = computed(() =>
  authStore.user ? personName(authStore.user.name, authStore.user.email) : 'Minha conta',
)
</script>

<template>
  <aside id="app-sidebar" class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar__brand">
      <AppBrand :compact="collapsed" />
    </div>
    <nav class="sidebar__nav" aria-label="Menu principal">
      <section v-if="personalItems.length" class="sidebar__group" aria-label="Espaço pessoal">
        <h2 class="sidebar__heading" :class="{ 'sr-only': collapsed }">Espaço pessoal</h2>
        <ul class="sidebar__list">
          <li v-for="item in personalItems" :key="item.name">
            <NavItem :item="item" :collapsed="collapsed" />
          </li>
        </ul>
      </section>

      <section class="sidebar__group" aria-label="Projetos">
        <h2 class="sidebar__heading" :class="{ 'sr-only': collapsed }">Projetos</h2>
        <ul class="sidebar__list">
          <li v-for="item in projectNavItems" :key="item.name">
            <NavItem :item="item" :collapsed="collapsed" />
          </li>

          <li v-if="loadingProjects && !projects.length && !collapsed" class="sidebar__state" role="status">
            Carregando projetos…
          </li>
          <li v-if="projectsError && !collapsed" class="sidebar__state" role="alert">
            <span>{{ projectsError }}</span>
            <button type="button" class="sidebar__retry" @click="refreshProjects">
              <RefreshCw :size="14" aria-hidden="true" /> Tentar novamente
            </button>
          </li>
          <li
            v-for="project in projects"
            :key="project.id"
            class="sidebar__project"
          >
            <button
              type="button"
              class="sidebar__project-toggle"
              :class="{ 'sidebar__project-toggle--active': isCurrentProject(project.id) }"
              :aria-label="(isExpanded(project.id) && !collapsed ? 'Recolher' : 'Expandir') + ' seções do projeto ' + project.name"
              :aria-expanded="!collapsed && isExpanded(project.id)"
              :aria-controls="'sidebar-project-' + project.id"
              :title="collapsed ? project.name : undefined"
              @click="toggleProject(project.id)"
            >
              <Folder :size="18" aria-hidden="true" />
              <span v-if="!collapsed" class="sidebar__project-name">{{ project.name }}</span>
              <ChevronDown
                v-if="!collapsed"
                :size="15"
                class="sidebar__chevron"
                :class="{ 'sidebar__chevron--open': isExpanded(project.id) }"
                aria-hidden="true"
              />
            </button>

            <ul
              :id="'sidebar-project-' + project.id"
              v-show="!collapsed && isExpanded(project.id)"
              class="sidebar__project-sections"
              :aria-label="'Seções de ' + project.name"
            >
              <li v-for="section in projectSections" :key="section.key">
                <RouterLink
                  :to="projectSectionLocation(project.id, section.key)"
                  class="sidebar__section-link"
                  :class="{ 'sidebar__section-link--active': isProjectSectionActive(route, project.id, section.key) }"
                  :aria-current="isProjectSectionActive(route, project.id, section.key) ? 'page' : undefined"
                >
                  <component :is="section.icon" :size="16" aria-hidden="true" />
                  <span class="sidebar__section-name">{{ section.label }}</span>
                </RouterLink>
              </li>
            </ul>
          </li>
          <li v-if="!loadingProjects && !projectsError && !projects.length && !collapsed" class="sidebar__state">
            Nenhum projeto ainda.
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
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
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
  overflow: hidden;
  transition: padding-inline 0.28s cubic-bezier(0.4, 0, 0.2, 1);
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
  padding-inline: calc((var(--sidebar-width-collapsed) - 2.75rem) / 2);
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
.sidebar__project {
  min-width: 0;
}
.sidebar__project-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 2.625rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.sidebar__project-toggle:hover,
.sidebar__project-toggle--active {
  color: var(--color-text);
  background-color: var(--color-bg-subtle);
}
.sidebar__project-toggle--active > svg:first-child {
  color: var(--color-primary);
}
.sidebar__project-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sidebar__chevron {
  flex-shrink: 0;
  transition: transform 0.18s ease;
}
.sidebar__chevron--open {
  transform: rotate(180deg);
}
.sidebar__project-sections {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: var(--space-1) 0 var(--space-2) var(--space-5);
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-border);
}
.sidebar__project-sections[style*='display: none'] {
  display: none;
}
.sidebar__section-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.25rem;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  transition: color 0.15s ease, background-color 0.15s ease;
}
.sidebar__section-link:hover {
  color: var(--color-text);
  background-color: var(--color-bg-subtle);
}
.sidebar__section-link--active {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  background-color: var(--color-bg-hover);
  box-shadow: inset 3px 0 0 var(--color-primary);
}
.sidebar__section-link--active > svg {
  color: var(--color-primary);
}
.sidebar__section-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sidebar__state {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.sidebar__retry {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  color: var(--color-primary-hover);
  font-weight: var(--font-weight-semibold);
}
.sidebar--collapsed .sidebar__project-toggle {
  justify-content: center;
  padding-inline: var(--space-2);
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
