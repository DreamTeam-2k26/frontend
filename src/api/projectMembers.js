// Participantes e convites de um projeto (a instância `api` já envia o JWT e renova o token).
import api from './api'
import { loadProjectPages } from './projectPagination'

const unwrap = (response) => response.data

/** Busca pessoas por nome ou e-mail (mín. 2 letras). Com `projectId`, omite quem já participa ou foi convidado. */
export const searchPeople = (search, projectId = null, { signal } = {}) =>
  api
    .get('/chat/users/', {
      params: { search, ...(projectId ? { exclude_project: projectId } : {}) },
      signal,
    })
    .then(unwrap)

export const inviteUser = (projectId, userId, role = 'member') =>
  api
    .post('/invites/', { project: projectId, kind: 'direct', invited_user: userId, role })
    .then(unwrap)

export const listMembers = (projectId, { signal } = {}) =>
  loadProjectPages((page) =>
    api
      .get('/memberships/', { params: { project: projectId, page, page_size: 100 }, signal })
      .then(unwrap),
  )

export const setMemberRole = (membershipId, role) =>
  api.patch(`/memberships/${membershipId}/`, { role }).then(unwrap)

export const removeMember = (membershipId) => api.delete(`/memberships/${membershipId}/`)

/** Convites diretos ainda pendentes do projeto (só dono/administrador enxergam). */
export const listPendingInvites = (projectId, { signal } = {}) =>
  loadProjectPages((page) =>
    api
      .get('/invites/', {
        params: { project: projectId, status: 'pending', kind: 'direct', page, page_size: 100 },
        signal,
      })
      .then(unwrap),
  )

export const revokeInvite = (inviteId) => api.post(`/invites/${inviteId}/revoke/`).then(unwrap)

/** Convites que eu recebi e ainda não respondi. */
export const listReceivedInvites = () => api.get('/invites/received/').then(unwrap)

export const acceptInvite = (inviteId) => api.post(`/invites/${inviteId}/accept/`).then(unwrap)

export const declineInvite = (inviteId) => api.post(`/invites/${inviteId}/decline/`).then(unwrap)
