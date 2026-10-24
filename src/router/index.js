import { createRouter, createWebHistory } from 'vue-router'
import { House, FolderOpen, MessagesSquare, Settings } from 'lucide-vue-next'
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
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { nav: { label: 'Meus Projetos', icon: FolderOpen, order: 2, group: 'projects' } },
        },
        {
          path: 'projects/:id/folders/:folderId?',
          name: 'project-folders',
          redirect: (to) => ({
            name: 'project-detail',
            params: { id: to.params.id },
            query: { ...to.query, aba: 'pastas', pasta: to.params.folderId || undefined },
          }),
          meta: { title: 'Pastas do projeto' },
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('@/views/ProjectDetailView.vue'),
          meta: { title: 'Detalhes do projeto' },
        },
        {
          path: 'projects/:id/members',
          name: 'project-members',
          component: () => import('@/views/ProjectMembersView.vue'),
          meta: { title: 'Participantes' },
        },
        {
          path: 'example',
          name: 'example',
          component: () => import('@/views/ExampleView.vue'),
          meta: { title: 'Exemplo' },
        },
        {
          path: 'chat/:roomId(\\d+)?',
          name: 'chat',
          component: () => import('@/features/chat/views/ChatView.vue'),
          meta: {
            requiresAuth: true,
            nav: {
              label: 'Salas de Projeto',
              icon: MessagesSquare,
              order: 3,
              exact: false,
              group: 'projects',
            },
          },
        },
        {
          path: 'projects/:id(\\d+)/calls/:callId(\\d+)',
          name: 'call',
          component: () => import('@/features/calls/views/CallView.vue'),
          meta: { requiresAuth: true, title: 'Chamada' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { nav: { label: 'Configurações', icon: Settings, order: 4, group: 'personal' } },
        },
        {
          // Sem item de menu: acesso pelo bloco da conta na Sidebar e pelo avatar no header (mobile).
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { title: 'Perfil' },
        },
      ],
    },
    {
      path: '/invite/:token',
      name: 'invite-redeem',
      component: () => import('@/views/InviteRedeemView.vue'),
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

    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now() + 10000
  } catch {
    return false
  }
}

// Protege as rotas privadas.
router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)

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
