import { createRouter, createWebHistory } from 'vue-router'
import { House, LayoutGrid, MessagesSquare, Settings } from 'lucide-vue-next'
import { getAccessToken } from '@/utils/token'

// Rotas com `meta.nav` aparecem na SideBar e na MobileNavBar.
// nav: { label, icon (componente lucide), order, exact? }
// requiresAuth: exige token de acesso; sem ele a navegação vai para o login.

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { nav: { label: 'Início', icon: House, order: 1 } },
        },
        {
          path: 'example',
          name: 'example',
          component: () => import('@/views/ExampleView.vue'),
          meta: { nav: { label: 'Exemplo', icon: LayoutGrid, order: 2 } },
        },
        {
          path: 'chat/:roomId(\\d+)?',
          name: 'chat',
          component: () => import('@/features/chat/views/ChatView.vue'),
          meta: {
            requiresAuth: true,
            nav: { label: 'Chat', icon: MessagesSquare, order: 3, exact: false },
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { nav: { label: 'Configurações', icon: Settings, order: 4 } },
        },
      ],
    },
    {
      path: '/auth/',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        { path: '', redirect: { name: 'login' } },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAccessToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
