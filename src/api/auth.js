import api from './api'

export function getAccesssToken({ email, password }) {
  return api.post('/token/', { email, password })
}

export function getRefreshToken({ refreshToken }) {
  return api.post('/token/refresh/', { refresh: refreshToken })
}

export function verifyToken({ accessToken }) {
  return api.post('/token/verify/', { token: accessToken })
}

export function register({ name, email, password }) {
  return api.post('/register/', { name, email, password })
}

export function getCurrentUser() {
  return api.get('/users/me/')
}

// Só o próprio usuário: o backend identifica quem edita pelo token, não por id.
export function updateCurrentUser({ name, profilePictureKey }) {
  return api.patch('/users/me/', {
    ...(name !== undefined && { name }),
    ...(profilePictureKey !== undefined && { profile_picture_attachment_key: profilePictureKey }),
  })
}

function requireSecureGoogleTransport() {
  const url = new URL(api.defaults.baseURL || '/', window.location.origin)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(import.meta.env.DEV && local)) {
    const error = new Error('A autenticação Google exige uma API HTTPS.')
    error.code = 'google_insecure_transport'
    throw error
  }
}

// O ID token permanece apenas no corpo da requisição; a sessão usa os JWTs do Fluxo.
export function loginGoogle(credential) {
  requireSecureGoogleTransport()
  return api.post('/auth/google/', { credential }, { timeout: 20000 })
}

export function linkGoogle(credential) {
  requireSecureGoogleTransport()
  return api.post('/auth/google/link/', { credential }, { timeout: 20000 })
}

export function getGoogleLink() {
  return api.get('/auth/google/link/', { timeout: 20000 })
}
