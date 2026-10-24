import axios from 'axios'
import {
  getRefreshToken,
  removeAccessToken,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/utils/token'

let inflight = null

export function clearSession() {
  removeAccessToken()
  removeRefreshToken()
}

/**
 * Renova o token de acesso com o refresh token. Chamadas simultâneas compartilham uma única requisição.
 * Devolve o novo token, ou null se não foi possível. A sessão só é apagada quando o servidor
 * recusa o refresh token (400/401); uma falha de rede não desloga ninguém.
 */
export function refreshAccessToken() {
  if (inflight) return inflight

  const refresh = getRefreshToken()

  if (!refresh) return Promise.resolve(null)

  // axios "puro": passar pela instância com interceptors causaria recursão em caso de 401.
  inflight = axios
    .post(`${import.meta.env.VITE_API_URL}/token/refresh/`, { refresh })
    .then((response) => {
      setAccessToken(response.data.access)

      // Com ROTATE_REFRESH_TOKENS o servidor devolve também um refresh novo.
      if (response.data.refresh) setRefreshToken(response.data.refresh)

      return response.data.access
    })
    .catch((error) => {
      const status = error?.response?.status

      if (status === 400 || status === 401) clearSession()

      return null
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
