import * as authApi from '@/api/auth'
import { getAccessToken } from '@/utils/token'
import * as mediaApi from '@/api/media'
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import { clearSession } from '@/api/session'
import { setAccessToken, setRefreshToken } from '@/utils/token'

export const useAuthStore = defineStore('authStore', () => {
  const state = reactive({
    user: null,
    loading: false,
    saving: false,
  })

  const user = computed(() => state.user)
  const loading = computed(() => state.loading)
  const saving = computed(() => state.saving)

  let userRequest = null
  let sessionVersion = 0

  // `force` ignora o usuário já carregado (o perfil sempre busca o dado atual).
  function fetchUser({ force = false } = {}) {
    if (state.user && !force) return Promise.resolve(state.user)
    if (userRequest) return userRequest

    const requestSession = sessionVersion
    const request = authApi
      .getCurrentUser()
      .then(({ data }) => {
        if (requestSession === sessionVersion) state.user = data
        return data
      })
      .finally(() => {
        if (userRequest === request) userRequest = null
      })
    userRequest = request
    return request
  }

  async function login({ email, password }) {
    if (state.loading) return false
    const toastId = toast.loading('Fazendo login...')

    state.loading = true

    try {
      const response = await authApi.getAccesssToken({
        email,
        password,
      })

      const accessToken = response.data.access
      const refreshToken = response.data.refresh

      sessionVersion++
      state.user = null
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
    if (state.loading) return false
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

      sessionVersion++
      state.user = null
      setAccessToken(response.data.access)
      setRefreshToken(response.data.refresh)

      toast.update(toastId, {
        render: 'Conta criada e login realizado com sucesso!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })
      return true
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

  // Compartilha o bloqueio com os formulários convencionais e com o vínculo.
  async function loginGoogle(credential) {
    if (state.loading) return false
    state.loading = true
    const version = sessionVersion
    try {
      const { data } = await authApi.loginGoogle(credential)
      if (version !== sessionVersion) return false
      if (
        typeof data?.access !== 'string' ||
        !data.access ||
        typeof data?.refresh !== 'string' ||
        !data.refresh
      ) {
        throw new Error('Resposta de autenticação inválida')
      }
      sessionVersion++
      state.user = null
      userRequest = null
      setAccessToken(data.access)
      setRefreshToken(data.refresh)
      await fetchUser({ force: true })
      toast.success('Bem-vindo!')
      return true
    } finally {
      state.loading = false
    }
  }

  async function linkGoogle(credential) {
    if (state.loading) return false
    if (!getAccessToken()) throw { response: { status: 401 } }
    state.loading = true
    try {
      const { data } = await authApi.linkGoogle(credential)
      return data
    } finally {
      state.loading = false
    }
  }

  // Envia a foto nova (se houver) e depois atualiza o perfil; quem chama só informa o que mudou.
  async function updateProfile({ name, photo = null, removePhoto = false }) {
    const toastId = toast.loading('Salvando perfil...')
    state.saving = true

    try {
      let profilePictureKey

      if (photo) {
        const upload = await mediaApi.uploadImage(photo).catch((error) => {
          error.uploadFailed = true
          throw error
        })
        profilePictureKey = upload.data.attachment_key
      } else if (removePhoto) {
        profilePictureKey = null
      }

      const response = await authApi.updateCurrentUser({ name, profilePictureKey })
      state.user = response.data

      toast.update(toastId, {
        render: 'Perfil atualizado.',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })

      return response.data
    } catch (error) {
      const data = error?.response?.data
      const fieldMessage = ['name', 'file', 'profile_picture_attachment_key', 'non_field_errors']
        .flatMap((field) => data?.[field] ?? [])
        .find((message) => typeof message === 'string')
      const fallback = error.uploadFailed
        ? 'Não foi possível enviar a foto.'
        : 'Não foi possível salvar o perfil.'
      const detail = data?.detail || fieldMessage

      toast.update(toastId, {
        render: error.uploadFailed && detail ? `${fallback} ${detail}` : detail || fallback,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      })

      throw error
    } finally {
      state.saving = false
    }
  }

  // Encerra a sessão neste navegador: apaga os tokens e o usuário em memória.
  function logout() {
    sessionVersion++
    window.google?.accounts?.id?.disableAutoSelect?.()
    clearSession()
    state.user = null
    userRequest = null
  }

  return {
    loading,
    saving,
    user,
    login,
    loginGoogle,
    linkGoogle,
    register,
    logout,
    fetchUser,
    updateProfile,
  }
})
