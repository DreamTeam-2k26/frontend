<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import MobileNavBar from '@/components/layout/MobileNavBar.vue'
import SideBar from '@/components/layout/SideBar.vue'
import { personName } from '@/components/projects/memberRules'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import CallNotifier from '@/features/calls/components/CallNotifier.vue'
import { useChatStore } from '@/features/chat/stores/chat'
import { pageKey } from '@/utils/pageTransition'

// O chat fica ligado em todas as páginas logadas para avisar de mensagens novas.
const chat = useChatStore()
const auth = useAuthStore()

onMounted(() => {
  auth.fetchUser().catch(() => {
    // Mantém o nome de fallback se o perfil estiver indisponível.
    // A API já trata renovação de token e sessão expirada.
  })
  chat.start()
})
onBeforeUnmount(() => chat.stop())
</script>

<template>
  <div class="layout">
    <AppHeader class="layout__header">
      <template #actions>
        <ThemeToggle />
        <!-- No celular a Sidebar some; o perfil fica acessível pelo avatar. -->
        <RouterLink
          :to="{ name: 'profile' }"
          class="layout__profile-link"
          :aria-label="`Perfil de ${auth.user ? personName(auth.user.name, auth.user.email) : 'usuário'}`"
        >
          <UserAvatar
            :name="auth.user ? personName(auth.user.name, auth.user.email) : ''"
            :src="auth.user?.profile_picture?.url"
            size="md"
          />
        </RouterLink>
      </template>
    </AppHeader>
    <SideBar class="layout__sidebar" />
    <main class="layout__main">
      <!-- Só o conteúdo entra suave; header, sidebar, chat e avisos seguem montados. O wrapper
           garante um elemento raiz para a transição, qualquer que seja a view. -->
      <RouterView v-slot="{ Component, route }">
        <Transition name="page">
          <div :key="pageKey(route)" class="layout__page">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </main>
    <AppFooter class="layout__footer" />
    <MobileNavBar class="layout__mobile-nav" />
    <CallNotifier />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-areas:
    'sidebar header'
    'sidebar main'
    'sidebar footer';
  grid-template-rows: auto 1fr auto;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-surface);
}

.layout__header {
  grid-area: header;
}

.layout__sidebar {
  grid-area: sidebar;
}

.layout__main {
  grid-area: main;
  min-width: 0;
}

.layout__footer {
  grid-area: footer;
}

.layout__page {
  min-width: 0;
}

/* Páginas de altura total (conversa do projeto): sem rodapé, a tela não rola. */
.layout:has(.project-detail--fill) .layout__footer {
  display: none;
}

/* Só entrada: a página anterior sai na hora, sem atrasar a navegação. */
.page-leave-active {
  display: none;
}

.page-enter-active {
  transition:
    opacity var(--motion-base) var(--ease-flow),
    transform var(--motion-base) var(--ease-flow);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.layout__mobile-nav {
  display: none;
}

.layout__profile-link {
  display: none;
  border-radius: var(--radius-full);
}

/* Celular: sem sidebar, com barra inferior. */
@media (max-width: 767px) {
  .layout {
    grid-template-areas:
      'header'
      'main'
      'footer';
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
  }

  .layout__sidebar {
    display: none;
  }

  .layout__mobile-nav {
    display: flex;
  }

  .layout__profile-link {
    display: inline-flex;
  }
}
</style>
