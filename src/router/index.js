import { createRouter, createWebHistory } from 'vue-router'
import { House, LayoutGrid, Settings } from 'lucide-vue-next'

// Rotas com `meta.nav` aparecem na SideBar e na MobileNavBar.
// nav: { label, icon (componente lucide), order, exact? }

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
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { nav: { label: 'Configurações', icon: Settings, order: 3 } },
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

export default router
