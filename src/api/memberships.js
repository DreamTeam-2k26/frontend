import api from './api'
import { loadProjectPages } from './projectPagination'
export const listMemberships = (project, { signal } = {}) =>
  loadProjectPages(async (page) => {
    const { data } = await api.get('/memberships/', {
      params: { project, page, page_size: 100 },
      signal,
    })
    return data
  })
export const changeMemberRole = (id, role) =>
  api.patch(`/memberships/${encodeURIComponent(id)}/`, { role })
export const removeMember = (id) => api.delete(`/memberships/${encodeURIComponent(id)}/`)
