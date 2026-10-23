<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import MobileNavBar from '@/components/layout/MobileNavBar.vue'
import SideBar from '@/components/layout/SideBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/features/chat/stores/chat'

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
    <AppHeader class="layout__header" />
    <SideBar class="layout__sidebar" />
    <main class="layout__main">
      <RouterView />
    </main>
    <AppFooter class="layout__footer" />
    <MobileNavBar class="layout__mobile-nav" />
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

.layout__mobile-nav {
  display: none;
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
}
</style>
