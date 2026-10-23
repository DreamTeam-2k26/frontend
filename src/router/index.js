import { createRouter, createWebHistory } from 'vue-router'
import { House, LayoutGrid, Settings } from 'lucide-vue-next'

import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  removeAccessToken,
  removeRefreshToken,
} from '@/utils/token'

import { getRefreshToken as refreshAccessToken } from '@/api/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: {
            nav: { label: 'Início', icon: House, order: 1 },
          },
        },
        {
          path: 'example',
          name: 'example',
          component: () => import('@/views/ExampleView.vue'),
          meta: {
            nav: { label: 'Exemplo', icon: LayoutGrid, order: 2 },
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: {
            nav: { label: 'Configurações', icon: Settings, order: 3 },
          },
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

// Verifica se o JWT existe e ainda não expirou.
// O backend continua responsável por validar sua assinatura.
function isAccessTokenValid(token) {
  if (!token) return false

  try {
    const payload = token.split('.')[1]
    if (!payload) return false

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized))

    return (
      typeof decoded.exp === 'number' &&
      decoded.exp * 1000 > Date.now() + 10000
    )
  } catch {
    return false
  }
}

// Protege as rotas privadas.
router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(
    (route) => route.meta.requiresAuth
  )

  // Rotas públicas continuam acessíveis.
  if (!requiresAuth) return true

  // Access token válido: permite navegação.
  if (isAccessTokenValid(getAccessToken())) {
    return true
  }

  // Access token expirado: tenta renovar.
  const refreshToken = getRefreshToken()

  if (refreshToken) {
    try {
      const response = await refreshAccessToken({ refreshToken })

      setAccessToken(response.data.access)

      if (response.data.refresh) {
        setRefreshToken(response.data.refresh)
      }

      return true
    } catch {
      // Refresh inválido ou expirado.
    }
  }

  // Sem sessão válida: limpa tokens.
  removeAccessToken()
  removeRefreshToken()

  return {
    name: 'login',
    query: { redirect: to.fullPath },
  }
})

export default router
