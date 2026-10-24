// Chamadas de voz/vídeo dos projetos (a instância `api` já envia o JWT e renova o token).
import api from '@/api/api'
import { loadProjectPages } from '@/api/projectPagination'

const unwrap = (response) => response.data

/** Lista completa (todas as páginas). Filtros: { project, status }. */
export const listCalls = (params = {}) =>
  loadProjectPages((page) =>
    api.get('/calls/', { params: { ...params, page, page_size: 100 } }).then(unwrap),
  )

export const getCall = (id) => api.get(`/calls/${id}/`).then(unwrap)

/** Sem `scheduled_for` inicia na hora; com ele, agenda. */
export const createCall = ({ project, title = '', description = '', scheduled_for = null }) =>
  api.post('/calls/', { project, title, description, scheduled_for }).then(unwrap)

export const updateCall = (id, body) => api.patch(`/calls/${id}/`, body).then(unwrap)

export const startCall = (id) => api.post(`/calls/${id}/start/`).then(unwrap)

export const endCall = (id) => api.post(`/calls/${id}/end/`).then(unwrap)

export const removeCall = (id) => api.delete(`/calls/${id}/`)

export const listLiveCalls = () => api.get('/calls/live/').then(unwrap)
