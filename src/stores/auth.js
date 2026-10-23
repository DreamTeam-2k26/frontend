import * as authApi from '@/api/auth'
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import { setAccessToken, setRefreshToken } from '@/utils/token'

export const useAuthStore = defineStore('authStore', () => {
  const state = reactive({
    user: null,
    loading: false,
  })

  const user = computed(() => state.user)
  const loading = computed(() => state.loading)

  async function login({ email, password }) {
    const toastId = toast.loading('Fazendo login...')

    state.loading = true

    try {
      const response = await authApi.getAccesssToken({
        email,
        password,
      })

      const accessToken = response.data.access
      const refreshToken = response.data.refresh

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      toast.update(toastId, {
        render: 'Bem-vindo!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })

      return response.data
    } catch (error) {
      toast.update(toastId, {
        render: error?.response?.data?.detail || 'Não foi possível fazer login.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })

      throw error
    } finally {
      state.loading = false
    }
  }

  async function register({ name, email, password }) {
    const toastId = toast.loading('Registrando sua conta...')
    state.loading = true

    try {
      await authApi.register({ name, email, password })

      toast.update(toastId, {
        render: 'Conta criada! Fazendo login...',
        type: 'info',
        isLoading: true,
        autoClose: false,
      })

      const response = await authApi.getAccesssToken({
        email,
        password,
      })

      setAccessToken(response.data.access)
      setRefreshToken(response.data.refresh)

      toast.update(toastId, {
        render: 'Conta criada e login realizado com sucesso!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      const data = error?.response?.data
      const fieldMessage = ['name', 'email', 'password', 'non_field_errors']
        .flatMap((field) => data?.[field] ?? [])
        .find((message) => typeof message === 'string')

      toast.update(toastId, {
        render: data?.detail || fieldMessage || 'Não foi possível concluir o cadastro.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })

      throw error
    } finally {
      state.loading = false
    }
  }

  return {
    loading,
    user,
    login,
    register,
  }
})
