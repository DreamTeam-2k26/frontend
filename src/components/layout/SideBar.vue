<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import NavItem from './NavItem.vue'
import AppBrand from './AppBrand.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { personName } from '@/components/projects/memberRules'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'
import { useAuthStore } from '@/stores/auth'
import { getProject } from '@/api/projects'
import {
  isProjectSectionActive,
  projectIdFromRoute,
  projectSectionLocation,
  projectSections,
} from '@/config/projectNavigation'

const { items } = useNavigation()
const { collapsed } = useSidebar()
const authStore = useAuthStore()
const route = useRoute()

// Início, Meus Projetos, Salas de Projeto e Configurações são navegação pessoal.
const personalItems = items.filter((item) => item.group !== 'project')

// O menu contextual possui UM projeto: o último que o usuário abriu.
// Não há lista de projetos, seta de expansão nem accordion.
const activeProject = ref(null)
const loadingProject = ref(false)
const projectLoadError = ref('')
const currentProjectId = computed(() => projectIdFromRoute(route))

let request = 0
let controller

async function loadCurrentProject(id) {
  const current = ++request
  controller?.abort()
  const signalController = new AbortController()
  controller = signalController
  loadingProject.value = true
  projectLoadError.value = ''
  activeProject.value = null

  try {
    const project = await getProject(id, { signal: signalController.signal })
    if (current !== request || currentProjectId.value !== id) return
    if (String(project.id) !== id) throw new Error('Projeto divergente')
    activeProject.value = project
  } catch {
    if (current === request && !signalController.signal.aborted) {
      projectLoadError.value = 'Não foi possível carregar este projeto.'
    }
  } finally {
    if (current === request) loadingProject.value = false
  }
}

// A rota define o contexto. Nas páginas pessoais, mantém o último projeto aberto
// na sidebar para o usuário poder voltar rapidamente.
watch(
  currentProjectId,
  (id) => {
    if (id && String(activeProject.value?.id) !== id) loadCurrentProject(id)
  },
  { immediate: true },
)

function onProjectUpdated(event) {
  const updated = event?.detail?.project
  if (
    updated?.id != null &&
    String(updated.id) === String(activeProject.value?.id) &&
    updated.name
  ) {
    activeProject.value = { ...activeProject.value, name: updated.name }
  }
}

function onProjectRemoved(event) {
  const id = String(event.detail?.id)
  if (id !== String(activeProject.value?.id) && id !== currentProjectId.value) return
  request++
  controller?.abort()
  activeProject.value = null
  loadingProject.value = false
  projectLoadError.value = ''
}

// Nunca reaproveitar o contexto de uma conta na conta seguinte.
watch(
  () => authStore.user?.id,
  (next, previous) => {
    if (previous != null && next !== previous) {
      request++
      controller?.abort()
      activeProject.value = null
      loadingProject.value = false
      projectLoadError.value = ''
    }
  },
)

onMounted(() => {
  window.addEventListener('sidebar:project-updated', onProjectUpdated)
  window.addEventListener('sidebar:project-removed', onProjectRemoved)
})
onBeforeUnmount(() => {
  request++
  controller?.abort()
  window.removeEventListener('sidebar:project-updated', onProjectUpdated)
  window.removeEventListener('sidebar:project-removed', onProjectRemoved)
})

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

      <section
        v-if="activeProject || loadingProject || projectLoadError"
        class="sidebar__group sidebar__project-group"
        :aria-label="activeProject ? 'Projeto ' + activeProject.name : 'Projeto atual'"
      >
        <h2
          v-if="activeProject"
          class="sidebar__heading sidebar__project-heading"
          :class="{ 'sr-only': collapsed }"
          :title="activeProject.name"
        >
          {{ activeProject.name }}
        </h2>
        <h2 v-else class="sidebar__heading" :class="{ 'sr-only': collapsed }">Projeto atual</h2>
        <p v-if="loadingProject && !collapsed" class="sidebar__state" role="status">
          Carregando projeto…
        </p>
        <div v-else-if="projectLoadError && !collapsed" class="sidebar__state" role="alert">
          <p>{{ projectLoadError }}</p>
          <button
            v-if="currentProjectId"
            type="button"
            class="sidebar__retry"
            @click="loadCurrentProject(currentProjectId)"
          >
            <RefreshCw :size="14" aria-hidden="true" /> Tentar novamente
          </button>
        </div>
        <ul
          v-if="activeProject"
          class="sidebar__list"
          :aria-label="'Navegação de ' + activeProject.name"
        >
          <li v-for="section in projectSections" :key="section.key">
            <RouterLink
              :to="projectSectionLocation(activeProject.id, section.key)"
              class="sidebar__section-link"
              :class="{
                'sidebar__section-link--collapsed': collapsed,
                'sidebar__section-link--active': isProjectSectionActive(
                  route,
                  activeProject.id,
                  section.key,
                ),
              }"
              :title="collapsed ? section.label : undefined"
              :aria-current="
                isProjectSectionActive(route, activeProject.id, section.key) ? 'page' : undefined
              "
            >
              <component :is="section.icon" :size="20" aria-hidden="true" />
              <span class="sidebar__section-name" :class="{ 'sr-only': collapsed }">{{
                section.label
              }}</span>
            </RouterLink>
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
.sidebar__project-heading {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar__section-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 2.625rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
@media (hover: hover) {
  .sidebar__section-link:hover {
    color: var(--color-text);
    background-color: var(--color-bg-subtle);
  }
}
.sidebar__section-link--active,
.sidebar__section-link--active:hover {
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
  background-color: var(--color-bg-hover);
}
.sidebar__section-link--active::before {
  position: absolute;
  content: '';
  top: var(--space-1);
  bottom: var(--space-1);
  left: calc(-1 * var(--space-3));
  width: 3px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
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
.sidebar__section-link--collapsed {
  justify-content: center;
  padding-inline: var(--space-2);
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
