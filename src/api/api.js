import axios from 'axios'
import router from '@/router'
import { getAccessToken } from '../utils/token.js'
import { clearSession, refreshAccessToken } from './session.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Endpoints em que um 401 significa "credenciais erradas", não "token expirado".
const PUBLIC_PATHS = ['/token/', '/register/']

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isPublic = PUBLIC_PATHS.some((path) => config?.url?.startsWith(path))

    if (response?.status !== 401 || !config || config._retried || isPublic) {
      return Promise.reject(error)
    }

    // Token de acesso expirado: renova uma vez e repete a requisição original.
    config._retried = true

    const token = await refreshAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`

      return api(config)
    }

    clearSession()

    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    }

    return Promise.reject(error)
  },
)

export default api
